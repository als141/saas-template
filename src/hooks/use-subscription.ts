"use client";

import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

export function useSubscription() {
  const { userId, isLoaded, isSignedIn } = useAuth();

  const {
    data: subscription,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["subscription", userId],
    queryFn: async () => {
      if (!userId || !isSignedIn) return null;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, prices(*)")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (error) {
        console.error("サブスクリプション取得エラー:", error);
        throw error;
      }

      return data;
    },
    enabled: !!userId && isLoaded && isSignedIn,
  });

  const isPremium = !!subscription;

  // プラン名を取得する関数
  const getPlanName = () => {
    if (!subscription) return "無料プラン";
    return subscription.prices?.description || "有料プラン";
  };

  // 次回更新日を取得する関数
  const getNextBillingDate = () => {
    if (!subscription) return null;
    return new Date(subscription.current_period_end);
  };

  // キャンセル状態を確認する関数
  const isCanceled = () => {
    if (!subscription) return false;
    return subscription.cancel_at_period_end;
  };

  // サブスクリプションを更新する関数
  const refreshSubscription = () => {
    return refetch();
  };

  return {
    subscription,
    isLoading,
    error,
    isPremium,
    getPlanName,
    getNextBillingDate,
    isCanceled,
    refreshSubscription,
  };
}