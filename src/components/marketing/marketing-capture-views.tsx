"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { AiResultPanel } from "@/components/features/ai/ai-result-panel";
import { KpiCard, OperationsPage, OperationsWorkspace, PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AiRunResult } from "@/lib/ai/types";

const DEMO_CHAT_RESULT: AiRunResult = {
  provider: "rules",
  result: {
    summary:
      "Amanhã tem 3 equipas disponíveis: Norte A (4 técnicos), Centro B (3 técnicos) e Sul C (2 técnicos). A Equipa Norte A tem a menor carga da semana (78%). Recomendo atribuir a visita do Hospital Regional à Equipa Centro B.",
    generatedContent: undefined,
    highlights: [
      { label: "Equipas disponíveis", value: "3" },
      { label: "Cobertura recomendada", value: "Centro B" },
      { label: "Visitas pendentes", value: "5" },
    ],
  },
};

export function MarketingAiCapture() {
  const t = useTranslations("aiAssistant");

  return (
    <OperationsPage>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Badge variant="default" className="text-[10px]">
            {t("provider.aiActive")}
          </Badge>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <KpiCard label={t("kpi.capabilities")} value="12" icon={Sparkles} />
        <KpiCard label={t("kpi.domains")} value="8" icon={Sparkles} />
        <KpiCard label={t("kpi.insights")} value="24" icon={Sparkles} />
      </div>

      <OperationsWorkspace>
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <p className="mb-3 text-sm font-semibold">{t("chat.title")}</p>
              <div className="mb-4 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                Quais equipas estão disponíveis amanhã para o Hospital Regional?
              </div>
              <div className="flex gap-2">
                <Input
                  value="Sugerir escala para a visita das 14h"
                  readOnly
                  className="h-9 bg-background"
                />
                <Button type="button" size="sm" className="pointer-events-none">
                  {t("chat.send")}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-4">
              <AiResultPanel result={DEMO_CHAT_RESULT.result} provider={DEMO_CHAT_RESULT.provider} />
            </div>
          </div>

          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                <Sparkles className="size-4" />
                Assistente FeldOps
              </p>
              <p className="text-sm text-muted-foreground">
                Pergunte sobre escalas, visitas, faturação ou métricas operacionais.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-4">
              <p className="mb-3 text-sm font-semibold">{t("history.title")}</p>
              <ul className="space-y-2">
                {[
                  "Resumo semanal de operações",
                  "Faturas em atraso — Q2",
                  "Cobertura de escalas — Junho",
                ].map((item) => (
                  <li
                    key={item}
                    className="rounded-lg border border-border/40 px-3 py-2 text-xs text-muted-foreground"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </OperationsWorkspace>
    </OperationsPage>
  );
}
