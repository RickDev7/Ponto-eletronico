"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Sparkles, X } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { detectDomainFromPath } from "@/lib/ai/capabilities";
import { hasMinRole } from "@/types/enums";
import type { MemberRole } from "@/types";
import { AiDomainWidget } from "@/components/features/ai/ai-domain-widget";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AiAssistantDockProps {
  slug: string;
  role: MemberRole;
}

export function AiAssistantDock({ slug, role }: AiAssistantDockProps) {
  const t = useTranslations("aiAssistant");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (!hasMinRole(role, "supervisor")) return null;
  if (pathname.includes("/portal") || pathname.includes("/assistant")) return null;

  const domain = detectDomainFromPath(pathname);

  return (
    <>
      <Button
        type="button"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-20 right-4 z-50 size-12 rounded-full shadow-lg lg:bottom-6",
          "bg-violet-600 text-white hover:bg-violet-700",
        )}
        aria-label={t("dock.open")}
      >
        {open ? <X className="size-5" /> : <Sparkles className="size-5" />}
      </Button>

      {open && (
        <div className="fixed bottom-36 right-4 z-50 w-[min(100vw-2rem,400px)] rounded-xl border border-border bg-background shadow-2xl lg:bottom-20">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">{t("dock.title")}</p>
            <Link
              href={ROUTES.assistant(slug)}
              className="text-[11px] text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              {t("dock.fullPage")}
            </Link>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-3">
            <AiDomainWidget slug={slug} domain={domain} compact />
          </div>
        </div>
      )}
    </>
  );
}
