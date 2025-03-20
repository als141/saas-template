import { redirect } from "next/navigation";
import { DashboardHeader } from "@/app/dashboard/dashboard-header";
import { DashboardShell } from "@/app/dashboard/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { currentUser } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, CreditCard, Settings, HelpCircle, Star } from "lucide-react";

/**
 * SupabaseユーザーIDを取得する（なければ作成する）
 */
async function getOrCreateSupabaseUser(supabase: any, clerkUser: any) {
  // Clerk IDからSupabaseユーザーを検索
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", clerkUser.id)
    .single();

  if (userError) {
    console.log("User query error:", userError);
    
    // ユーザーが存在しない場合は新規作成
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({
        clerk_id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || `user-${clerkUser.id}@example.com`,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || `User ${clerkUser.id}`,
        avatar_url: clerkUser.imageUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (createError) {
      console.error("Failed to create Supabase user:", createError);
      return null;
    }
    
    console.log("Created new Supabase user:", newUser);
    return newUser;
  }

  return userData;
}

// 価格表示用のヘルパー関数
function displayPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "無料";
  return formatPrice(amount);
}

export default async function DashboardPage() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect("/sign-in");
  }

  // サーバーサイドでSupabaseクライアントを作成
  const supabase = createServerSupabaseClient();

  // Clerk ID から Supabaseユーザーを取得または作成
  const supabaseUser = await getOrCreateSupabaseUser(supabase, clerkUser);
  
  // サブスクリプションを取得 (SupabaseユーザーIDがある場合に限る)
  let subscriptionData: any = null;
  let subscriptionError: any = null;
  let isPremium = false;

  if (supabaseUser) {
    console.log(`Fetching subscription for Supabase user ID: ${supabaseUser.id}`);
    
    // まずデバッグのために全てのサブスクリプションを取得
    const { data: allSubs, error: debugError } = await supabase
      .from("subscriptions")
      .select("*");
        
    if (debugError) {
      console.error("Debug subscription query error:", debugError);
    } else {
      console.log(`Found ${allSubs.length} total subscriptions in database`);
    }
    
    // このユーザーのアクティブなサブスクリプションを最新順で1件だけ取得
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*, prices(*)")
      .eq("user_id", supabaseUser.id)
      .eq("status", "active")
      .order("created", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error("Subscription query error:", error);
      subscriptionError = error;
    } else {
      console.log("Subscription data found:", data ? "Yes" : "No");
      subscriptionData = data;
      isPremium = !!subscriptionData;
    }
  }

  // 成功パラメータがある場合（サブスクリプション購入後など）
  let success = false;
  try {
    const searchParams = new URL(globalThis.location?.href || "http://localhost").searchParams;
    success = searchParams.get("success") === "true";
  } catch (e) {
    // ignore
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="ダッシュボード"
        text={`こんにちは、${clerkUser.firstName || "ようこそ"}! アカウントの概要です。`}
      >
        {isPremium ? (
          <Button asChild>
            <Link href="/dashboard/premium-feature">
              プレミアム機能を見る
            </Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href="/pricing">
              アップグレード
            </Link>
          </Button>
        )}
      </DashboardHeader>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 mb-6">
          <p className="font-medium">サブスクリプションが正常に処理されました！</p>
          <p className="text-sm">新しいプランでご利用いただけます。ありがとうございます。</p>
        </div>
      )}

      {subscriptionError && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 mb-6">
          <p className="font-medium">サブスクリプション情報の取得中にエラーが発生しました</p>
          <p className="text-sm">データベースのセットアップを確認してください: {subscriptionError.message}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              サブスクリプション
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isPremium ? subscriptionData.prices?.description || "有料プラン" : "無料プラン"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isPremium 
                ? `${displayPrice(subscriptionData.prices?.unit_amount)} / ${subscriptionData.prices?.interval === "month" ? "月" : "年"}`
                : "無料プランをご利用中です"}
            </p>
            <Button asChild variant="ghost" size="sm" className="mt-4 w-full">
              <Link href="/dashboard/billing">
                <span>詳細を見る</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              設定
            </CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              アカウント
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              アカウント設定とプリファレンス管理
            </p>
            <Button asChild variant="ghost" size="sm" className="mt-4 w-full">
              <Link href="/dashboard/settings">
                <span>設定を開く</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              サポート
            </CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ヘルプ
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              サポートとドキュメントへのアクセス
            </p>
            <Button asChild variant="ghost" size="sm" className="mt-4 w-full">
              <Link href="/dashboard/help">
                <span>サポートを見る</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {isPremium ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                プレミアム機能
              </CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                利用可能
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                有料プラン限定の機能にアクセスできます
              </p>
              <Button asChild variant="ghost" size="sm" className="mt-4 w-full">
                <Link href="/dashboard/premium-feature">
                  <span>機能を見る</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                プレミアム機能
              </CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ロック中
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                アップグレードして高度な機能を使用
              </p>
              <Button asChild variant="ghost" size="sm" className="mt-4 w-full">
                <Link href="/pricing">
                  <span>プランを見る</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>最近のアクティビティ</CardTitle>
            <CardDescription>
              アカウントの最近のアクティビティと更新
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isPremium ? (
              <div className="space-y-4">
                <div className="border rounded-md p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">サブスクリプションを開始しました</p>
                      <p className="text-sm text-muted-foreground">
                        {subscriptionData && subscriptionData.created
                          ? new Date(subscriptionData.created).toLocaleDateString("ja-JP")
                          : ""}
                      </p>
                    </div>
                    <Star className="h-5 w-5 text-yellow-500" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                最近のアクティビティはありません
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
