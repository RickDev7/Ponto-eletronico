import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { ThemeSwitcherDropdown } from "@/components/theme/theme-switcher-dropdown";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  children: React.ReactNode;
  /** Hide brand panel (e.g. narrow onboarding step). */
  minimal?: boolean;
  className?: string;
}

/**
 * Unified authentication layout — 60% brand preview / 40% form panel.
 * Visual standard for login, register, reset, and onboarding flows.
 */
export function AuthShell({ children, minimal = false, className }: AuthShellProps) {
  return (
    <div className={cn("flex min-h-svh w-full bg-background", className)}>
      {!minimal && <AuthBrandPanel />}

      <div
        className={cn(
          "relative flex flex-1 flex-col",
          minimal ? "w-full" : "lg:w-[40%]",
        )}
      >
        <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
          <ThemeSwitcherDropdown variant="outline" size="icon" />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 sm:px-10 lg:px-12">
          <div className="mb-8 w-full max-w-[420px] lg:hidden">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              FeldOps
            </Link>
          </div>

          <div className="w-full max-w-[420px]">{children}</div>
        </div>

        <p className="pb-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} FeldOps
        </p>
      </div>
    </div>
  );
}
