import { stripe } from "@/lib/stripe/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("Stripe-Signature") as string;

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

  const session = event.data.object as any;

  // 新しいサブスクリプションが作成された
  if (event.type === "checkout.session.completed") {
    // サブスクリプションのメタデータからユーザーIDを取得
    const userId = session.metadata.userId;
    const subscriptionId = session.subscription;

    // Stripeからサブスクリプションの詳細を取得
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // サブスクリプションの情報をデータベースに保存
    await supabase.from("subscriptions").insert({
      id: subscription.id,
      user_id: userId,
      status: subscription.status,
      price_id: session.metadata.priceId,
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
    });
  }

  // サブスクリプションが更新された
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object;
    
    // サブスクリプションの状態を更新
    await supabase
      .from("subscriptions")
      .update({
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
        cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      })
      .eq("id", subscription.id);
  }

  // サブスクリプションが削除された
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    
    // サブスクリプションをキャンセル状態に更新 - ended_atがnullの可能性を考慮
    await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        cancel_at_period_end: false,
        ended_at: subscription.ended_at 
          ? new Date(subscription.ended_at * 1000).toISOString() 
          : new Date().toISOString(), // nullの場合は現在の日時を使用
        canceled_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);
  }

  return NextResponse.json({ received: true });
}