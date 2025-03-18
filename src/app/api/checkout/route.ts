import { stripe } from "@/lib/stripe/client";
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
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
        name: `${user.firstName} ${user.lastName}`.trim(),
        avatar_url: user.imageUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
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

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "チェックアウトの処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}