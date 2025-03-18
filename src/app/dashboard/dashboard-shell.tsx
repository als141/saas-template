import { DashboardNav } from "@/app/dashboard/dashboard-nav";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";
import { ModeToggle } from "@/components/mode-toggle";

interface DashboardShellProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardShell({ children, className }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-8">
            <div className="hidden md:flex">
              <a href="/" className="text-xl font-bold">
                SaaS<span className="text-blue-600">スターター</span>
              </a>
            </div>
            <nav className="hidden md:flex items-center space-x-4 lg:space-x-6">
              <a
                href="/dashboard"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                ダッシュボード
              </a>
              <a
                href="/dashboard/billing"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                請求管理
              </a>
              <a
                href="/dashboard/settings"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                設定
              </a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <ModeToggle />
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>
      <div className="grid flex-1 md:grid-cols-[220px_1fr]">
        <aside className="hidden md:flex flex-col border-r px-4 py-6">
          <DashboardNav />
        </aside>
        <main className="flex-1 p-6 pt-6">
          <div className={cn("mx-auto flex flex-col gap-8", className)}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}