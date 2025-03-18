import { stripe } from "@/lib/stripe/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * ClerkのユーザーIDに紐づく SupabaseユーザーIDを取得または作成する関数
 * Webhook内でも同様に扱うことで、一貫して `subscriptions.user_id` がSupabase UUIDになる
 */
async function getOrCreateSupabaseUserByClerkId(supabase: any, clerkId: string) {
  // 既存ユーザーを検索
  const { data: existingUser, error: existingUserError } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", clerkId)
    .single();

  if (existingUserError) {
    console.error("Supabaseユーザー検索エラー:", existingUserError);
  }

  if (!existingUser) {
    // 見つからない場合はダミーのメール等で作成
    // (Webhook時点でClerkの詳細なプロフィール取得が難しいケースもあるので要注意)
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
      console.error("ユーザー作成エラー:", newUserError);
      return null;
    }
    return newUser;
  }

  return existingUser;
}

// データベーステーブルが存在するか確認し、なければ作成する関数（省略可）
async function ensureDatabaseTables(supabase: any) {
  // 略: ここは既存のロジックをそのまま活かす
  // (ユーザー環境によって不要な場合もある)
}

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("Stripe-Signature") as string;

  const supabase = createServerSupabaseClient();
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

    // checkout.session.completed
    if (event.type === "checkout.session.completed") {
      if (!session.subscription) {
        console.log("No subscription in session");
        return NextResponse.json({ received: true });
      }

      // ClerkのユーザーIDをメタデータから取り出す
      const clerkUserId = session.metadata?.userId;
      const subscriptionId = session.subscription;
      const priceId = session.metadata?.priceId;

      if (!clerkUserId) {
        console.error("No userId in session metadata");
        return NextResponse.json({ error: "No userId found" }, { status: 400 });
      }

      console.log(`Processing subscription ${subscriptionId} for clerkUserId: ${clerkUserId} with priceId ${priceId}`);

      // Stripeからサブスクリプション情報取得
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (!subscription) {
        console.error(`Failed to retrieve subscription ${subscriptionId} from Stripe`);
        return NextResponse.json({ error: "Failed to retrieve subscription" }, { status: 500 });
      }

      // 価格もチェック
      const price = await stripe.prices.retrieve(priceId);
      if (!price) {
        console.error(`Failed to retrieve price ${priceId} from Stripe`);
        return NextResponse.json({ error: "Failed to retrieve price" }, { status: 500 });
      }

      // Supabaseに価格が無ければ作成
      const { data: existingPrice } = await supabase
        .from("prices")
        .select("*")
        .eq("id", priceId)
        .single();

      if (!existingPrice) {
        // 製品が存在しなければ作成
        const { data: existingProduct } = await supabase
          .from("products")
          .select("*")
          .eq("id", price.product)
          .single();

        if (!existingProduct) {
          const product = await stripe.products.retrieve(price.product as string);
          await supabase.from("products").insert({
            id: product.id,
            name: product.name,
            description: product.description,
            active: product.active,
            metadata: product.metadata,
          });
        }

        await supabase.from("prices").insert({
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
      }

      // ClerkユーザーID に該当する Supabaseユーザー (UUID) を取得または作成
      const supabaseUser = await getOrCreateSupabaseUserByClerkId(supabase, clerkUserId);
      if (!supabaseUser) {
        console.error("Supabaseユーザー取得/作成に失敗しました");
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

      // 既存のサブスクリプションがあれば更新、なければ作成
      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("id", subscription.id)
        .single();

      let dbError;
      if (existingSub) {
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update(subscriptionData)
          .eq("id", subscription.id);
        dbError = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("subscriptions")
          .insert(subscriptionData);
        dbError = insertError;
      }

      if (dbError) {
        console.error("Error saving subscription:", dbError);
        return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
      }

      console.log(`Successfully processed subscription ${subscription.id}`);
    }

    // サブスクリプション更新
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object;
      console.log(`Updating subscription ${subscription.id}`);

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

    // サブスクリプション削除
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      console.log(`Canceling subscription ${subscription.id}`);

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
