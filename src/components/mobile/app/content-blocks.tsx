"use client";

import { Link } from "@/i18n/navigation";
import type { LucideIcon } from "lucide-react";
import { MapPin, Navigation, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppBadge, AppCard } from "./primitives";

export function AppNextServiceHero({
  clientName,
  address,
  serviceType,
  timeRange,
  duration,
  priority,
  priorityLabel,
  ctaLabel,
  ctaHref,
  className,
}: {
  clientName: string;
  address?: string;
  serviceType?: string;
  timeRange: string;
  duration?: string;
  priority?: "high" | "normal" | "low";
  priorityLabel?: string;
  ctaLabel: string;
  ctaHref: string;
  className?: string;
}) {
  const priorityVariant =
    priority === "high" ? "danger" : priority === "low" ? "default" : "warning";

  return (
    <AppCard className={cn("relative overflow-hidden p-0", className)}>
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--mobile-primary)] to-[#8B5CF6]" />
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--mobile-primary)]">
              Próximo serviço
            </p>
            <h2 className="mt-1 text-xl font-bold text-[var(--mobile-text)]">{clientName}</h2>
          </div>
          {priorityLabel && (
            <AppBadge variant={priorityVariant}>{priorityLabel}</AppBadge>
          )}
        </div>

        {address && (
          <p className="flex items-start gap-2 text-sm text-[var(--mobile-secondary)]">
            <MapPin className="mt-0.5 size-4 shrink-0" />
            {address}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {serviceType && (
            <span className="rounded-full bg-[var(--mobile-muted)] px-3 py-1 text-xs font-medium text-[var(--mobile-text)]">
              {serviceType}
            </span>
          )}
          <span className="rounded-full bg-[var(--mobile-primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--mobile-primary)]">
            {timeRange}
          </span>
          {duration && (
            <span className="rounded-full bg-[var(--mobile-muted)] px-3 py-1 text-xs font-medium text-[var(--mobile-secondary)]">
              {duration}
            </span>
          )}
        </div>

        <Link
          href={ctaHref}
          className="mobile-pressable mobile-touch-target flex h-[52px] w-full items-center justify-center gap-2 rounded-[var(--mobile-radius-button)] bg-[var(--mobile-primary)] text-base font-semibold text-white shadow-sm transition-colors hover:bg-[var(--mobile-primary-hover)]"
        >
          <Play className="size-5 fill-current" />
          {ctaLabel}
        </Link>
      </div>
    </AppCard>
  );
}

export function AppQuickActionGrid({
  actions,
  className,
}: {
  actions: { label: string; icon: LucideIcon; href: string; variant?: "primary" | "default" }[];
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-4 gap-3", className)}>
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className={cn(
            "mobile-pressable mobile-card flex flex-col items-center gap-2 p-3 text-center",
            action.variant === "primary" && "border-[var(--mobile-primary)]/20 bg-[var(--mobile-primary)]/5",
          )}
        >
          <div
            className={cn(
              "flex size-11 items-center justify-center rounded-[var(--mobile-radius-button)]",
              action.variant === "primary"
                ? "bg-[var(--mobile-primary)] text-white"
                : "bg-[var(--mobile-muted)] text-[var(--mobile-text)]",
            )}
          >
            <action.icon className="size-5" strokeWidth={1.75} />
          </div>
          <span className="text-[11px] font-medium leading-tight text-[var(--mobile-text)]">
            {action.label}
          </span>
        </Link>
      ))}
    </div>
  );
}

export function AppSummaryGrid({
  items,
  className,
}: {
  items: { label: string; value: string; icon?: LucideIcon }[];
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {items.map((item) => (
        <AppCard key={item.label} className="p-4">
          {item.icon && (
            <item.icon className="mb-2 size-5 text-[var(--mobile-primary)]" strokeWidth={1.75} />
          )}
          <p className="text-2xl font-bold text-[var(--mobile-text)]">{item.value}</p>
          <p className="mt-0.5 text-xs text-[var(--mobile-secondary)]">{item.label}</p>
        </AppCard>
      ))}
    </div>
  );
}

export function AppServiceCard({
  clientName,
  serviceType,
  timeRange,
  duration,
  address,
  statusLabel,
  statusVariant = "default",
  priorityLabel,
  href,
  mapsUrl,
  onStart,
  startLabel = "Iniciar",
  className,
}: {
  clientName: string;
  serviceType?: string;
  timeRange: string;
  duration?: string;
  address?: string;
  statusLabel: string;
  statusVariant?: "default" | "primary" | "success" | "warning" | "danger";
  priorityLabel?: string;
  href: string;
  mapsUrl?: string | null;
  onStart?: string;
  startLabel?: string;
  className?: string;
}) {
  return (
    <AppCard className={cn("p-0 overflow-hidden", className)}>
      <Link href={href} className="block p-5 mobile-pressable">
        <div className="flex gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-[var(--mobile-radius-button)] bg-gradient-to-br from-[var(--mobile-primary)] to-[#8B5CF6] text-sm font-bold text-white">
            {clientName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold text-[var(--mobile-text)]">{clientName}</h3>
              <AppBadge variant={statusVariant}>{statusLabel}</AppBadge>
            </div>
            {serviceType && (
              <p className="mt-0.5 text-sm text-[var(--mobile-secondary)]">{serviceType}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--mobile-secondary)]">
              <span className="font-medium text-[var(--mobile-primary)]">{timeRange}</span>
              {duration && <span>· {duration}</span>}
              {priorityLabel && <span>· {priorityLabel}</span>}
            </div>
            {address && (
              <p className="mt-2 truncate text-xs text-[var(--mobile-secondary)]">{address}</p>
            )}
          </div>
        </div>
      </Link>
      <div className="grid grid-cols-3 gap-2 border-t border-[var(--mobile-border)] p-3">
        <Link
          href={href}
          className="mobile-pressable flex h-10 items-center justify-center rounded-[var(--mobile-radius-button)] bg-[var(--mobile-muted)] text-xs font-medium"
        >
          Abrir
        </Link>
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mobile-pressable flex h-10 items-center justify-center gap-1 rounded-[var(--mobile-radius-button)] bg-[var(--mobile-muted)] text-xs font-medium"
          >
            <Navigation className="size-3.5" />
            Rota
          </a>
        ) : (
          <span />
        )}
        {onStart && (
          <Link
            href={onStart}
            className="mobile-pressable flex h-10 items-center justify-center gap-1 rounded-[var(--mobile-radius-button)] bg-[var(--mobile-primary)] text-xs font-semibold text-white"
          >
            <Play className="size-3.5" />
            {startLabel}
          </Link>
        )}
      </div>
    </AppCard>
  );
}