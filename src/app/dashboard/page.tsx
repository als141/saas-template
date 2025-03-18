import { redirect } from "next/navigation";
import { DashboardHeader } from "@/app/dashboard/dashboard-header";
import { DashboardShell } from "@/app/dashboard/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, CreditCard, Settings, HelpCircle, Star } from "lucide-react";

export default async function DashboardPage() {
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

  const isPremium = !!subscriptionData;

  // ユーザー情報をSupabaseから取得
  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", user.id)
    .single();

  return (
    <DashboardShell>
      <DashboardHeader
        heading="ダッシュボード"
        text={`こんにちは、${user.firstName || "ようこそ"}! アカウントの概要です。`}
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
              {isPremium ? "アクティブなサブスクリプションがあります" : "無料プランをご利用中です"}
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
            {/* ここに最近のアクティビティのリストを表示します
                現在はデモ用のプレースホルダーとして空のメッセージを表示します */}
            <div className="text-center py-8 text-muted-foreground">
              最近のアクティビティはありません
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}