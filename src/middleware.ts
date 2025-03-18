import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase/client";

// プレミアム機能へのアクセスに必要なページのパス
const PREMIUM_PATHS = [
  "/dashboard/premium-feature",
  "/dashboard/analytics",
  "/dashboard/export",
];

async function hasActiveSubscription(userId: string) {
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  return !!data;
}

export default authMiddleware({
  publicRoutes: [
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/pricing",
    "/features",
    "/blog(.*)",
    "/api/webhooks/stripe",
    "/api/webhooks/clerk",
    "/terms",
    "/privacy",
    "/contact",
  ],
  async afterAuth(auth, req) {
    // 未認証ユーザーがプロテクトされたルートにアクセスしようとした場合
    if (!auth.userId && !auth.isPublicRoute) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }

    // プレミアム機能へのアクセスを確認
    if (auth.userId && PREMIUM_PATHS.some(path => req.nextUrl.pathname.startsWith(path))) {
      const isPremium = await hasActiveSubscription(auth.userId);

      if (!isPremium) {
        // サブスクリプションがない場合は料金ページにリダイレクト
        const pricingUrl = new URL("/pricing", req.url);
        pricingUrl.searchParams.set("notice", "premium_required");
        return NextResponse.redirect(pricingUrl);
      }
    }

    return NextResponse.next();
  },
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};