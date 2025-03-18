"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserButton, useAuth } from "@clerk/nextjs";
import { ModeToggle } from "@/components/mode-toggle";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Navbar() {
  const { isSignedIn } = useAuth();
  const pathname = usePathname();

  const routes = [
    {
      href: "/",
      label: "ホーム",
      active: pathname === "/",
    },
    {
      href: "/features",
      label: "機能",
      active: pathname === "/features",
    },
    {
      href: "/pricing",
      label: "料金プラン",
      active: pathname === "/pricing",
    },
  ];

  return (
    <header className="border-b bg-white dark:bg-gray-950">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center">
          <Link href="/" className="text-xl font-bold">
            SaaS<span className="text-blue-600">スターター</span>
          </Link>
          <nav className="ml-10 hidden md:flex gap-6">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  route.active ? "text-black dark:text-white" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {route.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4">
            <ModeToggle />
            {isSignedIn ? (
              <>
                <Link href="/dashboard">
                  <Button variant="outline" size="sm">
                    ダッシュボード
                  </Button>
                </Link>
                <UserButton afterSignOutUrl="/" />
              </>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="outline" size="sm">
                    ログイン
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button size="sm">登録</Button>
                </Link>
              </>
            )}
          </div>

          {/* モバイルメニュー */}
          <div className="md:hidden flex items-center">
            <ModeToggle />
            {isSignedIn && <UserButton afterSignOutUrl="/" />}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <nav className="flex flex-col gap-4 mt-8">
                  {routes.map((route) => (
                    <Link
                      key={route.href}
                      href={route.href}
                      className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                        route.active ? "text-black dark:text-white" : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {route.label}
                    </Link>
                  ))}
                  {!isSignedIn ? (
                    <>
                      <Link href="/sign-in">
                        <Button variant="outline" className="w-full">
                          ログイン
                        </Button>
                      </Link>
                      <Link href="/sign-up">
                        <Button className="w-full">登録</Button>
                      </Link>
                    </>
                  ) : (
                    <Link href="/dashboard">
                      <Button className="w-full">ダッシュボード</Button>
                    </Link>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}