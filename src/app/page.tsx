import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ArrowRight, CheckCircle } from "lucide-react";

export default function Home() {
  const features = [
    "ユーザー認証と管理",
    "サブスクリプション決済",
    "ダッシュボード機能",
    "ダークモード対応",
    "レスポンシブデザイン",
    "タイプセーフな開発環境",
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* ヒーローセクション */}
        <section className="py-20 px-4 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500 mb-6">
                迅速にSaaSを構築するスターターテンプレート
              </h1>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mb-10">
                Next.js、TypeScript、Clerk、Supabase、Stripeを使用して、すぐに開発を始められる完全なスターターテンプレート。フロントエンドから認証、データベース、決済まで全て設定済み。
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/sign-up">
                    今すぐ始める <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/pricing">
                    料金プラン
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 特徴セクション */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-center mb-12">主な機能</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, i) => (
                <div key={i} className="border p-6 rounded-lg hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-green-500 h-6 w-6 mt-1" />
                    <span className="text-lg font-medium">{feature}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTAセクション */}
        <section className="py-16 px-4 bg-blue-50 dark:bg-gray-900">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold mb-6">今すぐ始めませんか？</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              無料で始めて、プロジェクトに合わせてスケールアップできます。
            </p>
            <Button asChild size="lg">
              <Link href="/sign-up">
                無料アカウントを作成
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}