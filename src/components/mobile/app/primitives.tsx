import { cn } from "@/lib/utils";

export function AppScreen({
  children,
  className,
  immersive,
}: {
  children: React.ReactNode;
  className?: string;
  immersive?: boolean;
}) {
  return (
    <div
      className={cn(
        immersive ? "mobile-page-immersive" : "mobile-page",
        "mx-auto w-full max-w-md space-y-6 pt-4 safe-area-pt mobile-animate-in",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AppCard({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "mobile-card mobile-pressable w-full p-5 text-left",
        onClick && "cursor-pointer hover:shadow-md",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function AppBadge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "primary";
  className?: string;
}) {
  const variants = {
    default: "bg-[var(--mobile-muted)] text-[var(--mobile-secondary)]",
    primary: "bg-[var(--mobile-primary)]/10 text-[var(--mobile-primary)]",
    success: "bg-[var(--mobile-success)]/10 text-[var(--mobile-success)]",
    warning: "bg-[var(--mobile-warning)]/10 text-[var(--mobile-warning)]",
    danger: "bg-[var(--mobile-danger)]/10 text-[var(--mobile-danger)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AppButton({
  children,
  className,
  variant = "primary",
  size = "lg",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "md" | "lg";
}) {
  const variants = {
    primary:
      "bg-[var(--mobile-primary)] text-white hover:bg-[var(--mobile-primary-hover)] shadow-sm",
    secondary: "bg-[var(--mobile-muted)] text-[var(--mobile-text)] hover:bg-[var(--mobile-border)]",
    ghost: "bg-transparent text-[var(--mobile-secondary)] hover:bg-[var(--mobile-muted)]",
    danger: "bg-[var(--mobile-danger)] text-white hover:bg-[var(--mobile-danger)]/90",
    outline:
      "border border-[var(--mobile-border)] bg-[var(--mobile-card)] text-[var(--mobile-text)] hover:bg-[var(--mobile-muted)]",
  };
  const sizes = {
    md: "h-11 px-4 text-sm",
    lg: "h-[52px] px-6 text-base font-semibold",
  };
  return (
    <button
      type="button"
      className={cn(
        "mobile-pressable mobile-touch-target inline-flex w-full items-center justify-center gap-2 rounded-[var(--mobile-radius-button)] font-medium transition-colors disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function AppAvatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const sizes = { sm: "size-9 text-xs", md: "size-11 text-sm", lg: "size-16 text-lg" };
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className={cn("rounded-full object-cover ring-2 ring-white", sizes[size], className)}
    />
  ) : (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-[var(--mobile-primary)] font-semibold text-white ring-2 ring-white",
        sizes[size],
        className,
      )}
    >
      {initials}
    </div>
  );
}

export function AppSectionTitle({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h2 className="text-base font-semibold text-[var(--mobile-text)]">{title}</h2>
      {action}
    </div>
  );
}

export function AppSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--mobile-radius-card)] bg-[var(--mobile-border)]/60",
        className,
      )}
    />
  );
}
