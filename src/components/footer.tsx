import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-white dark:bg-gray-950 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="text-xl font-bold">
              SaaS<span className="text-blue-600">スターター</span>
            </Link>
            <p className="mt-4 text-gray-500 dark:text-gray-400 max-w-md">
              Next.js、TypeScript、Clerk、Supabase、Stripeを使ったSaaSスターターテンプレート。
              迅速にプロジェクトを始めるための完全なソリューション。
            </p>
          </div>
          
          <div>
            <h3 className="font-medium text-black dark:text-white mb-4">リンク</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-500">
                  ホーム
                </Link>
              </li>
              <li>
                <Link href="/features" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-500">
                  機能
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-500">
                  料金プラン
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-500">
                  ブログ
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-black dark:text-white mb-4">法的情報</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-500">
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-500">
                  利用規約
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-500">
                  お問い合わせ
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} SaaSスターター. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              日本から愛を込めて構築 🇯🇵
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}