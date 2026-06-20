import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps extends Omit<React.ComponentProps<"header">, "title"> {
  children?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: HeaderBreadcrumb[];
  leading?: React.ReactNode;
  center?: React.ReactNode;
  actions?: React.ReactNode;
}

export interface HeaderBreadcrumb {
  label: string;
  href?: string;
}

function HeaderBreadcrumbs({ items }: { items: HeaderBreadcrumb[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
            {index > 0 && (
              <ChevronRight
                className="size-3.5 shrink-0 text-muted-foreground/50"
                aria-hidden
              />
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="truncate text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  "truncate text-xs",
                  isLast
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function Header({
  children,
  title,
  description,
  breadcrumbs,
  leading,
  center,
  actions,
  className,
  ...props
}: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-9 shrink-0 items-center gap-2 border-b border-border",
        "bg-background px-3 sm:px-4",
        className,
      )}
      {...props}
    >
      {children ?? (
        <>
          <HeaderLeading>{leading}</HeaderLeading>

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <HeaderBreadcrumbs items={breadcrumbs} />
            )}
            {title && (
              <HeaderTitle description={description}>{title}</HeaderTitle>
            )}
            {!title && description && (
              <p className="truncate text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          {center && <HeaderCenter>{center}</HeaderCenter>}

          {actions && <HeaderActions>{actions}</HeaderActions>}
        </>
      )}
    </header>
  );
}

function HeaderLeading({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;

  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      {children}
    </div>
  );
}

function HeaderTitle({
  children,
  description,
  className,
}: {
  children: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
        {children}
      </h1>
      {description && (
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

function HeaderCenter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "hidden min-w-0 flex-1 items-center justify-center sm:flex",
        className,
      )}
    >
      {children}
    </div>
  );
}

function HeaderActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 items-center gap-1", className)}>
      {children}
    </div>
  );
}

export {
  HeaderLeading,
  HeaderTitle,
  HeaderCenter,
  HeaderActions,
  HeaderBreadcrumbs,
};
