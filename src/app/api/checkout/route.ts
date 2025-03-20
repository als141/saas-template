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

    // すでにアクティブなサブスクリプションがあるかどうかチェック
    const { data: existingSubscription, error: subCheckError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", supabaseUser.id)
      .eq("status", "active")
      .maybeSingle();

    if (subCheckError) {
      console.error("Checkout: Subscription check error:", subCheckError);
      return NextResponse.json(
        { error: "サブスクリプション状況の確認に失敗しました" },
        { status: 500 }
      );
    }

    // もし既にアクティブなサブスクリプションが存在するなら、
    // ここで新規契約しないようにして顧客ポータルなどに誘導
    if (existingSubscription) {
      console.log("Checkout: User already has an active subscription. Redirect to portal or return an error.");
      return NextResponse.json(
        {
          error: "すでにサブスクリプションがあります。プラン変更は顧客ポータルから行ってください。",
          portalUrl: "/api/create-portal" // ここでポータルのエンドポイントを返すなど
        },
        { status: 400 }
      );
    }

    // ここから先はサブスクリプションを持っていない場合のみ実行（新規契約）

    // Stripeから価格情報を取得
    let price;
    try {
      price = await stripe.prices.retrieve(priceId);
      console.log(`Retrieved price from Stripe: ${priceId}`, price);
    } catch (error) {
      console.error("Failed to retrieve price:", error);
      return NextResponse.json(
        { error: "Stripeの価格情報の取得に失敗しました" },
        { status: 500 }
      );
    }

    // Supabase内の prices / products テーブルも同期（初回のみ）
    // ここでは例として必要があれば登録しておく
    // -------------------------------------------------------------------
    // 同期用に価格・商品が既に登録済みか確認
    const { data: existingPrice } = await supabase
      .from("prices")
      .select("*")
      .eq("id", price.id)
      .maybeSingle();
    
    if (!existingPrice) {
      // 商品側チェック
      const productId = typeof price.product === "string" ? price.product : price.product?.id;
      if (productId) {
        const { data: existingProduct } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .maybeSingle();
        
        // Productが無ければStripeから取得して登録
        if (!existingProduct) {
          const stripeProduct = await stripe.products.retrieve(productId);
          await supabase.from("products").insert({
            id: stripeProduct.id,
            name: stripeProduct.name,
            description: stripeProduct.description,
            active: stripeProduct.active,
            metadata: stripeProduct.metadata,
          });
          console.log(`Product created in DB: ${stripeProduct.id}`);
        }
      }

      // Priceを登録
      await supabase.from("prices").insert({
        id: price.id,
        product_id: typeof price.product === "string" ? price.product : price.product?.id,
        active: price.active,
        unit_amount: price.unit_amount,
        currency: price.currency,
        description: price.nickname,
        type: price.type,
        interval: price.type === "recurring" ? price.recurring?.interval : null,
        interval_count: price.type === "recurring" ? price.recurring?.interval_count : null,
        metadata: price.metadata,
      });
      console.log(`Price created in DB: ${price.id}`);
    }

    console.log(`Creating checkout session for user (SupabaseID): ${supabaseUser.id} and price ${priceId}`);

    // Stripeのセッション（Checkout）を作成
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
