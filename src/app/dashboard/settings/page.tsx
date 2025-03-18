import { redirect } from "next/navigation";
import { DashboardHeader } from "@/app/dashboard/dashboard-header";
import { DashboardShell } from "@/app/dashboard/dashboard-shell";
import { currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { UserSettingsForm } from "@/app/dashboard/user-settings-form";
import { NotificationsForm } from "@/app/dashboard/notifications-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";

export default async function SettingsPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Supabaseからユーザー情報を取得
  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", user.id)
    .single();

  // クライアントコンポーネントに渡すためのシリアライズ可能な平坦なユーザーデータを作成
  const serializedUser = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    email: user.emailAddresses[0]?.emailAddress || '',
    imageUrl: user.imageUrl,
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : undefined
  };

  // シリアライズ可能なユーザーデータ
  const serializedUserData = userData ? {
    ...userData,
    notification_preferences: userData.notification_preferences || {
      marketingEmails: false,
      securityEmails: true,
      serviceUpdates: true,
      billingAlerts: true
    }
  } : null;

  return (
    <DashboardShell>
      <DashboardHeader
        heading="設定"
        text="アカウント設定とプロフィール情報を管理します"
      />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">一般</TabsTrigger>
          <TabsTrigger value="notifications">通知</TabsTrigger>
          <TabsTrigger value="appearance">外観</TabsTrigger>
          <TabsTrigger value="subscription">サブスクリプション</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>プロフィール</CardTitle>
              <CardDescription>
                プロフィール情報を管理します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user.imageUrl} alt={user.username || ""} />
                  <AvatarFallback>
                    {user.firstName?.charAt(0)}
                    {user.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="font-medium text-lg">{user.firstName} {user.lastName}</h3>
                  <p className="text-sm text-muted-foreground">{user.emailAddresses[0].emailAddress}</p>
                  <p className="text-sm text-muted-foreground">
                    登録日: {formatDate(userData?.created_at || new Date().toISOString())}
                  </p>
                </div>
              </div>
              <UserSettingsForm user={serializedUser} userData={serializedUserData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>通知設定</CardTitle>
              <CardDescription>
                通知の受信方法を管理します
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationsForm user={serializedUser} userData={serializedUserData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>外観</CardTitle>
              <CardDescription>
                ダッシュボードの表示をカスタマイズします
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                外観設定は現在、ヘッダーのテーマ切り替えで管理されています。
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>サブスクリプション管理</CardTitle>
              <CardDescription>
                サブスクリプションの詳細は請求管理ページで確認できます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                サブスクリプションの変更、キャンセル、または更新には、請求管理ページにアクセスしてください。
              </p>
            </CardContent>
            <CardFooter>
              <a
                href="/dashboard/billing"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                請求管理に移動
              </a>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}