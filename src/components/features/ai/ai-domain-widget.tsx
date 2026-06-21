"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  BarChart3,
  Calculator,
  Calendar,
  Clock,
  FileText,
  Loader2,
  Sparkles,
  Users,
} from "lucide-react";
import { runAiCapabilityAction } from "@/actions/ai/actions";
import {
  detectDomainFromPath,
  getCapabilitiesForDomain,
  type AiCapabilityDef,
} from "@/lib/ai/capabilities";
import type { AiCapability, AiDomain, AiRunResult } from "@/lib/ai/types";
import type { MemberRole } from "@/types";
import { hasMinRole } from "@/types/enums";
import { AiResultPanel } from "@/components/features/ai/ai-result-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ICON_MAP = {
  calendar: Calendar,
  users: Users,
  calculator: Calculator,
  clock: Clock,
  "file-text": FileText,
  "bar-chart": BarChart3,
  sparkles: Sparkles,
};

interface AiDomainWidgetProps {
  slug: string;
  domain?: AiDomain;
  compact?: boolean;
  className?: string;
  role?: MemberRole;
}

export function AiDomainWidget({
  slug,
  domain: domainProp,
  compact = false,
  className,
  role,
}: AiDomainWidgetProps) {
  const t = useTranslations("aiAssistant");

  if (role && !hasMinRole(role, "supervisor")) return null;
  const pathname = usePathname();
  const domain = domainProp ?? detectDomainFromPath(pathname);
  const capabilities = getCapabilitiesForDomain(domain);
  const [activeCapability, setActiveCapability] = useState<AiCapability | null>(null);
  const [result, setResult] = useState<AiRunResult | null>(null);
  const [pending, startTransition] = useTransition();

  function runCapability(capability: AiCapability) {
    setActiveCapability(capability);
    startTransition(async () => {
      const response = await runAiCapabilityAction(slug, { capability, domain });
      if (!response.success) {
        toast.error(response.error);
        return;
      }
      setResult(response.data);
    });
  }

  function copyContent() {
    if (!result?.result.generatedContent) return;
    void navigator.clipboard.writeText(result.result.generatedContent);
    toast.success(t("result.copied"));
  }

  const displayCapabilities = compact ? capabilities.slice(0, 3) : capabilities;

  return (
    <div
      className={cn(
        "rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent p-4",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10">
          <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <p className="text-sm font-semibold">{t("widget.title")}</p>
          <p className="text-[11px] text-muted-foreground">{t(`domains.${domain}`)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {displayCapabilities.map((cap) => (
          <CapabilityChip
            key={cap.id}
            cap={cap}
            active={activeCapability === cap.id && pending}
            disabled={pending}
            onClick={() => runCapability(cap.id)}
          />
        ))}
      </div>

      {pending && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t("widget.analyzing")}
        </div>
      )}

      {result && !pending && (
        <div className="mt-4 border-t border-border/40 pt-4">
          <AiResultPanel
            result={result.result}
            provider={result.provider}
            onCopyContent={result.result.generatedContent ? copyContent : undefined}
          />
        </div>
      )}
    </div>
  );
}

function CapabilityChip({
  cap,
  active,
  disabled,
  onClick,
}: {
  cap: AiCapabilityDef;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("aiAssistant");
  const Icon = ICON_MAP[cap.icon] ?? Sparkles;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-8 gap-1.5 border-violet-500/20 text-xs hover:bg-violet-500/10",
        active && "border-violet-500/40 bg-violet-500/10",
      )}
    >
      {active ? <Loader2 className="size-3 animate-spin" /> : <Icon className="size-3" />}
      {t(cap.labelKey as never)}
    </Button>
  );
}
