/** Commercial workflow stages — single funnel from lead to client. */
export const COMMERCIAL_WORKFLOW_STAGES = [
  "lead",
  "qualification",
  "quote",
  "approval",
  "contract",
  "client",
] as const;

export type CommercialWorkflowStage = (typeof COMMERCIAL_WORKFLOW_STAGES)[number];

export interface CommercialDealRow {
  leadId: string;
  companyName: string;
  contactName: string | null;
  stage: CommercialWorkflowStage;
  valueCents: number;
  ownerId: string | null;
  ownerName: string | null;
  leadStatus: string;
  quoteId: string | null;
  quoteNumber: string | null;
  quoteStatus: string | null;
  contractId: string | null;
  contractNumber: string | null;
  clientId: string | null;
  updatedAt: string;
}

export interface CommercialHubKpis {
  activeDeals: number;
  pipelineValueCents: number;
  awaitingApproval: number;
  wonThisMonth: number;
  conversionRate: number;
  openQuotes: number;
}

export interface CommercialActivityItem {
  id: string;
  type: "lead" | "quote" | "contract";
  eventType: string;
  message: string | null;
  entityLabel: string;
  entityHref: string;
  createdAt: string;
  actorName: string | null;
}
