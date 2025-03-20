import { stripe } from "@/lib/stripe/client";
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * ClerkのユーザーIDに対応する Supabaseユーザー を取得または作成し、
 * そのユーザーのレコードを返すユーティリティ関数
 */
async function getOrCreateSupabaseUser(supabase: any, clerkUser: any) {
  console.log(`Checkout: Looking up Supabase user for Clerk ID: ${clerkUser.id}`);
  
  // ClerkのuserIdを使ってSupabaseのユーザーを検索
  const { data: existingUser, error: existingUserError } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", clerkUser.id)
    .single();

  if (existingUserError) {
    console.error("Checkout: Supabaseユーザー検索エラー:", existingUserError);
  }
  
  if (!existingUser) {
    console.log(`Checkout: Creating new Supabase user for Clerk ID: ${clerkUser.id}`);
    // 見つからない場合は新しく作成
    const { data: newUser, error: newUserError } = await supabase
      .from("users")
      .insert({
        clerk_id: clerkUser.id,
        email: clerkUser.emailAddresses[0].emailAddress,
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
        avatar_url: clerkUser.imageUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (newUserError) {
      console.error("Checkout: Supabaseユーザー作成エラー:", newUserError);
      throw new Error("ユーザー作成に失敗しました");
    }

    console.log(`Checkout: Created new Supabase user: ${newUser.id}`);
    return newUser;
  } else {
    console.log(`Checkout: Found existing Supabase user: ${existingUser.id}`);
    return existingUser;
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await auth();
    const clerkUserId = authResult.userId;
    const clerkUser = await currentUser();

    if (!clerkUserId || !clerkUser) {
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

    // Supabaseのユーザーを取得または作成
    const supabaseUser = await getOrCreateSupabaseUser(supabase, clerkUser);

    // Stripeから価格情報を取得（価格が存在しない場合は作成するロジック）
    try {
      const price = await stripe.prices.retrieve(priceId);
      console.log(`Retrieved price from Stripe: ${priceId}`, price);
      
      // 価格情報がSupabaseにあるか確認
      const { data: existingPrice, error: priceError } = await supabase
        .from("prices")
        .select("*")
        .eq("id", priceId)
        .single();
      
      if (priceError && priceError.code !== 'PGRST116') {
        console.error("Price lookup error:", priceError);
      }
        
      if (!existingPrice) {
        // 製品が存在するか確認
        const { data: existingProduct, error: productError } = await supabase
          .from("products")
          .select("*")
          .eq("id", price.product)
          .single();
        
        if (productError && productError.code !== 'PGRST116') {
          console.error("Product lookup error:", productError);
        }
          
        if (!existingProduct) {
          // Stripeから製品情報を取得して作成
          const product = await stripe.products.retrieve(price.product as string);
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
      return NextResponse.json(
        { error: "Stripeの価格情報の取得に失敗しました" },
        { status: 500 }
      );
    }

    // 同じpriceIdのサブスクリプションが既にactiveかどうか確認（ユーザーIDはSupabaseのUUID）
    const { data: existingSubscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", supabaseUser.id)
      .eq("price_id", priceId)
      .eq("status", "active")
      .maybeSingle();

    if (subError && subError.code !== 'PGRST116') {
      console.error("Subscription check error:", subError);
    }

    if (existingSubscription) {
      return NextResponse.json(
        { error: "すでに有効なサブスクリプションがあります" },
        { status: 400 }
      );
    }

    console.log(`Creating checkout session for user (SupabaseID): ${supabaseUser.id} and price ${priceId}`);

    // Stripeのセッションを作成
    const session = await stripe.checkout.sessions.create({
      customer_email: clerkUser.emailAddresses[0].emailAddress,
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
        // ClerkのIDをmetadataに入れて、webhookでSupabaseのユーザーIDに変換
        userId: clerkUser.id,
        priceId,
        // Supabase UUIDもここに入れておくとさらに安全
        supabaseUserId: supabaseUser.id
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