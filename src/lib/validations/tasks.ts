import { z } from "zod";
import { SERVICE_TYPES, TASK_STATUSES } from "@/types/enums";

export const createTaskSchema = z.object({
  addressId: z.string().uuid("Adresse erforderlich"),
  serviceType: z.enum(SERVICE_TYPES as [string, ...string[]]),
  title: z.string().min(2, "Titel erforderlich"),
  description: z.string().optional(),
  scheduledDate: z.string().min(1, "Datum erforderlich"),
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  employeeIds: z.array(z.string().uuid()).optional(),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(TASK_STATUSES as [string, ...string[]]),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
