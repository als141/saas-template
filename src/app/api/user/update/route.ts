import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const authResult = await auth();
    const userId = authResult.userId;
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const { name, email } = await req.json();

    // メールアドレスのバリデーション
    if (email && !email.includes("@")) {
      return NextResponse.json(
        { error: "有効なメールアドレスを入力してください" },
        { status: 400 }
      );
    }

    // ユーザー情報をSupabaseで更新
    const { error } = await supabase
      .from("users")
      .update({
        name: name,
        updated_at: new Date().toISOString(),
      })
      .eq("clerk_id", userId);

    if (error) {
      console.error("Supabaseエラー:", error);
      return NextResponse.json(
        { error: "ユーザー情報の更新に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ユーザー更新エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}