import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, Mail, MessageSquare } from "lucide-react";
import { currentUser } from "@clerk/nextjs/server";

export default async function HelpPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const faqs = [
    {
      question: "サブスクリプションをキャンセルするにはどうすればいいですか？",
      answer:
        "サブスクリプションのキャンセルは「ダッシュボード → 請求管理」から行えます。現在の請求期間の終了時にサブスクリプションが終了します。"
    },
    {
      question: "プランの変更はいつでもできますか？",
      answer:
        "はい、プランの変更はいつでも可能です。アップグレードの場合は即時に反映され、ダウングレードの場合は現在の請求期間の終了時に反映されます。"
    },
    {
      question: "請求に関する問題が発生した場合はどうすればいいですか？",
      answer:
        "請求に関する問題は「サポートに問い合わせる」ボタンからお問い合わせください。できるだけ早く対応いたします。"
    },
    {
      question: "複数のデバイスでログインできますか？",
      answer:
        "はい、複数のデバイスで同時にログインすることができます。セキュリティ上の理由から、不審なログインがあった場合は通知が送信されます。"
    },
    {
      question: "アカウントを削除するにはどうすればいいですか？",
      answer:
        "アカウントの削除は「設定 → 一般 → アカウント削除」から行えます。この操作は取り消せないのでご注意ください。"
    },
  ];

  return (
    <DashboardShell>
      <DashboardHeader
        heading="ヘルプセンター"
        text="よくある質問と問い合わせ方法"
      />

      <div className="grid gap-8">
        {/* 検索セクション */}
        <Card>
          <CardHeader>
            <CardTitle>サポート検索</CardTitle>
            <CardDescription>
              質問やキーワードを入力して検索してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex w-full items-center space-x-2">
              <Input
                type="text"
                placeholder="例: サブスクリプションの変更方法"
                className="flex-1"
              />
              <Button type="submit">検索</Button>
            </div>
          </CardContent>
        </Card>

        {/* よくある質問 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <HelpCircle className="mr-2 h-5 w-5" /> よくある質問
            </CardTitle>
            <CardDescription>
              一般的な質問とその回答
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>
                    <p>{faq.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* お問い合わせ方法 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="mr-2 h-5 w-5" /> メールサポート
              </CardTitle>
              <CardDescription>
                24時間以内に返信いたします
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                技術的な問題やアカウントに関するお問い合わせは、メールでサポートチームにお問い合わせください。
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild>
                <a href="mailto:support@example.com">メールを送信</a>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" /> ライブチャット
              </CardTitle>
              <CardDescription>
                営業時間内ならすぐに回答が得られます
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                平日9:00〜18:00の間は、ライブチャットでリアルタイムにサポートを受けることができます。
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline">チャットを開始</Button>
            </CardFooter>
          </Card>
        </div>

        {/* ナレッジベース */}
        <Card>
          <CardHeader>
            <CardTitle>ナレッジベース</CardTitle>
            <CardDescription>
              詳細なガイドとチュートリアル
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                "はじめてのご利用ガイド",
                "アカウント設定の詳細",
                "請求とサブスクリプション",
                "セキュリティのベストプラクティス",
                "APIドキュメント",
                "開発者向けリソース",
              ].map((item, i) => (
                <a
                  key={i}
                  href="#"
                  className="block p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  {item}
                </a>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" asChild>
              <a href="#" className="w-full justify-center">
                すべての記事を見る
              </a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardShell>
  );
}