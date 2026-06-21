"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { LogOut, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/actions/auth";
import { ROUTES } from "@/config/constants";
import type { CompanyContext } from "@/types/database";
import { Button } from "@/components/ui/button";

interface MobileEmployeeShellProps {
  ctx: CompanyContext;
  companySlug: string;
  children: React.ReactNode;
}

export function MobileEmployeeShell({
  ctx,
  children,
}: MobileEmployeeShellProps) {
  const tNav = useTranslations("navigation");
  const tAuth = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const router = useRouter();

  async function handleSignOut() {
    const id = toast.loading(tAuth("signingOut"));
    const result = await signOut();
    toast.dismiss(id);
    if (!result.success) {
      toast.error(tErrors("signOutFailed"));
      return;
    }
    router.push(ROUTES.login);
    router.refresh();
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Smartphone className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{ctx.company.name}</p>
            <p className="text-[10px] text-muted-foreground">{tNav("myTasks")}</p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" className="size-8" onClick={handleSignOut}>
          <LogOut className="size-4" />
          <span className="sr-only">{tAuth("signOut")}</span>
        </Button>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
