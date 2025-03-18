-- 拡張機能のインストール (UUIDを扱うため)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  billing_address JSONB,
  payment_method JSONB,
  notification_preferences JSONB DEFAULT '{"marketingEmails": false, "securityEmails": true, "serviceUpdates": true, "billingAlerts": true}'
);

-- 製品テーブル
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  active BOOLEAN DEFAULT TRUE,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  metadata JSONB
);

-- 料金テーブル
CREATE TABLE IF NOT EXISTS public.prices (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES public.products(id),
  active BOOLEAN DEFAULT TRUE,
  description TEXT,
  unit_amount BIGINT,
  currency TEXT,
  type TEXT,
  interval TEXT,
  interval_count INTEGER,
  trial_period_days INTEGER,
  metadata JSONB
);

-- サブスクリプションテーブル
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  price_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  current_period_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  current_period_end TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP WITH TIME ZONE,
  cancel_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  customer_id TEXT
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS users_clerk_id_idx ON public.users(clerk_id);

-- pricesテーブルとsubscriptionsテーブルの間に外部キー制約を追加
ALTER TABLE public.subscriptions 
  ADD CONSTRAINT fk_subscriptions_price FOREIGN KEY (price_id) REFERENCES public.prices(id);

-- RLSポリシーの設定
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;

-- サービスロールのポリシー（管理用）
CREATE POLICY "Service can do all on users" 
  ON public.users FOR ALL 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service can do all on subscriptions" 
  ON public.subscriptions FOR ALL 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service can do all on products" 
  ON public.products FOR ALL 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service can do all on prices" 
  ON public.prices FOR ALL 
  USING (true)
  WITH CHECK (true);

-- 認証済みユーザーのポリシー（自分のデータのみ）
CREATE POLICY "Users can view their own data"
  ON public.users FOR SELECT
  USING (auth.uid()::text = clerk_id);

CREATE POLICY "Users can view their own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid()::text);

-- 製品と価格は全ユーザーが見られるようにする
CREATE POLICY "Anyone can view products"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view prices"
  ON public.prices FOR SELECT
  USING (true);