import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { PricingCard } from "@/components/pricing-card";
import { stripe } from "@/lib/stripe/client";
import { formatPrice } from "@/lib/utils";
import { Check } from "lucide-react";

async function getProductsAndPrices() {
  const products = await stripe.products.list({
    active: true,
    expand: ["data.default_price"],
  });

  return products.data
    .sort((a, b) => {
      const priceA = (a.default_price as Stripe.Price)?.unit_amount || 0;
      const priceB = (b.default_price as Stripe.Price)?.unit_amount || 0;
      return priceA - priceB;
    })
    .map((product) => {
      const price = product.default_price as Stripe.Price;
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: price.unit_amount ? formatPrice(price.unit_amount / 100) : null,
        priceId: price.id,
        interval: price.type === "recurring" ? price.recurring?.interval : null,
        features: (product.metadata.features || "").split(","),
      };
    });
}

export default async function PricingPage() {
  const plans = await getProductsAndPrices();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold tracking-tight mb-4">シンプルで透明な料金プラン</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              あなたのニーズに合わせた柔軟なプランをご用意しています。いつでもアップグレードやダウングレードが可能です。
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <PricingCard
                key={plan.id}
                name={plan.name}
                description={plan.description || ""}
                price={plan.price || ""}
                interval={plan.interval || ""}
                features={plan.features}
                priceId={plan.priceId}
              />
            ))}
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