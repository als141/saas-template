import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
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

    // サーバーサイドでSupabaseクライアントを作成
    const supabase = createServerSupabaseClient();

    // サブスクリプション情報を取得
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (subscriptionError) {
      console.error("Subscription query error:", subscriptionError);
    }

    if (!subscriptionData) {
      return NextResponse.json(
        { error: "有効なサブスクリプションが見つかりません" },
        { status: 404 }
      );
    }

    console.log(`Creating portal session for subscription: ${subscriptionData.id}`);
    console.log(`Customer ID: ${subscriptionData.customer_id}`);

    // URLのクエリパラメータを解析
    const url = new URL(req.url);
    const redirectTo = url.searchParams.get("redirect");

    // customer_idが存在することを確認
    if (!subscriptionData.customer_id) {
      console.error("No customer_id found in subscription data");
      return NextResponse.json(
        { error: "顧客情報が見つかりません" },
        { status: 404 }
      );
    }

    // Stripe顧客ポータルを作成
    const session = await stripe.billingPortal.sessions.create({
      customer: subscriptionData.customer_id,
      return_url: redirectTo === "cancel"
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing?canceled=true`
        : `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing`,
    });

    console.log(`Created portal session: ${session.id}`);

    // ポータルURLにリダイレクト
    return NextResponse.redirect(session.url);
  } catch (error) {
    console.error("Stripe顧客ポータルエラー:", error);
    return NextResponse.json(
      { error: "顧客ポータルの作成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}