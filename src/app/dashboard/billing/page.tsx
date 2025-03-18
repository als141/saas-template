import { redirect } from "next/navigation";
import { DashboardHeader } from "@/app/dashboard/dashboard-header";
import { DashboardShell } from "@/app/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { currentUser } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { CreditCard, ExternalLink } from "lucide-react";

// Supabaseユーザー取得
async function getSupabaseUser(supabase: any, clerkUserId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .single();

  if (error || !data) {
    return null;
  }
  return data;
}

// 価格表示用のヘルパー関数
function displayPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "無料";
  return formatPrice(amount);
}

export default async function BillingPage() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect("/sign-in");
  }

  const supabase = createServerSupabaseClient();
  console.log("Fetching subscription data for clerkUserId:", clerkUser.id);

  // SupabaseユーザーIDを取得
  const supabaseUser = await getSupabaseUser(supabase, clerkUser.id);

  let subscriptionData = null;
  let priceData = null;
  let subscriptionError = null;
  let isSubscribed = false;

  if (supabaseUser) {
    // サブスクリプション情報を取得
    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", supabaseUser.id)
      .eq("status", "active")
      .single();

    if (subError) {
      console.error("Subscription data error:", subError);
      subscriptionError = subError;
    } else {
      subscriptionData = sub;
      isSubscribed = !!sub;
    }

    // 価格情報を取得
    if (subscriptionData) {
      const { data: price, error: priceError } = await supabase
        .from("prices")
        .select("*")
        .eq("id", subscriptionData.price_id)
        .single();
      if (priceError) {
        console.error("Price data error:", priceError);
      } else {
        priceData = price;
      }
    }
  }

  // クライアントサイドの日本時間に変換する関数
  const toLocalDate = (dateString: string) => {
    if (!dateString) return "日付が設定されていません";
    return new Date(dateString).toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // cancelフラグなど
  let canceled = false;
  try {
    const searchParams = new URL(globalThis.location?.href || "http://localhost").searchParams;
    canceled = searchParams.get("canceled") === "true";
  } catch (e) {
    // ignore
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="請求管理"
        text="サブスクリプションと請求情報の管理"
      >
        <Button asChild variant="outline">
          <a
            href="mailto:support@example.com?subject=請求に関するお問い合わせ"
            target="_blank"
          >
            サポートに問い合わせる
          </a>
        </Button>
      </DashboardHeader>

      {subscriptionError && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 mb-6">
          <p className="font-medium">サブスクリプション情報の取得中にエラーが発生しました</p>
          <p className="text-sm">データベースのセットアップを確認してください: {subscriptionError.message}</p>
        </div>
      )}

      {canceled && (
        <div className="mb-8 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md">
          <p className="text-blue-700">
            チェックアウトがキャンセルされました。引き続き現在のプランをご利用いただけます。
          </p>
        </div>
      )}

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>サブスクリプション</CardTitle>
            <CardDescription>
              現在のサブスクリプションプランと請求情報
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSubscribed && subscriptionData && priceData ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-lg">{priceData.description || "有料プラン"}</p>
                    <p className="text-muted-foreground">
                      {displayPrice(priceData.unit_amount)} / {priceData.interval === "month" ? "月" : "年"}
                    </p>
                  </div>
                  <div className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 px-3 py-1 rounded-full text-sm">
                    有効
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <p className="text-muted-foreground">サブスクリプションID</p>
                      <p className="font-mono">{subscriptionData.id}</p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <p className="text-muted-foreground">開始日</p>
                      <p>{toLocalDate(subscriptionData.current_period_start)}</p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <p className="text-muted-foreground">次回更新日</p>
                      <p>{toLocalDate(subscriptionData.current_period_end)}</p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <p className="text-muted-foreground">自動更新</p>
                      <p>{subscriptionData.cancel_at_period_end ? "無効" : "有効"}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-4 py-4">
                <CreditCard className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <p>アクティブなサブスクリプションがありません</p>
                  <p className="text-muted-foreground text-sm">
                    プレミアム機能にアクセスするには、サブスクリプションにご登録ください。
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-start space-y-2 sm:flex-row sm:justify-between sm:space-x-0">
            {isSubscribed && subscriptionData && priceData ? (
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
                <Button asChild variant="outline">
                  <a
                    href="/api/create-portal"
                    className="flex items-center"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Stripe顧客ポータル
                  </a>
                </Button>
                <Button asChild variant="destructive">
                  <a
                    href="/api/create-portal?redirect=cancel"
                    className="flex items-center"
                  >
                    サブスクリプションをキャンセル
                  </a>
                </Button>
              </div>
            ) : (
              <Button asChild>
                <a href="/pricing">プランを見る</a>
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>請求履歴</CardTitle>
            <CardDescription>過去の請求と支払い記録</CardDescription>
          </CardHeader>
          <CardContent>
            {isSubscribed && subscriptionData && priceData ? (
              <div className="space-y-2">
                <div className="rounded-md border">
                  <div className="flex items-center justify-between p-4">
                    <div>
                      <p>{toLocalDate(subscriptionData.current_period_start)}</p>
                      <p className="text-sm text-muted-foreground">
                        {displayPrice(priceData.unit_amount)}
                      </p>
                    </div>
                    <div className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 px-3 py-1 rounded-full text-sm">
                      支払い完了
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                請求履歴はありません
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
