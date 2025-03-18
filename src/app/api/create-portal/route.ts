import { auth, currentUser } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { supabase } from "@/lib/supabase/client";

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    // サブスクリプション情報を取得
    const { data: subscriptionData } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (!subscriptionData) {
      return NextResponse.json(
        { error: "有効なサブスクリプションが見つかりません" },
        { status: 404 }
      );
    }

    // URLのクエリパラメータを解析
    const url = new URL(req.url);
    const redirectTo = url.searchParams.get("redirect");

    // Stripe顧客ポータルを作成
    const session = await stripe.billingPortal.sessions.create({
      customer: subscriptionData.customer_id || subscriptionData.id,
      return_url: redirectTo === "cancel"
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing?canceled=true`
        : `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing`,
    });

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