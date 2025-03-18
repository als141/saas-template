import { stripe } from "@/lib/stripe/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
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
        
        // テーブル作成は権限の問題がある可能性があるので、個別にSQLでこれらのテーブルを作成する必要があるかもしれません
        // Supabase SQLエディターでスキーマを直接実行することを推奨します
      } else {
        console.log('Successfully created database tables');
      }
    }
  } catch (error) {
    console.error('Error checking/creating database tables:', error);
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("Stripe-Signature") as string;

  // Supabaseクライアントを初期化
  const supabase = createServerSupabaseClient();
  
  // データベーステーブルが存在するか確認
  await ensureDatabaseTables(supabase);
  
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (error: any) {
    console.error(`Webhook signature verification failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    console.log(`Processing webhook event: ${event.type}`);
    const session = event.data.object as any;

    // 新しいサブスクリプションが作成された
    if (event.type === "checkout.session.completed") {
      if (!session.subscription) {
        console.log("No subscription in session");
        return NextResponse.json({ received: true });
      }

      // サブスクリプションのメタデータからユーザーIDを取得
      const userId = session.metadata.userId;
      const subscriptionId = session.subscription;
      const priceId = session.metadata.priceId;

      if (!userId) {
        console.error("No userId in session metadata");
        return NextResponse.json({ error: "No userId found" }, { status: 400 });
      }

      console.log(`Processing subscription ${subscriptionId} for user ${userId} with priceId ${priceId}`);

      // Stripeからサブスクリプションの詳細を取得
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      if (!subscription) {
        console.error(`Failed to retrieve subscription ${subscriptionId} from Stripe`);
        return NextResponse.json({ error: "Failed to retrieve subscription" }, { status: 500 });
      }
      
      // Stripeから価格情報を取得
      const price = await stripe.prices.retrieve(priceId);
      
      if (!price) {
        console.error(`Failed to retrieve price ${priceId} from Stripe`);
        return NextResponse.json({ error: "Failed to retrieve price" }, { status: 500 });
      }
      
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
        }
      }
      
      // ユーザーが存在するか確認し、存在しなければ作成
      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("clerk_id", userId)
        .single();
        
      if (!user) {
        console.log(`User ${userId} not found, creating...`);
        
        // ユーザー情報をClerkから取得（できれば）
        // ここではダミーデータで作成
        const { error: userError } = await supabase.from("users").insert({
          clerk_id: userId,
          email: `user-${userId}@example.com`,
          name: `User ${userId}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        
        if (userError) {
          console.error("Error creating user:", userError);
        }
      }
      
      // サブスクリプションの情報をデータベースに保存
      const subscriptionData = {
        id: subscription.id,
        user_id: userId,
        status: subscription.status,
        price_id: priceId,
        quantity: 1,
        cancel_at_period_end: subscription.cancel_at_period_end,
        created: new Date(subscription.created * 1000).toISOString(),
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
        cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        customer_id: subscription.customer as string,
      };
      
      // 既存のサブスクリプションを確認
      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("id", subscription.id)
        .single();
      
      let error;
      
      if (existingSub) {
        // 更新
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update(subscriptionData)
          .eq("id", subscription.id);
          
        error = updateError;
      } else {
        // 新規作成
        const { error: insertError } = await supabase
          .from("subscriptions")
          .insert(subscriptionData);
          
        error = insertError;
      }

      if (error) {
        console.error("Error saving subscription:", error);
        return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
      }
      
      console.log(`Successfully processed subscription ${subscription.id}`);
    }

    // サブスクリプションが更新された
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object;
      
      console.log(`Updating subscription ${subscription.id}`);
      
      // サブスクリプションの状態を更新
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
          cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
          canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
          customer_id: subscription.customer as string,
        })
        .eq("id", subscription.id);

      if (error) {
        console.error("Error updating subscription:", error);
        return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
      }
      
      console.log(`Successfully updated subscription ${subscription.id}`);
    }

    // サブスクリプションが削除された
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      
      console.log(`Canceling subscription ${subscription.id}`);
      
      // サブスクリプションをキャンセル状態に更新
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "canceled",
          cancel_at_period_end: false,
          ended_at: subscription.ended_at 
            ? new Date(subscription.ended_at * 1000).toISOString() 
            : new Date().toISOString(),
          canceled_at: new Date().toISOString(),
        })
        .eq("id", subscription.id);

      if (error) {
        console.error("Error canceling subscription:", error);
        return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
      }
      
      console.log(`Successfully canceled subscription ${subscription.id}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook: ${error}`);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}