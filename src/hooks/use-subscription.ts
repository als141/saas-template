"use client";

import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { formatPrice } from "@/lib/utils";

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

      // デバッグのために詳細なログを出力
      console.log(`Fetching subscription for user with Clerk ID: ${userId}`);

      try {
        // まず、ClerkIDに対応するSupabaseのユーザーIDを取得
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("clerk_id", userId)
          .single();
          
        if (userError) {
          console.error("Supabaseユーザー取得エラー:", userError);
          return null;
        }
        
        if (!userData) {
          console.log("Supabaseユーザーが見つかりません。サブスクリプションはありません。");
          return null;
        }
        
        console.log(`Found Supabase user ID: ${userData.id}, fetching subscription`);
        
        // 次に、SupabaseユーザーIDを使ってサブスクリプションを検索
        const { data, error } = await supabase
          .from("subscriptions")
          .select("*, prices(*)")
          .eq("user_id", userData.id)
          .eq("status", "active")
          .maybeSingle();
  
        if (error) {
          console.error("サブスクリプション取得エラー:", error);
          throw error;
        }
  
        console.log("Subscription data:", data);
        return data;
      } catch (err) {
        console.error("サブスクリプション取得中の例外:", err);
        throw err;
      }
    },
    enabled: !!userId && isLoaded && isSignedIn,
    staleTime: 1000 * 60 * 5, // 5分間はキャッシュを使用
    refetchOnWindowFocus: true, // ウィンドウフォーカス時に再取得
  });

  const isPremium = !!subscription;

  // プラン名を取得する関数
  const getPlanName = () => {
    if (!subscription) return "無料プラン";
    return subscription.prices?.description || "有料プラン";
  };

  // プラン価格を取得する関数
  const getPlanPrice = () => {
    if (!subscription || !subscription.prices?.unit_amount) return null;
    return formatPrice(subscription.prices.unit_amount / 100);
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
    getPlanPrice,
    getNextBillingDate,
    isCanceled,
    refreshSubscription,
  };
}