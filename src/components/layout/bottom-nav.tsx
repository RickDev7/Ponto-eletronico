"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  UserCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MemberRole } from "@/types";

interface BottomNavProps {
  slug: string;
  role: MemberRole;
}

export function BottomNav({ slug, role }: BottomNavProps) {
  const pathname = usePathname();
  const t = useTranslations("navigation");

  const items = [
    {
      labelKey: "dashboard",
      href: `/${slug}`,
      icon: LayoutDashboard,
      exact: true,
      minRole: "employee" as MemberRole,
    },
    {
      labelKey: "myTasks",
      href: `/${slug}/minha-area`,
      icon: UserCircle2,
      exact: false,
      minRole: "employee" as MemberRole,
    },
    {
      labelKey: "tasks",
      href: `/${slug}/tasks`,
      icon: ClipboardList,
      exact: false,
      minRole: "employee" as MemberRole,
    },
    {
      labelKey: "calendar",
      href: `/${slug}/calendar`,
      icon: CalendarDays,
      exact: false,
      minRole: "employee" as MemberRole,
    },
  ].filter((item) => {
    const roleOrder: MemberRole[] = ["employee", "supervisor", "admin"];
    return roleOrder.indexOf(role) >= roleOrder.indexOf(item.minRole);
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm safe-area-pb lg:hidden">
      <div className="flex items-stretch">
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href) && pathname !== `/${slug}`;
          const isExactActive = item.exact && pathname === item.href;
          const active = isExactActive || (!item.exact && isActive);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 text-center transition-colors min-h-[56px]",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon
                className={cn("size-5 shrink-0", active && "fill-primary/10")}
              />
              <span className="text-[10px] font-medium leading-tight truncate max-w-full">
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
