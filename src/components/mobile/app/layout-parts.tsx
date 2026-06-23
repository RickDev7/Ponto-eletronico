"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function AppSegmentTabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string; badge?: number }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-1 rounded-[var(--mobile-radius-card)] bg-[var(--mobile-muted)] p-1",
        className,
      )}
      role="tablist"
    >
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          role="tab"
          aria-selected={value === opt.key}
          onClick={() => onChange(opt.key)}
          className={cn(
            "mobile-pressable relative flex-1 rounded-[calc(var(--mobile-radius-card)-4px)] py-2.5 text-sm font-medium transition-all",
            value === opt.key
              ? "bg-[var(--mobile-card)] text-[var(--mobile-text)] shadow-sm"
              : "text-[var(--mobile-secondary)]",
          )}
        >
          {opt.label}
          {opt.badge != null && opt.badge > 0 && (
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--mobile-danger)] px-1 text-[9px] font-bold text-white">
              {opt.badge > 9 ? "9+" : opt.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function AppFilterPills<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-1 scrollbar-none", className)}>
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={cn(
            "mobile-pressable shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
            value === opt.key
              ? "bg-[var(--mobile-primary)] text-white"
              : "bg-[var(--mobile-card)] text-[var(--mobile-secondary)] border border-[var(--mobile-border)]",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function AppTimeline({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative space-y-0 pl-6", className)}>
      <div
        className="absolute bottom-2 left-[11px] top-2 w-0.5 bg-[var(--mobile-border)]"
        aria-hidden
      />
      {children}
    </div>
  );
}

export function AppTimelineItem({
  time,
  title,
  subtitle,
  meta,
  statusColor = "bg-[var(--mobile-primary)]",
  href,
  onClick,
  actions,
  className,
}: {
  time: string;
  title: string;
  subtitle?: string;
  meta?: string;
  statusColor?: string;
  href?: string;
  onClick?: () => void;
  actions?: React.ReactNode;
  className?: string;
}) {
  const content = (
    <>
      <div className="mb-3 flex items-center gap-2">
        <span
          className={cn("absolute -left-6 top-1 size-[10px] rounded-full ring-4 ring-[var(--mobile-bg)]", statusColor)}
        />
        <span className="text-xs font-semibold text-[var(--mobile-primary)]">{time}</span>
        {meta && (
          <span className="text-xs text-[var(--mobile-secondary)]">· {meta}</span>
        )}
      </div>
      <div className="mobile-card p-4">
        <p className="font-semibold text-[var(--mobile-text)]">{title}</p>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--mobile-secondary)]">{subtitle}</p>
        )}
        {actions && <div className="mt-3">{actions}</div>}
      </div>
    </>
  );

  if (href) {
    return (
      <div className={cn("relative pb-6", className)}>
        <Link href={href} className="mobile-pressable block text-left">
          {content}
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("relative pb-6", className)}>
      {onClick ? (
        <button type="button" onClick={onClick} className="w-full text-left mobile-pressable">
          {content}
        </button>
      ) : (
        content
      )}
    </div>
  );
}
