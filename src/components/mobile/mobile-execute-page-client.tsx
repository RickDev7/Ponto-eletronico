"use client";

import { useEffect, useMemo, useState } from "react";
import { FieldExecutionView } from "@/components/features/field-execution/field-execution-view";
import type { ExecutionContext } from "@/lib/field-execution/field-execution-types";
import { loadOfflineCache, offlineCacheKey, saveOfflineCache } from "@/lib/pwa/offline-cache";
import { getPendingOfflineSession, listPendingChecklistToggles } from "@/lib/pwa/offline-queue";

interface MobileExecutePageClientProps {
  slug: string;
  taskId: string;
  initialExecution: ExecutionContext | null;
}

export function MobileExecutePageClient({
  slug,
  taskId,
  initialExecution,
}: MobileExecutePageClientProps) {
  const [context, setContext] = useState<ExecutionContext | null>(initialExecution);
  const cacheKey = offlineCacheKey("execution", slug, taskId);

  useEffect(() => {
    if (initialExecution) {
      setContext(initialExecution);
      if (navigator.onLine) {
        void saveOfflineCache(cacheKey, initialExecution);
      }
      return;
    }

    void (async () => {
      const cached = await loadOfflineCache<ExecutionContext>(cacheKey);
      if (cached) {
        setContext(cached);
        return;
      }

      const pending = await getPendingOfflineSession(slug, taskId);
      if (pending) {
        const base = await loadOfflineCache<ExecutionContext>(cacheKey);
        if (base) {
          setContext({
            ...base,
            openCheckIn: {
              id: `offline:${pending.localSessionKey}`,
              check_in_at: pending.checkInAt,
              check_in_notes: null,
            },
          });
        }
      }
    })();
  }, [initialExecution, cacheKey, slug, taskId]);

  const mergedContext = useMemo(() => {
    if (!context) return null;
    return context;
  }, [context]);

  const [checklistOverrides, setChecklistOverrides] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    void listPendingChecklistToggles(slug, taskId).then(setChecklistOverrides);
    const onChange = () => void listPendingChecklistToggles(slug, taskId).then(setChecklistOverrides);
    window.addEventListener("offline-queue-changed", onChange);
    return () => window.removeEventListener("offline-queue-changed", onChange);
  }, [slug, taskId]);

  const executionWithOverrides = useMemo(() => {
    if (!mergedContext) return null;
    if (checklistOverrides.size === 0) return mergedContext;
    return {
      ...mergedContext,
      checklist: mergedContext.checklist.map((item) =>
        checklistOverrides.has(item.id)
          ? { ...item, is_checked: checklistOverrides.get(item.id)! }
          : item,
      ),
    };
  }, [mergedContext, checklistOverrides]);

  if (!executionWithOverrides?.openCheckIn) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {navigator.onLine
            ? "Check-in necessário para executar este serviço."
            : "Sem dados offline. Visite esta página com ligação antes de ficar offline."}
        </p>
      </div>
    );
  }

  const openCheckIn = executionWithOverrides.openCheckIn;
  const isOfflineSession = openCheckIn.id.startsWith("offline:");
  const localSessionKey = isOfflineSession ? openCheckIn.id.replace("offline:", "") : undefined;

  return (
    <div className="p-4">
      <FieldExecutionView
        slug={slug}
        taskId={taskId}
        context={executionWithOverrides}
        variant="mobile"
        mode="execute"
        offlineSupport={{
          enabled: true,
          checkInId: isOfflineSession ? undefined : openCheckIn.id,
          localSessionKey,
        }}
      />
    </div>
  );
}
