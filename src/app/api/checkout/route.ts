import { stripe } from "@/lib/stripe/client";
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// データベーステーブルが存在するか確認し、なければ作成する関数
async function ensureDatabaseTables(supabase: any) {
  try {
    // usersテーブルの存在を確認
    const { error: usersCheckError } = await supabase.from('users').select('id').limit(1);
    
    if (usersCheckError && usersCheckError.code === '42P01') {
      console.log('Users table does not exist, creating required tables...');
      
      // データベーススキーマをセットアップ
      const schema = `
        -- 拡張機能のインストール (UUIDを扱うため)
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        
        -- ユーザーテーブル
        CREATE TABLE IF NOT EXISTS public.users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          clerk_id TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          avatar_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          billing_address JSONB,
          payment_method JSONB,
          notification_preferences JSONB DEFAULT '{"marketingEmails": false, "securityEmails": true, "serviceUpdates": true, "billingAlerts": true}'
        );
        
        -- 製品テーブル
        CREATE TABLE IF NOT EXISTS public.products (
          id TEXT PRIMARY KEY,
          active BOOLEAN DEFAULT TRUE,
          name TEXT NOT NULL,
          description TEXT,
          image TEXT,
          metadata JSONB
        );
        
        -- 料金テーブル
        CREATE TABLE IF NOT EXISTS public.prices (
          id TEXT PRIMARY KEY,
          product_id TEXT REFERENCES public.products(id),
          active BOOLEAN DEFAULT TRUE,
          description TEXT,
          unit_amount BIGINT,
          currency TEXT,
          type TEXT,
          interval TEXT,
          interval_count INTEGER,
          trial_period_days INTEGER,
          metadata JSONB
        );
        
        -- サブスクリプションテーブル
        CREATE TABLE IF NOT EXISTS public.subscriptions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          status TEXT NOT NULL,
          price_id TEXT NOT NULL,
          quantity INTEGER DEFAULT 1,
          cancel_at_period_end BOOLEAN DEFAULT FALSE,
          created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          current_period_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          current_period_end TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          ended_at TIMESTAMP WITH TIME ZONE,
          cancel_at TIMESTAMP WITH TIME ZONE,
          canceled_at TIMESTAMP WITH TIME ZONE,
          trial_start TIMESTAMP WITH TIME ZONE,
          trial_end TIMESTAMP WITH TIME ZONE,
          metadata JSONB,
          customer_id TEXT
        );`;
        
      // SQLを実行
      const { error: createError } = await supabase.rpc('pgcrypto_eq', { sql: schema });
      
      if (createError) {
        console.error('Error creating database tables:', createError);
      } else {
        console.log('Successfully created database tables');
      }
    }
  } catch (error) {
    console.error('Error checking/creating database tables:', error);
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await auth();
    const userId = authResult.userId;
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const { priceId } = await req.json();

    if (!priceId) {
      return NextResponse.json(
        { error: "料金IDが必要です" },
        { status: 400 }
      );
    }

    // サーバーサイドでSupabaseクライアントを作成
    const supabase = createServerSupabaseClient();
    
    // データベーステーブルが存在するか確認
    await ensureDatabaseTables(supabase);

    // Stripeから価格情報を取得
    try {
      const price = await stripe.prices.retrieve(priceId);
      console.log(`Retrieved price from Stripe: ${priceId}`, price);
      
      // 価格情報が存在しなければ作成
      const { data: existingPrice } = await supabase
        .from("prices")
        .select("*")
        .eq("id", priceId)
        .single();
        
      if (!existingPrice) {
        // 製品が存在するか確認
        const { data: existingProduct } = await supabase
          .from("products")
          .select("*")
          .eq("id", price.product)
          .single();
          
        if (!existingProduct) {
          // 製品情報を取得
          const product = await stripe.products.retrieve(price.product as string);
          
          // 製品を作成
          const { error: productError } = await supabase.from("products").insert({
            id: product.id,
            name: product.name,
            description: product.description,
            active: product.active,
            metadata: product.metadata,
          });
          
          if (productError) {
            console.error("Error creating product:", productError);
          } else {
            console.log(`Product created: ${product.id}`);
          }
        }
        
        // 価格を作成
        const { error: priceError } = await supabase.from("prices").insert({
          id: price.id,
          product_id: price.product,
          active: price.active,
          unit_amount: price.unit_amount,
          currency: price.currency,
          description: price.nickname,
          type: price.type,
          interval: price.type === "recurring" ? price.recurring?.interval : null,
          interval_count: price.type === "recurring" ? price.recurring?.interval_count : null,
          metadata: price.metadata,
        });
        
        if (priceError) {
          console.error("Error creating price:", priceError);
        } else {
          console.log(`Price created: ${price.id}`);
        }
      }
    } catch (error) {
      console.error("Failed to retrieve or store price information:", error);
    }

    // すでにユーザーがSupabase上に存在するか確認し、存在しなければ作成する
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("clerk_id", userId)
      .single();

    if (!existingUser) {
      await supabase.from("users").insert({
        clerk_id: userId,
        email: user.emailAddresses[0].emailAddress,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        avatar_url: user.imageUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
      console.log(`User created: ${userId}`);
    }

    // すでに同じpriceIdのサブスクリプションがあるか確認
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("price_id", priceId)
      .eq("status", "active")
      .single();

    if (existingSubscription) {
      return NextResponse.json(
        { error: "すでに有効なサブスクリプションがあります" },
        { status: 400 }
      );
    }

    console.log(`Creating checkout session for user ${userId} and price ${priceId}`);

    // Stripeのセッションを作成
    const session = await stripe.checkout.sessions.create({
      customer_email: user.emailAddresses[0].emailAddress,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing?canceled=true`,
      metadata: {
        userId,
        priceId,
      },
    });

    console.log(`Created checkout session: ${session.id}`);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "チェックアウトの処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}