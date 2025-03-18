import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase/client";
import { formatDate, formatPrice } from "@/lib/utils";
import { CreditCard, ExternalLink } from "lucide-react";

export default async function BillingPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // サブスクリプション情報を取得
  const { data: subscriptionData } = await supabase
    .from("subscriptions")
    .select("*, prices(*)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  const isSubscribed = !!subscriptionData;

  // クライアントサイドの日本時間に変換する関数
  const toLocalDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>サブスクリプション</CardTitle>
            <CardDescription>
              現在のサブスクリプションプランと請求情報
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSubscribed ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-lg">{subscriptionData.prices.description || "有料プラン"}</p>
                    <p className="text-muted-foreground">
                      {formatPrice((subscriptionData.prices.unit_amount || 0) / 100)}{" "}
                      / {subscriptionData.prices.interval === "month" ? "月" : "年"}
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
            {isSubscribed ? (
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
            {isSubscribed ? (
              <div className="space-y-2">
                <div className="rounded-md border">
                  <div className="flex items-center justify-between p-4">
                    <div>
                      <p>{toLocalDate(subscriptionData.current_period_start)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice((subscriptionData.prices.unit_amount || 0) / 100)}
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