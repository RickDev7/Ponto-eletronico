"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { EMPLOYEE_NAV_ITEMS } from "@/components/mobile/employee-nav-config";
import { useEmployeeUnreadCount } from "@/components/mobile/employee-unread-count-provider";
import { cn } from "@/lib/utils";

interface EmployeeSidebarNavProps {
  slug: string;
}

export function EmployeeSidebarNav({ slug }: EmployeeSidebarNavProps) {
  const pathname = usePathname();
  const t = useTranslations("employee.mobile.nav");
  const unreadCount = useEmployeeUnreadCount();

  return (
    <aside
      className="sticky top-0 hidden h-svh w-56 shrink-0 flex-col border-r border-border/60 bg-background/95 backdrop-blur md:flex"
      aria-label={t("sidebarLabel")}
    >
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {EMPLOYEE_NAV_ITEMS.map((item) => {
          const href = item.href(slug);
          const active = item.match(pathname, slug);

          return (
            <Link
              key={item.labelKey}
              href={href}
              prefetch={item.prefetch}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <item.icon className="size-5 shrink-0" />
              <span className="truncate">{t(item.labelKey)}</span>
              {item.labelKey === "notifications" && unreadCount > 0 && (
                <span
                  className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground"
                  aria-label={t("unreadBadge", { count: unreadCount })}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
