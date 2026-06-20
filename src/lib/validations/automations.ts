import { z } from "zod";

export const automationTriggerSchema = z.enum([
  "contract.created",
  "contract.renewed",
  "service.completed",
  "service.approved",
  "invoice.overdue",
  "invoice.sent",
  "lead.won",
  "lead.status_changed",
  "shift.empty",
  "weekly_hours.exceeded",
]);

export const automationConditionOperatorSchema = z.enum([
  "eq",
  "neq",
  "gt",
  "lt",
  "contains",
  "empty",
  "not_empty",
]);

export const automationActionTypeSchema = z.enum([
  "generate_service",
  "generate_report",
  "send_reminder",
  "send_notification",
  "create_task",
]);

export const deliveryChannelSchema = z.enum(["email", "whatsapp", "push", "sms", "in_app"]);

export const automationConditionSchema = z.object({
  field: z.string().min(1),
  operator: automationConditionOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

export const automationActionStepSchema = z.object({
  type: automationActionTypeSchema,
  channel: deliveryChannelSchema.optional(),
  config: z.record(z.unknown()).optional(),
});

export const createAutomationRuleSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  triggerType: automationTriggerSchema,
  conditions: z.array(automationConditionSchema).default([]),
  actions: z.array(automationActionStepSchema).min(1),
  isEnabled: z.boolean().default(true),
});

export const updateAutomationRuleSchema = createAutomationRuleSchema;

export type AutomationTriggerType = z.infer<typeof automationTriggerSchema>;
export type AutomationConditionOperator = z.infer<typeof automationConditionOperatorSchema>;
export type AutomationActionType = z.infer<typeof automationActionTypeSchema>;
export type DeliveryChannel = z.infer<typeof deliveryChannelSchema>;
export type AutomationCondition = z.infer<typeof automationConditionSchema>;
export type AutomationActionStep = z.infer<typeof automationActionStepSchema>;
export type CreateAutomationRuleInput = z.infer<typeof createAutomationRuleSchema>;
export type UpdateAutomationRuleInput = z.infer<typeof updateAutomationRuleSchema>;
