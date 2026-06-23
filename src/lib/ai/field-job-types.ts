export type FieldJobAiCapability =
  | "suggest_checklist"
  | "suggest_materials"
  | "generate_service_notes";

export interface FieldJobMaterialSuggestion {
  name: string;
  quantity: string;
  note?: string;
}

export interface FieldJobAiResult {
  capability: FieldJobAiCapability;
  provider: "openai" | "fallback";
  summary: string;
  recommendations: string[];
  checklistItems?: string[];
  materials?: FieldJobMaterialSuggestion[];
  serviceNotes?: string;
}

export interface FieldJobAiContext {
  companyId: string;
  companyName: string;
  locale: string;
  task: {
    id: string;
    title: string;
    serviceType: string;
    description: string | null;
    scheduledDate: string;
    clientName: string | null;
    addressLine: string | null;
    accessNotes: string | null;
  };
  existingChecklist: string[];
  templateChecklists: string[][];
  linkedMaterials: FieldJobMaterialSuggestion[];
}
