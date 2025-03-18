"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";

const formSchema = z.object({
  marketingEmails: z.boolean().default(false),
  securityEmails: z.boolean().default(true),
  serviceUpdates: z.boolean().default(true),
  billingAlerts: z.boolean().default(true),
});

interface SerializedUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName: string;
  email: string;
  imageUrl?: string;
  createdAt?: string;
}

interface NotificationsFormProps {
  user: SerializedUser;
  userData: any;
}

export function NotificationsForm({ user, userData }: NotificationsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // ユーザーデータから通知設定を取得するか、デフォルト値を使用
  const notificationPreferences = userData?.notification_preferences || {
    marketingEmails: false,
    securityEmails: true,
    serviceUpdates: true,
    billingAlerts: true,
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      marketingEmails: notificationPreferences.marketingEmails,
      securityEmails: notificationPreferences.securityEmails,
      serviceUpdates: notificationPreferences.serviceUpdates,
      billingAlerts: notificationPreferences.billingAlerts,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    try {
      // API経由で通知設定を更新
      const response = await fetch("/api/user/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("更新に失敗しました");
      }

      toast.success("通知設定が更新されました");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("エラーが発生しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="marketingEmails"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">マーケティングメール</FormLabel>
                  <FormDescription>
                    新機能や特別オファーに関する情報を受け取る
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="securityEmails"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">セキュリティメール</FormLabel>
                  <FormDescription>
                    アカウントのセキュリティに関する重要な通知
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled // セキュリティメールは必須
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="serviceUpdates"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">サービス更新</FormLabel>
                  <FormDescription>
                    サービスの更新や変更に関する通知
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="billingAlerts"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">課金アラート</FormLabel>
                  <FormDescription>
                    請求やサブスクリプションに関する通知
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "更新中..." : "変更を保存"}
        </Button>
      </form>
    </Form>
  );
}