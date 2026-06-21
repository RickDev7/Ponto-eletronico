import type { CommercialWorkflowStage } from "@/lib/commercial/commercial-types";

interface StageInput {
  leadStatus: string;
  convertedClientId: string | null;
  quoteStatus: string | null;
  quoteId: string | null;
  contractId: string | null;
}

/** Resolve the current workflow stage from existing entity state (no duplicate deal table). */
export function resolveCommercialStage(input: StageInput): CommercialWorkflowStage {
  if (input.convertedClientId || input.leadStatus === "won") {
    return "client";
  }
  if (input.contractId) {
    return "contract";
  }
  if (
    input.quoteStatus === "under_review" ||
    input.leadStatus === "negotiation" ||
    input.quoteStatus === "sent"
  ) {
    return "approval";
  }
  if (
    input.quoteId ||
    input.leadStatus === "proposal_sent" ||
    (input.quoteStatus && !["draft", "rejected", "expired"].includes(input.quoteStatus))
  ) {
    return "quote";
  }
  if (input.leadStatus === "qualified") {
    return "qualification";
  }
  return "lead";
}

export const STAGE_ACCENT: Record<CommercialWorkflowStage, string> = {
  lead: "border-t-blue-500",
  qualification: "border-t-violet-500",
  quote: "border-t-amber-500",
  approval: "border-t-orange-500",
  contract: "border-t-indigo-500",
  client: "border-t-emerald-500",
};

export const STAGE_DOT: Record<CommercialWorkflowStage, string> = {
  lead: "bg-blue-500",
  qualification: "bg-violet-500",
  quote: "bg-amber-500",
  approval: "bg-orange-500",
  contract: "bg-indigo-500",
  client: "bg-emerald-500",
};

/** Next stage in the funnel (for CTA hints). */
export function nextWorkflowStage(stage: CommercialWorkflowStage): CommercialWorkflowStage | null {
  const idx = ["lead", "qualification", "quote", "approval", "contract", "client"].indexOf(stage);
  if (idx < 0 || idx >= 5) return null;
  return ["lead", "qualification", "quote", "approval", "contract", "client"][idx + 1] as CommercialWorkflowStage;
}
