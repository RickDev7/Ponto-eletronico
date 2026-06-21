"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LogOut, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/actions/auth";
import { ROUTES } from "@/config/constants";
import type { CompanyContext } from "@/types/database";
import { EmployeeBottomNav } from "@/components/mobile/employee-bottom-nav";
import { EmployeeSidebarNav } from "@/components/mobile/employee-sidebar-nav";
import { EmployeeUnreadCountProvider } from "@/components/mobile/employee-unread-count-provider";
import { EmployeePwaProvider } from "@/components/pwa/employee-pwa-provider";
import { Button } from "@/components/ui/button";

interface MobileEmployeeShellProps {
  ctx: CompanyContext;
  companySlug: string;
  unreadNotifications?: number;
  children: React.ReactNode;
}

function shouldHideNav(pathname: string) {
  return (
    pathname.includes("/mobile/services/") ||
    pathname.includes("/mobile/check-in/")
  );
}

export function MobileEmployeeShell({
  ctx,
  companySlug,
  unreadNotifications = 0,
  children,
}: MobileEmployeeShellProps) {
  const tNav = useTranslations("navigation");
  const tAuth = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const pathname = usePathname();
  const hideNav = shouldHideNav(pathname);

  async function handleSignOut() {
    const id = toast.loading(tAuth("signingOut"));
    const result = await signOut();
    toast.dismiss(id);
    if (!result.success) {
      toast.error(tErrors("signOutFailed"));
      return;
    }
    router.push(ROUTES.login);
    router.refresh();
  }

  return (
    <EmployeeUnreadCountProvider
      companyId={ctx.company.id}
      employeeId={ctx.employee!.id}
      initialCount={unreadNotifications}
    >
      <div className="flex min-h-svh bg-background">
        {!hideNav && <EmployeeSidebarNav slug={companySlug} />}

        <div className="flex min-h-svh min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Smartphone className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{ctx.company.name}</p>
                <p className="text-[10px] text-muted-foreground">{tNav("myTasks")}</p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" className="size-8" onClick={handleSignOut}>
              <LogOut className="size-4" />
              <span className="sr-only">{tAuth("signOut")}</span>
            </Button>
          </header>

          <EmployeePwaProvider slug={companySlug}>
            <main
              className={
                hideNav
                  ? "mx-auto w-full max-w-3xl flex-1"
                  : "mx-auto w-full max-w-3xl flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-6"
              }
            >
              {children}
            </main>
          </EmployeePwaProvider>

          {!hideNav && <EmployeeBottomNav slug={companySlug} />}
        </div>
      </div>
    </EmployeeUnreadCountProvider>
  );
}
