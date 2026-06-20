import type { AutomationActionType, AutomationTriggerType } from "@/lib/validations/automations";

export interface TriggerFieldDef {
  key: string;
  labelKey: string;
  type: "string" | "number" | "boolean";
}

export interface TriggerDef {
  type: AutomationTriggerType;
  labelKey: string;
  descriptionKey: string;
  fields: TriggerFieldDef[];
  exampleFlowKey: string;
}

export interface ActionDef {
  type: AutomationActionType;
  labelKey: string;
  descriptionKey: string;
  channels?: Array<"email" | "whatsapp" | "push" | "sms" | "in_app">;
}

export const AUTOMATION_TRIGGERS: TriggerDef[] = [
  {
    type: "contract.created",
    labelKey: "triggers.contractCreated",
    descriptionKey: "triggers.contractCreatedDesc",
    fields: [
      { key: "frequency", labelKey: "fields.frequency", type: "string" },
      { key: "amountCents", labelKey: "fields.amount", type: "number" },
      { key: "hasAddress", labelKey: "fields.hasAddress", type: "boolean" },
    ],
    exampleFlowKey: "examples.contractToService",
  },
  {
    type: "contract.renewed",
    labelKey: "triggers.contractRenewed",
    descriptionKey: "triggers.contractRenewedDesc",
    fields: [{ key: "autoRenew", labelKey: "fields.autoRenew", type: "boolean" }],
    exampleFlowKey: "examples.contractRenewed",
  },
  {
    type: "service.completed",
    labelKey: "triggers.serviceCompleted",
    descriptionKey: "triggers.serviceCompletedDesc",
    fields: [
      { key: "serviceType", labelKey: "fields.serviceType", type: "string" },
      { key: "hasContract", labelKey: "fields.hasContract", type: "boolean" },
    ],
    exampleFlowKey: "examples.serviceToReport",
  },
  {
    type: "service.approved",
    labelKey: "triggers.serviceApproved",
    descriptionKey: "triggers.serviceApprovedDesc",
    fields: [{ key: "serviceType", labelKey: "fields.serviceType", type: "string" }],
    exampleFlowKey: "examples.serviceApproved",
  },
  {
    type: "invoice.overdue",
    labelKey: "triggers.invoiceOverdue",
    descriptionKey: "triggers.invoiceOverdueDesc",
    fields: [
      { key: "daysOverdue", labelKey: "fields.daysOverdue", type: "number" },
      { key: "balanceCents", labelKey: "fields.balance", type: "number" },
    ],
    exampleFlowKey: "examples.invoiceReminder",
  },
  {
    type: "invoice.sent",
    labelKey: "triggers.invoiceSent",
    descriptionKey: "triggers.invoiceSentDesc",
    fields: [{ key: "totalCents", labelKey: "fields.amount", type: "number" }],
    exampleFlowKey: "examples.invoiceSent",
  },
  {
    type: "lead.won",
    labelKey: "triggers.leadWon",
    descriptionKey: "triggers.leadWonDesc",
    fields: [{ key: "estimatedValueCents", labelKey: "fields.amount", type: "number" }],
    exampleFlowKey: "examples.leadWon",
  },
  {
    type: "lead.status_changed",
    labelKey: "triggers.leadStatusChanged",
    descriptionKey: "triggers.leadStatusChangedDesc",
    fields: [{ key: "status", labelKey: "fields.status", type: "string" }],
    exampleFlowKey: "examples.leadStatus",
  },
  {
    type: "shift.empty",
    labelKey: "triggers.shiftEmpty",
    descriptionKey: "triggers.shiftEmptyDesc",
    fields: [
      { key: "scheduledDate", labelKey: "fields.scheduledDate", type: "string" },
      { key: "location", labelKey: "fields.location", type: "string" },
    ],
    exampleFlowKey: "examples.shiftEmpty",
  },
  {
    type: "weekly_hours.exceeded",
    labelKey: "triggers.weeklyHoursExceeded",
    descriptionKey: "triggers.weeklyHoursExceededDesc",
    fields: [
      { key: "employeeName", labelKey: "fields.employeeName", type: "string" },
      { key: "excessMinutes", labelKey: "fields.excessMinutes", type: "number" },
    ],
    exampleFlowKey: "examples.weeklyHours",
  },
];

export const AUTOMATION_ACTIONS: ActionDef[] = [
  {
    type: "generate_service",
    labelKey: "actions.generateService",
    descriptionKey: "actions.generateServiceDesc",
  },
  {
    type: "generate_report",
    labelKey: "actions.generateReport",
    descriptionKey: "actions.generateReportDesc",
  },
  {
    type: "send_reminder",
    labelKey: "actions.sendReminder",
    descriptionKey: "actions.sendReminderDesc",
    channels: ["email", "whatsapp", "sms", "push"],
  },
  {
    type: "send_notification",
    labelKey: "actions.sendNotification",
    descriptionKey: "actions.sendNotificationDesc",
    channels: ["in_app", "push"],
  },
  {
    type: "create_task",
    labelKey: "actions.createTask",
    descriptionKey: "actions.createTaskDesc",
  },
];

export const CONDITION_OPERATORS = [
  { value: "eq", labelKey: "operators.eq" },
  { value: "neq", labelKey: "operators.neq" },
  { value: "gt", labelKey: "operators.gt" },
  { value: "lt", labelKey: "operators.lt" },
  { value: "contains", labelKey: "operators.contains" },
  { value: "empty", labelKey: "operators.empty" },
  { value: "not_empty", labelKey: "operators.notEmpty" },
] as const;

export function getTriggerDef(type: AutomationTriggerType): TriggerDef | undefined {
  return AUTOMATION_TRIGGERS.find((t) => t.type === type);
}

export function getActionDef(type: AutomationActionType) {
  return AUTOMATION_ACTIONS.find((a) => a.type === type);
}

export const AUTOMATION_EXAMPLES = [
  { trigger: "contract.created" as const, action: "generate_service" as const, key: "examples.contractToService" },
  { trigger: "service.completed" as const, action: "generate_report" as const, key: "examples.serviceToReport" },
  { trigger: "invoice.overdue" as const, action: "send_reminder" as const, key: "examples.invoiceReminder" },
];
