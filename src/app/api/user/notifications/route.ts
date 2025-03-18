import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const notificationPreferences = await req.json();

    // 通知設定をSupabaseで更新
    const { error } = await supabase
      .from("users")
      .update({
        notification_preferences: notificationPreferences,
        updated_at: new Date().toISOString(),
      })
      .eq("clerk_id", userId);

    if (error) {
      console.error("Supabaseエラー:", error);
      return NextResponse.json(
        { error: "通知設定の更新に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("通知設定更新エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}