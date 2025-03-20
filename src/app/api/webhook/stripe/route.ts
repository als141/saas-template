import { stripe } from "@/lib/stripe/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * ClerkのユーザーIDに紐づく SupabaseユーザーIDを取得または作成する関数
 * Webhook内でも同様に扱うことで、一貫して `subscriptions.user_id` がSupabase UUIDになる
 */
async function getOrCreateSupabaseUserByClerkId(supabase: any, clerkId: string) {
  console.log(`Webhook: Looking up Supabase user for Clerk ID: ${clerkId}`);
  
  // 既存ユーザーを検索
  const { data: existingUser, error: existingUserError } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", clerkId)
    .single();

  if (existingUserError) {
    console.error("Webhook: Supabaseユーザー検索エラー:", existingUserError);
  }

  if (!existingUser) {
    console.log(`Webhook: No user found for Clerk ID ${clerkId}, creating new user`);
    // ユーザーが存在しない場合は新規作成
    const { data: newUser, error: newUserError } = await supabase
      .from("users")
      .insert({
        clerk_id: clerkId,
        email: `user-${clerkId}@example.com`,
        name: `User ${clerkId}`,
      })
      .select("*")
      .single();

    if (newUserError) {
      console.error("Webhook: ユーザー作成エラー:", newUserError);
      return null;
    }
    
    console.log(`Webhook: Created new Supabase user: ${newUser.id}`);
    return newUser;
  }

  console.log(`Webhook: Found existing Supabase user: ${existingUser.id}`);
  return existingUser;
}

// データベーステーブルが存在するか確認し、なければ作成する関数
async function ensureDatabaseTables(supabase: any) {
  try {
    console.log("Webhook: Checking if database tables exist");
    
    // products, prices, subscriptionsテーブルが存在することを確認
    const { error: productsError } = await supabase
      .from('products')
      .select('id')
      .limit(1);
      
    if (productsError && productsError.code === '42P01') {
      console.log("Webhook: Creating products table");
      await supabase.query(`
        CREATE TABLE IF NOT EXISTS public.products (
          id TEXT PRIMARY KEY,
          active BOOLEAN DEFAULT TRUE,
          name TEXT NOT NULL,
          description TEXT,
          image TEXT,
          metadata JSONB
        );
      `);
    }
    
    const { error: pricesError } = await supabase
      .from('prices')
      .select('id')
      .limit(1);
      
    if (pricesError && pricesError.code === '42P01') {
      console.log("Webhook: Creating prices table");
      await supabase.query(`
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
      `);
    }
    
    const { error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select('id')
      .limit(1);
      
    if (subscriptionsError && subscriptionsError.code === '42P01') {
      console.log("Webhook: Creating subscriptions table");
      await supabase.query(`
        CREATE TABLE IF NOT EXISTS public.subscriptions (
          id TEXT PRIMARY KEY,
          user_id UUID NOT NULL,
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
        );
      `);
    }
  } catch (error) {
    console.error("Webhook: Error ensuring database tables:", error);
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("Stripe-Signature") as string;

  console.log("Webhook: Received Stripe webhook");

  if (!signature) {
    console.error("Webhook: No Stripe signature found");
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("Webhook: Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Missing webhook secret" }, { status: 500 });
  }

  const supabase = createServerSupabaseClient();
  await ensureDatabaseTables(supabase);

  let event;
  try {
    console.log("Webhook: Constructing event");
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error: any) {
    console.error(`Webhook: Signature verification failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    console.log(`Webhook: Processing event: ${event.type}`);
    const session = event.data.object as any;

    // checkout.session.completed
    if (event.type === "checkout.session.completed") {
      console.log("Webhook: Processing checkout.session.completed event");
      
      if (!session.subscription) {
        console.log("Webhook: No subscription in session");
        return NextResponse.json({ received: true });
      }

      // ClerkのユーザーIDをメタデータから取り出す
      const clerkUserId = session.metadata?.userId;
      const subscriptionId = session.subscription;
      const priceId = session.metadata?.priceId;

      if (!clerkUserId) {
        console.error("Webhook: No userId in session metadata");
        return NextResponse.json({ error: "No userId found" }, { status: 400 });
      }

      console.log(`Webhook: Processing subscription ${subscriptionId} for clerkUserId: ${clerkUserId} with priceId ${priceId}`);

      // Stripeからサブスクリプション情報取得
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (!subscription) {
        console.error(`Webhook: Failed to retrieve subscription ${subscriptionId} from Stripe`);
        return NextResponse.json({ error: "Failed to retrieve subscription" }, { status: 500 });
      }

      // 価格もチェック
      const price = await stripe.prices.retrieve(priceId);
      if (!price) {
        console.error(`Webhook: Failed to retrieve price ${priceId} from Stripe`);
        return NextResponse.json({ error: "Failed to retrieve price" }, { status: 500 });
      }

      // Supabaseに価格が無ければ作成
      const { data: existingPrice, error: priceCheckError } = await supabase
        .from("prices")
        .select("*")
        .eq("id", priceId)
        .single();

      if (priceCheckError && priceCheckError.code !== "PGRST116") {
        console.error("Webhook: Error checking price:", priceCheckError);
      }

      if (!existingPrice) {
        console.log(`Webhook: Price ${priceId} not found, creating it`);
        
        // 製品が存在しなければ作成
        const { data: existingProduct, error: productCheckError } = await supabase
          .from("products")
          .select("*")
          .eq("id", price.product)
          .single();

        if (productCheckError && productCheckError.code !== "PGRST116") {
          console.error("Webhook: Error checking product:", productCheckError);
        }

        if (!existingProduct) {
          console.log(`Webhook: Product ${price.product} not found, creating it`);
          const product = await stripe.products.retrieve(price.product as string);
          const { error: productInsertError } = await supabase
            .from("products")
            .insert({
              id: product.id,
              name: product.name,
              description: product.description,
              active: product.active,
              metadata: product.metadata,
            });
            
          if (productInsertError) {
            console.error("Webhook: Error creating product:", productInsertError);
          } else {
            console.log(`Webhook: Product created: ${product.id}`);
          }
        }

        const { error: priceInsertError } = await supabase
          .from("prices")
          .insert({
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
          
        if (priceInsertError) {
          console.error("Webhook: Error creating price:", priceInsertError);
        } else {
          console.log(`Webhook: Price created: ${price.id}`);
        }
      }

      // ClerkユーザーID に該当する Supabaseユーザー (UUID) を取得または作成
      const supabaseUser = await getOrCreateSupabaseUserByClerkId(supabase, clerkUserId);
      if (!supabaseUser) {
        console.error("Webhook: Failed to get or create Supabase user");
        return NextResponse.json({ error: "ユーザー作成に失敗" }, { status: 500 });
      }

      // サブスクリプションをDBに保存
      const subscriptionData = {
        id: subscription.id,
        user_id: supabaseUser.id, // ← Clerk ID ではなくSupabaseのUUID
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

      console.log("Webhook: Saving subscription data:", JSON.stringify(subscriptionData, null, 2));

      // 既存のサブスクリプションがあれば更新、なければ作成
      const { data: existingSub, error: subCheckError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("id", subscription.id)
        .single();

      if (subCheckError && subCheckError.code !== "PGRST116") {
        console.error("Webhook: Error checking subscription:", subCheckError);
      }

      let dbError;
      if (existingSub) {
        console.log(`Webhook: Updating existing subscription: ${subscription.id}`);
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update(subscriptionData)
          .eq("id", subscription.id);
        dbError = updateError;
      } else {
        console.log(`Webhook: Creating new subscription: ${subscription.id}`);
        const { error: insertError } = await supabase
          .from("subscriptions")
          .insert(subscriptionData);
        dbError = insertError;
      }

      if (dbError) {
        console.error("Webhook: Error saving subscription:", dbError);
        return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
      }

      console.log(`Webhook: Successfully processed subscription ${subscription.id}`);
    }

    // サブスクリプション更新
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object;
      console.log(`Webhook: Updating subscription ${subscription.id}`);

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
        console.error("Webhook: Error updating subscription:", error);
        return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
      }

      console.log(`Webhook: Successfully updated subscription ${subscription.id}`);
    }

    // サブスクリプション削除
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      console.log(`Webhook: Canceling subscription ${subscription.id}`);

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
        console.error("Webhook: Error canceling subscription:", error);
        return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
      }

      console.log(`Webhook: Successfully canceled subscription ${subscription.id}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Webhook: Error processing webhook: ${error}`);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}