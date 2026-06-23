"use client";

import { Link } from "@/i18n/navigation";
import { Bell, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppAvatar } from "./primitives";

export function AppGreetingHeader({
  greeting,
  name,
  avatarUrl,
  notificationCount = 0,
  notificationsHref,
  className,
}: {
  greeting: string;
  name: string;
  avatarUrl?: string | null;
  notificationCount?: number;
  notificationsHref?: string;
  className?: string;
}) {
  return (
    <header className={cn("flex items-center justify-between gap-4", className)}>
      <div className="flex min-w-0 items-center gap-3">
        <AppAvatar name={name} src={avatarUrl} size="md" />
        <div className="min-w-0">
          <p className="text-sm text-[var(--mobile-secondary)]">{greeting}</p>
          <h1 className="truncate text-xl font-bold text-[var(--mobile-text)]">{name}</h1>
        </div>
      </div>
      {notificationsHref && (
        <Link
          href={notificationsHref}
          className="mobile-pressable mobile-touch-target relative flex size-11 items-center justify-center rounded-full bg-[var(--mobile-card)] shadow-[var(--mobile-shadow-card)]"
          aria-label="Notifications"
        >
          <Bell className="size-5 text-[var(--mobile-text)]" strokeWidth={1.75} />
          {notificationCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-[var(--mobile-danger)] text-[10px] font-bold text-white">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </Link>
      )}
    </header>
  );
}

export function AppDarkHeader({
  title,
  subtitle,
  backHref,
  progress,
  total,
  className,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  progress?: number;
  total?: number;
  className?: string;
}) {
  const pct = progress && total ? Math.round((progress / total) * 100) : 0;
  return (
    <div
      className={cn(
        "-mx-[var(--mobile-page-px)] mb-2 bg-[var(--mobile-dark)] px-[var(--mobile-page-px)] pb-6 pt-3 text-[var(--mobile-darkHeaderText,#f8fafc)] safe-area-pt",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="mobile-pressable flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10"
          >
            <ChevronLeft className="size-5" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-sm text-white/70">{subtitle}</p>}
        </div>
      </div>
      {progress != null && total != null && (
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-xs text-white/60">
            <span>Progresso</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-[var(--mobile-primary)] transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function AppPageHeader({
  title,
  subtitle,
  backHref,
  className,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      {backHref && (
        <Link
          href={backHref}
          className="mobile-pressable flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--mobile-card)] shadow-[var(--mobile-shadow-card)]"
        >
          <ChevronLeft className="size-5 text-[var(--mobile-text)]" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold text-[var(--mobile-text)]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-[var(--mobile-secondary)]">{subtitle}</p>}
      </div>
    </div>
  );
}

export function AppFloatingNav({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
        className,
      )}
      aria-label="Main navigation"
    >
      <div
        className="pointer-events-auto flex w-full max-w-md items-stretch rounded-[var(--mobile-radius-nav)] border border-[var(--mobile-border)]/80 bg-[var(--mobile-card)]/95 px-1 py-1.5 shadow-[var(--mobile-shadow-nav)] backdrop-blur-xl"
      >
        {children}
      </div>
    </nav>
  );
}

export function AppNavItem({
  href,
  active,
  icon: Icon,
  label,
  badge,
}: {
  href: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? "page" : undefined}
      className={cn(
        "mobile-pressable relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[calc(var(--mobile-radius-nav)-8px)] py-2 transition-colors",
        active
          ? "bg-[var(--mobile-primary)]/10 text-[var(--mobile-primary)]"
          : "text-[var(--mobile-secondary)]",
      )}
    >
      <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
      {badge != null && badge > 0 && (
        <span className="absolute right-[calc(50%-20px)] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--mobile-danger)] px-1 text-[9px] font-bold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </Link>
  );
}
