"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { getClientPortalNavEntries } from "@/config/client-portal-navigation";
import { cn } from "@/lib/utils";

interface ClientPortalBottomNavProps {
  slug: string;
}

export function ClientPortalBottomNav({ slug }: ClientPortalBottomNavProps) {
  const pathname = usePathname();
  const t = useTranslations("clientPortal.nav");
  const items = getClientPortalNavEntries(slug).slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm safe-area-pb lg:hidden">
      <div className="flex items-stretch">
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.path
            : pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2.5 text-center transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon
                className={cn("size-5 shrink-0", isActive && "fill-primary/10")}
              />
              <span className="text-[10px] font-medium leading-tight">
                {t(item.titleKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
