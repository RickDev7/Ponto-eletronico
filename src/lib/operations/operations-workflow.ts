import type { TraceableExecution } from "@/lib/operations/traceable-execution-types";

export const OPERATIONS_WORKFLOW_STAGES = [
  "contract",
  "property",
  "service",
  "execution",
] as const;

export type OperationsWorkflowStage = (typeof OPERATIONS_WORKFLOW_STAGES)[number];

export const WORKFLOW_STAGE_DOT: Record<OperationsWorkflowStage, string> = {
  contract: "bg-indigo-500",
  property: "bg-blue-500",
  service: "bg-violet-500",
  execution: "bg-emerald-500",
};

/** Traceability completeness for a single visit/execution. */
export function resolveTraceability(execution: TraceableExecution) {
  return {
    hasContract: Boolean(execution.contract_id),
    hasProperty: Boolean(execution.propertyId ?? execution.address),
    hasService: Boolean(execution.service_id || execution.serviceName || execution.service_type),
    hasExecution: ["in_progress", "completed"].includes(execution.status) || Boolean(execution.approved_at),
    isFullyTraceable:
      Boolean(execution.contract_id) &&
      Boolean(execution.propertyId ?? execution.address) &&
      Boolean(execution.service_id || execution.serviceName || execution.service_type),
  };
}

export function workflowStageCounts(executions: TraceableExecution[]) {
  const withContract = executions.filter((e) => e.contract_id).length;
  const withProperty = executions.filter((e) => e.propertyId ?? e.address).length;
  const withService = executions.filter(
    (e) => e.service_id || e.serviceName || e.service_type,
  ).length;
  const withExecution = executions.filter(
    (e) => e.status === "completed" || e.status === "in_progress" || e.approved_at,
  ).length;

  return {
    contract: withContract,
    property: withProperty,
    service: withService,
    execution: withExecution,
  };
}
