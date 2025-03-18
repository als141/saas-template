# SaaS スターターテンプレート

Next.js、TypeScript、Clerk、Supabase、Stripeを使用した完全なSaaSスターターテンプレート。

## 機能

- 🔐 [Clerk](https://clerk.dev/)による認証システム
- 📊 [Supabase](https://supabase.com/)によるデータベース連携
- 💳 [Stripe](https://stripe.com/)による決済機能
- 🎨 [Shadcn UI](https://ui.shadcn.com/)によるモダンなUIコンポーネント
- 🌙 ダークモード対応
- 📱 レスポンシブデザイン
- 🚀 [TypeScript](https://www.typescriptlang.org/)による型安全なコーディング
- 🔄 サブスクリプション管理機能
- 🧩 モジュラーな構造で拡張性が高い

## 始め方

### 前提条件

- [Node.js](https://nodejs.org/) (v18以上)
- [Bun](https://bun.sh/) (最新バージョン)
- [Supabase](https://supabase.com/)アカウント
- [Clerk](https://clerk.dev/)アカウント
- [Stripe](https://stripe.com/)アカウント

### インストール

1. リポジトリをクローンする:

```bash
git clone https://github.com/yourusername/saas-starter.git
cd saas-starter
```

2. 依存関係をインストールする:

```bash
bun install
```

3. `.env.local`ファイルを作成し、以下の環境変数を設定する:

```bash
# Clerk認証
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# サイトURL (WebhookなどのリダイレクトURLに使用)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. Supabaseのスキーマをセットアップする:

```bash
cd supabase
supabase migration up
```

5. 開発サーバーを起動する:

```bash
bun dev
```

## 本番環境へのデプロイ

このプロジェクトは[Vercel](https://vercel.com/)や[Netlify](https://www.netlify.com/)などのプラットフォームに簡単にデプロイできます。

### Vercelへのデプロイ

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https://github.com/yourusername/saas-starter)

1. 上記のボタンをクリックする
2. 必要な環境変数を設定する
3. デプロイボタンをクリック

## プロジェクト構造

```
saas-starter/
├── public/             # 静的ファイル
├── src/                # ソースコード
│   ├── app/            # Appルーター
│   │   ├── api/        # APIルート
│   │   ├── dashboard/  # ダッシュボード関連ページ
│   │   ├── sign-in/    # サインインページ
│   │   └── sign-up/    # サインアップページ
│   ├── components/     # UIコンポーネント
│   │   ├── dashboard/  # ダッシュボード用コンポーネント
│   │   └── ui/         # 共通UIコンポーネント
│   ├── lib/            # ユーティリティ関数とライブラリ
│   └── types/          # 型定義ファイル
├── supabase/           # Supabase関連ファイル
│   └── migrations/     # データベースマイグレーション
└── .env.local.example  # 環境変数の例
```

## コントリビューション

コントリビューションは大歓迎です！以下の手順で貢献できます：

1. このリポジトリをフォークする
2. 新しいブランチを作成する (`git checkout -b feature/amazing-feature`)
3. 変更をコミットする (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュする (`git push origin feature/amazing-feature`)
5. プルリクエストを作成する

## ライセンス

MITライセンスの下で配布されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 謝辞

- [Next.js](https://nextjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Clerk](https://clerk.dev/)
- [Supabase](https://supabase.com/)
- [Stripe](https://stripe.com/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)