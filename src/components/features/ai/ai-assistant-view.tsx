"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Send, Sparkles } from "lucide-react";
import { askAiAssistantAction, runAiCapabilityAction } from "@/actions/ai/actions";
import { AI_CAPABILITIES } from "@/lib/ai/capabilities";
import type { AiCapability, AiDomain, AiRunResult } from "@/lib/ai/types";
import { AiDomainWidget } from "@/components/features/ai/ai-domain-widget";
import { AiResultPanel } from "@/components/features/ai/ai-result-panel";
import {
  KpiCard,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface AiInsightRow {
  id: string;
  domain: string;
  capability: string;
  provider: string;
  created_at: string;
  result: { summary?: string };
}

interface AiAssistantViewProps {
  slug: string;
  aiConfigured: boolean;
  recentInsights: AiInsightRow[];
}

export function AiAssistantView({
  slug,
  aiConfigured,
  recentInsights,
}: AiAssistantViewProps) {
  const t = useTranslations("aiAssistant");
  const [message, setMessage] = useState("");
  const [chatResult, setChatResult] = useState<AiRunResult | null>(null);
  const [pending, startTransition] = useTransition();

  function handleChat(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    startTransition(async () => {
      const response = await askAiAssistantAction(slug, {
        message: message.trim(),
        domain: "general",
      });
      if (!response.success) {
        toast.error(response.error);
        return;
      }
      setChatResult(response.data);
      setMessage("");
    });
  }

  function runQuick(capability: AiCapability) {
    startTransition(async () => {
      const response = await runAiCapabilityAction(slug, {
        capability,
        domain: "general",
      });
      if (!response.success) {
        toast.error(response.error);
        return;
      }
      setChatResult(response.data);
    });
  }

  return (
    <OperationsPage>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Badge variant={aiConfigured ? "default" : "secondary"} className="text-[10px]">
            {aiConfigured ? t("provider.aiActive") : t("provider.rulesActive")}
          </Badge>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <KpiCard label={t("kpi.capabilities")} value={String(AI_CAPABILITIES.length)} icon={Sparkles} />
        <KpiCard
          label={t("kpi.domains")}
          value="8"
          icon={Sparkles}
        />
        <KpiCard
          label={t("kpi.insights")}
          value={String(recentInsights.length)}
          icon={Sparkles}
        />
      </div>

      <OperationsWorkspace>
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <p className="mb-3 text-sm font-semibold">{t("chat.title")}</p>
              <form onSubmit={handleChat} className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("chat.placeholder")}
                  disabled={pending}
                  className="h-9"
                />
                <Button type="submit" size="sm" disabled={pending || !message.trim()}>
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </form>
              <p className="mt-2 text-[11px] text-muted-foreground">{t("chat.hint")}</p>
            </div>

            {chatResult && (
              <div className="rounded-xl border border-border/60 bg-card p-4">
                <AiResultPanel
                  result={chatResult.result}
                  provider={chatResult.provider}
                  onCopyContent={
                    chatResult.result.generatedContent
                      ? () => {
                          void navigator.clipboard.writeText(
                            chatResult.result.generatedContent!,
                          );
                          toast.success(t("result.copied"));
                        }
                      : undefined
                  }
                />
              </div>
            )}

            <div>
              <p className="mb-3 text-sm font-semibold">{t("quickActions")}</p>
              <div className="flex flex-wrap gap-2">
                {AI_CAPABILITIES.map((cap) => (
                  <Button
                    key={cap.id}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={pending}
                    onClick={() => runQuick(cap.id)}
                  >
                    {t(cap.labelKey as never)}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <AiDomainWidget slug={slug} domain="general" />

            <div className="rounded-xl border border-border/60 bg-card p-4">
              <p className="mb-3 text-sm font-semibold">{t("history.title")}</p>
              {recentInsights.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("history.empty")}</p>
              ) : (
                <ul className="space-y-2">
                  {recentInsights.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-lg border border-border/40 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{row.capability}</span>
                        <span className="text-muted-foreground">
                          {new Date(row.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-muted-foreground">
                        {row.result?.summary ?? "—"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </OperationsWorkspace>
    </OperationsPage>
  );
}
