import { redirect } from "next/navigation";
import { DashboardHeader } from "@/app/dashboard/dashboard-header";
import { DashboardShell } from "@/app/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { currentUser } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Lock, Unlock, Download, Share, Star } from "lucide-react";

// Clerk IDからSupabaseユーザー取得（なければ作成）
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
    
    return newUser;
  }

  return userData;
}

export default async function PremiumFeaturePage() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect("/sign-in");
  }

  // サーバー側でサブスクリプションの確認
  const supabase = createServerSupabaseClient();
  const supabaseUser = await getOrCreateSupabaseUser(supabase, clerkUser);
  
  if (!supabaseUser) {
    // そもそもユーザーが存在しない = サブスクない
    redirect("/pricing?notice=premium_required");
  }

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", supabaseUser.id)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("Subscription query error:", error);
  }

  const isPremium = !!subscription;

  // プレミアムユーザーでない場合は料金プランページにリダイレクト
  if (!isPremium) {
    redirect("/pricing?notice=premium_required");
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="プレミアム機能"
        text="有料プラン限定の高度な機能"
      >
        <Button variant="outline" size="sm">
          <Share className="mr-2 h-4 w-4" />
          共有
        </Button>
      </DashboardHeader>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Unlock className="h-5 w-5 text-green-500" />
              <CardTitle>プレミアム機能にアクセスできます</CardTitle>
            </div>
            <CardDescription>
              有料プランをご利用いただきありがとうございます。以下の機能を自由にお使いいただけます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="rounded-lg border p-4">
                <h3 className="text-lg font-medium mb-2">高度な分析ツール</h3>
                <p className="text-muted-foreground mb-4">
                  詳細なデータ分析とインサイトにアクセスできます。
                </p>
                <Button>分析ダッシュボードを開く</Button>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="text-lg font-medium mb-2">データエクスポート</h3>
                <p className="text-muted-foreground mb-4">
                  データをCSVまたはExcel形式でエクスポートできます。
                </p>
                <div className="flex space-x-3">
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    CSV形式
                  </Button>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Excel形式
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="text-lg font-medium mb-2">優先サポート</h3>
                <p className="text-muted-foreground mb-4">
                  24時間以内に返信保証の優先サポートをご利用いただけます。
                </p>
                <Button>サポートに問い合わせる</Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-6">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>現在、{subscription?.price_id}プランをご利用中です</span>
            </div>
          </CardFooter>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: "詳細レポート",
              description: "高度なレポート機能で詳細な分析が可能",
              icon: <span className="text-2xl">📊</span>,
            },
            {
              title: "AIアシスタント",
              description: "AIを活用した高度な自動化機能",
              icon: <span className="text-2xl">🤖</span>,
            },
            {
              title: "カスタマイズ",
              description: "ダッシュボードと通知の完全カスタマイズ",
              icon: <span className="text-2xl">⚙️</span>,
            },
            {
              title: "チーム連携",
              description: "複数メンバーでの共同作業が可能",
              icon: <span className="text-2xl">👥</span>,
            },
            {
              title: "APIアクセス",
              description: "APIを使用して外部システムと連携",
              icon: <span className="text-2xl">🔌</span>,
            },
            {
              title: "バックアップ",
              description: "自動バックアップとデータリカバリー",
              icon: <span className="text-2xl">💾</span>,
            },
          ].map((feature, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  {feature.icon}
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full">
                  詳細を見る
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}