import { stripe } from "@/lib/stripe/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * ClerkのユーザーIDに紐づく SupabaseユーザーIDを取得または作成する関数
 * これにより、ユーザーが常に1行だけサブスクリプションを持つ運用が可能になる
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

// DBのテーブルが存在するかチェックする関数（既に書かれている場合はそのままでも可）
async function ensureDatabaseTables(supabase: any) {
  try {
    console.log("Webhook: Checking if database tables exist");
    // products, prices, subscriptions テーブルの存在確認など
    // （中略、必要に応じて既存のロジックはそのままでもOK）
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

    //
    // ====================
    // checkout.session.completed
    // ====================
    //
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

      console.log(
        `Webhook: Processing subscription ${subscriptionId} for clerkUserId: ${clerkUserId} with priceId ${priceId}`
      );

      // Stripeからサブスクリプション情報を取得
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (!subscription) {
        console.error(`Webhook: Failed to retrieve subscription ${subscriptionId} from Stripe`);
        return NextResponse.json({ error: "Failed to retrieve subscription" }, { status: 500 });
      }

      // ClerkユーザーID に該当する Supabaseユーザー (UUID) を取得または作成
      const supabaseUser = await getOrCreateSupabaseUserByClerkId(supabase, clerkUserId);
      if (!supabaseUser) {
        console.error("Webhook: Failed to get or create Supabase user");
        return NextResponse.json({ error: "ユーザー作成に失敗" }, { status: 500 });
      }

      // 「このユーザーはサブスクリプションを1つだけ持つ」仕様。
      // 既存のレコードを探し、あれば UPDATE、なければ INSERT
      const { data: existingSub, error: subCheckError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", supabaseUser.id)
        .maybeSingle();

      if (subCheckError) {
        console.error("Webhook: Error checking subscription:", subCheckError);
      }

      // 更新用のデータオブジェクト
      const subscriptionData = {
        // Stripeのsubscription.idをDBのidにしてもよいが、「userは1行だけ」のため user_id が一意になる
        id: subscription.id, // DBのPRIMARY KEYにする場合
        user_id: supabaseUser.id,
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

      if (existingSub) {
        // 既存レコードがある => 上書き更新
        console.log(`Webhook: Updating existing single subscription for user_id: ${supabaseUser.id}`);
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update(subscriptionData)
          .eq("user_id", supabaseUser.id);

        if (updateError) {
          console.error("Webhook: Error updating single subscription:", updateError);
          return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
        }
      } else {
        // レコードがない => 新規挿入
        console.log(`Webhook: Creating new subscription for user_id: ${supabaseUser.id}`);
        const { error: insertError } = await supabase
          .from("subscriptions")
          .insert(subscriptionData);

        if (insertError) {
          console.error("Webhook: Error creating new subscription:", insertError);
          return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
        }
      }

      console.log(`Webhook: Successfully processed subscription ${subscription.id}`);
    }

    //
    // ====================
    // customer.subscription.updated
    // ====================
    //
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as any;
      console.log(`Webhook: Updating subscription ${subscription.id}`);

      // userを判定するにはcustomer情報から紐づける必要もあるが
      // ここでは "id" (StripeサブスクID) で検索する例を示す
      // (または user_id で紐づけても構いません)
      // 今回は「ユーザー1つだけ」運用のため subscription.id で更新
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

    //
    // ====================
    // customer.subscription.created
    // ====================
    //
    if (event.type === "customer.subscription.created") {
      const subscription = event.data.object as any;
      console.log(`Webhook: Customer subscription created: ${subscription.id}`);

      // ここでは checkout.session.completed 側でも insert/update 処理しているため、
      // 重複して新規作成しないように注意。すでに行がある場合は update だけする
      const { data: existingRec, error: findError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("id", subscription.id)
        .maybeSingle();

      if (findError) {
        console.error("Webhook: Error checking subscription:", findError);
      }

      if (existingRec) {
        // 既存 => update
        const { error: updateError } = await supabase
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

        if (updateError) {
          console.error("Webhook: Error updating subscription:", updateError);
          return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
        }
        console.log(`Webhook: Updated existing subscription for ${subscription.id}`);
      } else {
        // ない場合 => 新規
        // ただし user_id を取り出すには Clerk との紐づけが必要なので
        // このイベントだけでは user_id が無い場合があり得る。必要なら後で追記
        console.log(`Webhook: Sub created, but no session link. Potentially skip or partial insert.`);
      }
    }

    //
    // ====================
    // customer.subscription.deleted
    // ====================
    //
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as any;
      console.log(`Webhook: Canceling subscription ${subscription.id}`);

      // user_id は不要。id で特定して 1 行のみキャンセル
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
