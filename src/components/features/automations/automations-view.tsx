"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Mail,
  MessageCircle,
  Smartphone,
  Bell,
  Zap,
} from "lucide-react";
import type { AutomationsPageData } from "@/lib/automations/load-automations-data";
import type { AutomationRuleRow } from "@/lib/automations/types";
import { AUTOMATION_EXAMPLES, getActionDef, getTriggerDef } from "@/lib/automations/catalog";
import { AutomationExampleFlow } from "@/components/features/automations/automation-workflow-pipeline";
import { AutomationRuleCard } from "@/components/features/automations/automation-rule-card";
import { AutomationRunsPanel } from "@/components/features/automations/automation-runs-panel";
import { AutomationFormDialog } from "@/components/features/automations/automation-form-dialog";
import {
  KpiCard,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { seedExampleAutomationsAction } from "@/actions/automations/actions";
import { useRouter } from "@/i18n/navigation";
import { listChannelAdapters } from "@/lib/automations/channels";
import { AiDomainWidget } from "@/components/features/ai/ai-domain-widget";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const CHANNEL_ICONS = {
  email: Mail,
  whatsapp: MessageCircle,
  sms: Smartphone,
  push: Bell,
} as const;

interface AutomationsViewProps {
  slug: string;
  data: AutomationsPageData;
  canWrite: boolean;
}

export function AutomationsView({ slug, data, canWrite }: AutomationsViewProps) {
  const t = useTranslations("automations");
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRule, setEditRule] = useState<AutomationRuleRow | null>(null);
  const [pending, startTransition] = useTransition();

  const channelStatus = useMemo(() => listChannelAdapters(), []);

  function openCreate() {
    setEditRule(null);
    setDialogOpen(true);
  }

  function openEdit(rule: AutomationRuleRow) {
    setEditRule(rule);
    setDialogOpen(true);
  }

  function handleSeedExamples() {
    startTransition(async () => {
      const result = await seedExampleAutomationsAction(slug);
      if (!result.success) {
        if (result.error === "already_seeded") toast.info(t("toasts.alreadySeeded"));
        else toast.error(result.error);
        return;
      }
      toast.success(t("toasts.seeded", { count: result.data.count }));
      router.refresh();
    });
  }

  return (
    <OperationsPage>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          canWrite ? (
            <div className="flex gap-2">
              {data.rules.length === 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={pending}
                  onClick={handleSeedExamples}
                >
                  {t("actions.loadExamples")}
                </Button>
              )}
              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openCreate}>
                <Zap className="size-3.5" />
                {t("actions.new")}
              </Button>
            </div>
          ) : undefined
        }
      />

      <AiDomainWidget slug={slug} domain="automations" compact className="mb-4" />

      <OperationsWorkspace>
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="mb-6 grid gap-3 sm:grid-cols-3"
        >
          <KpiCard label={t("kpi.activeRules")} value={data.stats.activeRules} variant="strip" />
          <KpiCard label={t("kpi.runsToday")} value={data.stats.runsToday} variant="strip" />
          <KpiCard label={t("kpi.queued")} value={data.stats.queuedDeliveries} variant="strip" />
        </motion.div>

        <div className="mb-6 rounded-xl border border-border/60 bg-card p-4">
          <h3 className="mb-1 text-sm font-semibold">{t("channels.title")}</h3>
          <p className="mb-3 text-xs text-muted-foreground">{t("channels.hint")}</p>
          <div className="flex flex-wrap gap-2">
            {channelStatus.map((adapter) => {
              const Icon = CHANNEL_ICONS[adapter.channel as keyof typeof CHANNEL_ICONS] ?? Bell;
              const configured = adapter.isConfigured();
              return (
                <span
                  key={adapter.channel}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] ${
                    configured
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                      : "border-border/60 text-muted-foreground"
                  }`}
                >
                  <Icon className="size-3" />
                  {t(`channels.${adapter.channel}`)}
                  <span className="opacity-60">
                    · {configured ? t("channels.ready") : t("channels.pending")}
                  </span>
                </span>
              );
            })}
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          {AUTOMATION_EXAMPLES.map((ex) => {
            const tr = getTriggerDef(ex.trigger);
            const ac = getActionDef(ex.action);
            return (
            <div
              key={ex.key}
              className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-3"
            >
              <AutomationExampleFlow
                triggerDef={tr}
                actionDef={ac}
                exampleKey={ex.key}
              />
            </div>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-3">
            <h3 className="text-sm font-semibold">{t("rules.title")}</h3>
            {data.rules.length === 0 ? (
              <div className="rounded-xl border border-border/60 p-8 text-center text-sm text-muted-foreground">
                {t("rules.empty")}
              </div>
            ) : (
              data.rules.map((rule) => (
                <AutomationRuleCard
                  key={rule.id}
                  slug={slug}
                  rule={rule}
                  canWrite={canWrite}
                  onEdit={() => openEdit(rule)}
                />
              ))
            )}
          </div>

          <div className="lg:col-span-5">
            <AutomationRunsPanel runs={data.runs} deliveries={data.deliveries} />
          </div>
        </div>
      </OperationsWorkspace>

      {canWrite && (
        <AutomationFormDialog
          slug={slug}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          rule={editRule}
          onSuccess={() => router.refresh()}
        />
      )}
    </OperationsPage>
  );
}
