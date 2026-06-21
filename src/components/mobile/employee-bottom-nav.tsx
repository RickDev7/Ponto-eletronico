"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { EMPLOYEE_NAV_ITEMS } from "@/components/mobile/employee-nav-config";
import { useEmployeeUnreadCount } from "@/components/mobile/employee-unread-count-provider";
import { cn } from "@/lib/utils";

interface EmployeeBottomNavProps {
  slug: string;
}

export function EmployeeBottomNav({ slug }: EmployeeBottomNavProps) {
  const pathname = usePathname();
  const t = useTranslations("employee.mobile.nav");
  const unreadCount = useEmployeeUnreadCount();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-sm safe-area-pb md:hidden"
      aria-label={t("bottomLabel")}
    >
      <div className="mx-auto flex max-w-lg items-stretch">
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
                "relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2.5 text-center transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className={cn("size-5 shrink-0", active && "fill-primary/10")} />
              {item.labelKey === "notifications" && unreadCount > 0 && (
                <span
                  className="absolute right-[calc(50%-18px)] top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground"
                  aria-label={t("unreadBadge", { count: unreadCount })}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              <span className="max-w-full truncate text-[10px] font-medium leading-tight">
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
