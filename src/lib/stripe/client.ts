import Stripe from 'stripe';

// Stripeクライアントのインスタンス作成
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-02-24.acacia', // 最新のStripe APIバージョンを指定
});