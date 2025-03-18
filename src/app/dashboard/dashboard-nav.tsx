"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Home,
  Settings,
  HelpCircle,
} from "lucide-react";

interface DashboardNavProps extends React.HTMLAttributes<HTMLElement> {}

export function DashboardNav({ className, ...props }: DashboardNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      title: "ダッシュボード",
      href: "/dashboard",
      icon: Home,
    },
    {
      title: "請求管理",
      href: "/dashboard/billing",
      icon: CreditCard,
    },
    {
      title: "設定",
      href: "/dashboard/settings",
      icon: Settings,
    },
    {
      title: "ヘルプ",
      href: "/dashboard/help",
      icon: HelpCircle,
    },
  ];

  return (
    <nav className={cn("flex flex-col space-y-2", className)} {...props}>
      {navItems.map((item) => (
        <Button
          key={item.href}
          variant={pathname === item.href ? "default" : "ghost"}
          size="sm"
          className={cn(
            "justify-start",
            pathname === item.href
              ? "bg-blue-600 text-white hover:bg-blue-700 hover:text-white"
              : "hover:bg-transparent hover:text-blue-600"
          )}
          asChild
        >
          <Link href={item.href}>
            <item.icon className="mr-2 h-4 w-4" />
            {item.title}
          </Link>
        </Button>
      ))}
    </nav>
  );
}