import { cn } from "@/lib/utils";

interface AppShellContentProps {
  children: React.ReactNode;
  className?: string;
  padBottomNav?: boolean;
}

export function AppShellContent({
  children,
  className,
  padBottomNav = true,
}: AppShellContentProps) {
  return (
    <main
      className={cn(
        "relative flex-1 overflow-y-auto overscroll-contain bg-[#0A0A0A]",
        padBottomNav && "pb-16 lg:pb-0",
        className,
      )}
    >
      <div className="relative min-h-full">{children}</div>
    </main>
  );
}

/** Page content wrapper — Stripe-style full-width operational density. */
export function AppShellPage({
  children,
  className,
  size = "fluid",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "wide" | "fluid" | "full";
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-3 py-2 lg:px-5 lg:py-2",
        size === "default" && "max-w-5xl",
        size === "wide" && "max-w-6xl",
        size === "fluid" && "max-w-none",
        size === "full" && "max-w-none px-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
