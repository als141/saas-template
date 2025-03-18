"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface PricingCardProps {
  name: string;
  description: string;
  price: string;
  interval: string;
  features: string[];
  priceId: string;
  popular?: boolean;
}

export function PricingCard({
  name,
  description,
  price,
  interval,
  features,
  priceId,
  popular = false,
}: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const handleSubscribe = async () => {
    try {
      setIsLoading(true);

      if (!isSignedIn) {
        router.push("/sign-in");
        return;
      }

      console.log(`Subscribing to plan: ${name} (${priceId})`);

      // Stripe Checkoutセッションを作成するAPIを呼び出し
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || "エラーが発生しました");
        setIsLoading(false);
        return;
      }

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        setIsLoading(false);
        return;
      }

      // Stripe Checkoutページにリダイレクト
      if (data.url) {
        console.log(`Redirecting to checkout: ${data.url}`);
        router.push(data.url);
      } else {
        toast.error("チェックアウトURLが見つかりません");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("エラーが発生しました。もう一度お試しください。");
      setIsLoading(false);
    }
  };

  return (
    <Card className={`flex flex-col ${popular ? "border-blue-500 shadow-lg" : ""} relative`}>
      {popular && (
        <div className="absolute -top-4 left-0 right-0 flex justify-center">
          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">人気</span>
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-xl">{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="mb-6">
          <span className="text-3xl font-bold">{price}</span>
          {interval && (
            <span className="text-gray-500 dark:text-gray-400 ml-1">
              /{interval === "month" ? "月" : interval === "year" ? "年" : interval}
            </span>
          )}
        </div>
        <ul className="space-y-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check className="text-green-500 h-5 w-5 mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleSubscribe}
          className={`w-full ${popular ? "bg-blue-500 hover:bg-blue-600" : ""}`}
          disabled={isLoading}
        >
          {isLoading ? "処理中..." : "今すぐ始める"}
        </Button>
      </CardFooter>
    </Card>
  );
}