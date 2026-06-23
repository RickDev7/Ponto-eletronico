"use client";

import { usePathname } from "@/i18n/navigation";
import type { CompanyContext } from "@/types/database";
import { EmployeeBottomNav } from "@/components/mobile/employee-bottom-nav";
import { EmployeeUnreadCountProvider } from "@/components/mobile/employee-unread-count-provider";
import { EmployeePwaProvider } from "@/components/pwa/employee-pwa-provider";
import { DeviceLockProvider } from "@/hooks/employee/use-device-lock";
import { EmployeeDeviceLockScreen } from "@/components/pwa/employee-device-lock-screen";
import { cn } from "@/lib/utils";

interface MobileEmployeeShellProps {
  ctx: CompanyContext;
  companySlug: string;
  unreadNotifications?: number;
  children: React.ReactNode;
}

function isImmersiveRoute(pathname: string) {
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
  const pathname = usePathname();
  const immersive = isImmersiveRoute(pathname);

  return (
    <EmployeeUnreadCountProvider
      companyId={ctx.company.id}
      employeeId={ctx.employee!.id}
      initialCount={unreadNotifications}
    >
      <DeviceLockProvider slug={companySlug} employeeId={ctx.employee!.id}>
        <div
          className={cn(
            "min-h-svh",
            !immersive && "bg-[var(--mobile-bg,#F8FAFC)]",
          )}
          data-surface="employee-mobile"
        >
          <EmployeePwaProvider slug={companySlug}>
            <main className="mx-auto w-full max-w-md flex-1">{children}</main>
          </EmployeePwaProvider>
          {!immersive && <EmployeeBottomNav slug={companySlug} />}
        </div>
        <EmployeeDeviceLockScreen />
      </DeviceLockProvider>
    </EmployeeUnreadCountProvider>
  );
}
