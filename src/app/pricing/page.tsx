import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { PricingCard } from "@/components/pricing-card";
import { stripe } from "@/lib/stripe/client";
import { formatPrice } from "@/lib/utils";
import { Check } from "lucide-react";
import Stripe from "stripe";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  priceId: string;
  interval: string | null;
  features: string[];
}

async function getProductsAndPrices(): Promise<Product[]> {
  try {
    const products = await stripe.products.list({
      active: true,
      expand: ["data.default_price"],
    });

    console.log("Products from Stripe:", JSON.stringify(products.data, null, 2));

    return products.data
      .sort((a, b) => {
        const priceA = ((a.default_price as Stripe.Price)?.unit_amount || 0);
        const priceB = ((b.default_price as Stripe.Price)?.unit_amount || 0);
        return priceA - priceB;
      })
      .map((product) => {
        const price = product.default_price as Stripe.Price;
        
        console.log(`Product ${product.id} price: ${price.unit_amount}`);
        
        // メタデータからフィーチャーを取得
        let features = [];
        if (product.metadata && product.metadata.features) {
          features = product.metadata.features.split(",").map(f => f.trim());
        } else {
          // デフォルトのフィーチャー
          features = ["基本機能"];
          
          // プラン名に基づいて機能を推測
          if (product.name.toLowerCase().includes("plus")) {
            features.push("優先サポート", "拡張機能");
          } else if (product.name.toLowerCase().includes("pro")) {
            features.push("優先サポート", "拡張機能", "高度な分析");
          } else if (product.name.toLowerCase().includes("elite")) {
            features.push("24時間サポート", "すべての機能", "高度な分析", "カスタムインテグレーション");
          }
        }
        
        return {
          id: product.id,
          name: product.name,
          description: product.description,
          price: formatPrice(price.unit_amount || 0),
          priceId: price.id,
          interval: price.type === "recurring" ? (price.recurring?.interval ?? null) : null,
          features: features,
        };
      });
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export default async function PricingPage() {
  const plans = await getProductsAndPrices();

  // URLパラメータをチェック
  const searchParams = new URL(globalThis.location?.href || "http://localhost").searchParams;
  const notice = searchParams.get("notice");
  const canceled = searchParams.get("canceled") === "true";

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          {notice === "premium_required" && (
            <div className="mb-8 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
              <p className="text-yellow-700">
                この機能にアクセスするには、プレミアムプランへのアップグレードが必要です。
              </p>
            </div>
          )}

          {canceled && (
            <div className="mb-8 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md">
              <p className="text-blue-700">
                チェックアウトがキャンセルされました。引き続き現在のプランをご利用いただけます。
              </p>
            </div>
          )}

          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold tracking-tight mb-4">シンプルで透明な料金プラン</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              あなたのニーズに合わせた柔軟なプランをご用意しています。いつでもアップグレードやダウングレードが可能です。
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.length > 0 ? (
              plans.map((plan) => (
                <PricingCard
                  key={plan.id}
                  name={plan.name}
                  description={plan.description || ""}
                  price={plan.price || ""}
                  interval={plan.interval || ""}
                  features={plan.features}
                  priceId={plan.priceId}
                  popular={plan.name.toLowerCase().includes("pro") || plan.name.toLowerCase().includes("plus")}
                />
              ))
            ) : (
              <div className="col-span-3 text-center py-12">
                <p className="text-muted-foreground">
                  プランの読み込み中にエラーが発生しました。もう一度お試しください。
                </p>
                <Button className="mt-4" onClick={() => window.location.reload()}>
                  再読み込み
                </Button>
              </div>
            )}
          </div>

          <div className="mt-20 text-center">
            <h2 className="text-2xl font-bold mb-8">すべてのプランに含まれる機能</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {[
                "セキュアな認証",
                "データベースアクセス",
                "APIアクセス",
                "メールサポート",
                "SSL証明書",
                "99.9%稼働時間保証",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <Check className="text-green-500 h-5 w-5 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-20 bg-gray-50 dark:bg-gray-900 rounded-lg p-8 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">カスタムプランが必要ですか？</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              大規模なプロジェクトや特別な要件がある場合は、カスタムプランをご用意します。お気軽にお問い合わせください。
            </p>
            <Button asChild>
              <a href="mailto:contact@example.com">お問い合わせ</a>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}