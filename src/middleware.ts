import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// プレミアム機能へのアクセスに必要なページのパス
const PREMIUM_PATHS = [
  "/dashboard/premium-feature",
  "/dashboard/analytics",
  "/dashboard/export",
];

// 正しい方法でサブスクリプションを確認する
async function hasActiveSubscription(clerkUserId: string) {
  try {
    const supabase = createServerSupabaseClient();
    
    // まず、Clerk IDからSupabaseのユーザーIDを取得
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .single();
    
    if (userError || !userData) {
      console.error("User query error:", userError);
      return false;
    }
    
    // 次に、SupabaseユーザーIDを使用してサブスクリプションを確認
    const { data: subscriptionData } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userData.id)
      .eq("status", "active")
      .single();
    
    return !!subscriptionData;
  } catch (error) {
    console.error("Subscription check error:", error);
    return false;
  }
}

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // 未認証ユーザーがプロテクトされたルートにアクセスしようとした場合
  const { userId, sessionClaims } = await auth();
  if (!userId && !isPublicRoute(req)) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  // プレミアム機能へのアクセスを確認
  if (userId && PREMIUM_PATHS.some(path => req.nextUrl.pathname.startsWith(path))) {
    const isPremium = await hasActiveSubscription(userId);

    if (!isPremium) {
      // サブスクリプションがない場合は料金ページにリダイレクト
      const pricingUrl = new URL("/pricing", req.url);
      pricingUrl.searchParams.set("notice", "premium_required");
      return NextResponse.redirect(pricingUrl);
    }
  }

  return NextResponse.next();
});

// 認証が不要な公開ルート
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/pricing',
  '/features',
  '/blog(.*)',
  '/api/webhooks/stripe',
  '/api/webhooks/clerk',
  '/terms',
  '/privacy',
  '/contact',
]);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};