import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 日付を日本語形式でフォーマットする関数
 * @param date - 日付（文字列またはDateオブジェクト）
 * @returns フォーマットされた日付文字列
 */
export function formatDate(date: Date | string) {
  if (!date) return "";
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    console.warn("Invalid date:", date);
    return "";
  }
  
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 価格を日本円でフォーマットする関数
 * @param price - 価格
 * @returns フォーマットされた価格文字列
 */
export function formatPrice(price: number) {
  if (!price && price !== 0) return "¥0";
  
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}