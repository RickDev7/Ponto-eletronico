import type { AiCapability, AiDomain } from "@/lib/ai/types";

export interface AiCapabilityDef {
  id: AiCapability;
  labelKey: string;
  descriptionKey: string;
  domains: AiDomain[];
  icon: "calendar" | "users" | "calculator" | "clock" | "file-text" | "bar-chart" | "sparkles";
}

export const AI_CAPABILITIES: AiCapabilityDef[] = [
  {
    id: "optimize_schedules",
    labelKey: "capabilities.optimizeSchedules",
    descriptionKey: "capabilities.optimizeSchedulesDesc",
    domains: ["operations", "tasks", "general"],
    icon: "calendar",
  },
  {
    id: "suggest_workforce_allocation",
    labelKey: "capabilities.suggestWorkforce",
    descriptionKey: "capabilities.suggestWorkforceDesc",
    domains: ["workforce", "operations", "general"],
    icon: "users",
  },
  {
    id: "estimate_costs",
    labelKey: "capabilities.estimateCosts",
    descriptionKey: "capabilities.estimateCostsDesc",
    domains: ["finance", "analytics", "commercial", "general"],
    icon: "calculator",
  },
  {
    id: "predict_delays",
    labelKey: "capabilities.predictDelays",
    descriptionKey: "capabilities.predictDelaysDesc",
    domains: ["operations", "tasks", "automations", "general"],
    icon: "clock",
  },
  {
    id: "generate_quotes",
    labelKey: "capabilities.generateQuotes",
    descriptionKey: "capabilities.generateQuotesDesc",
    domains: ["finance", "commercial", "general"],
    icon: "file-text",
  },
  {
    id: "generate_reports",
    labelKey: "capabilities.generateReports",
    descriptionKey: "capabilities.generateReportsDesc",
    domains: ["reports", "analytics", "portal", "automations", "general"],
    icon: "file-text",
  },
  {
    id: "analyze_productivity",
    labelKey: "capabilities.analyzeProductivity",
    descriptionKey: "capabilities.analyzeProductivityDesc",
    domains: ["analytics", "workforce", "operations", "automations", "general"],
    icon: "bar-chart",
  },
];

export function getCapabilitiesForDomain(domain: AiDomain): AiCapabilityDef[] {
  return AI_CAPABILITIES.filter(
    (c) => c.domains.includes(domain) || c.domains.includes("general"),
  );
}

export function detectDomainFromPath(pathname: string): AiDomain {
  if (pathname.includes("/assets") || pathname.includes("/vehicles")) return "operations";
  if (pathname.includes("/operations")) return "operations";
  if (pathname.includes("/workforce")) return "workforce";
  if (pathname.includes("/finance") || pathname.includes("/crm")) return "finance";
  if (pathname.includes("/commercial") || pathname.includes("/clients")) return "commercial";
  if (pathname.includes("/analytics")) return "analytics";
  if (pathname.includes("/tasks") || pathname.includes("/calendar")) return "tasks";
  if (pathname.includes("/reports")) return "reports";
  if (pathname.includes("/automations")) return "automations";
  if (pathname.includes("/portal")) return "portal";
  if (pathname.includes("/assistant")) return "general";
  return "general";
}

export function getCapabilityDef(id: AiCapability) {
  return AI_CAPABILITIES.find((c) => c.id === id);
}
