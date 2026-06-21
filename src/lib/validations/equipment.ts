import { z } from "zod";

const equipmentCategorySchema = z.enum([
  "vehicle",
  "tool",
  "machine",
  "safety",
  "consumable",
  "other",
]);

const equipmentStatusSchema = z.enum(["available", "assigned", "maintenance", "retired"]);

const maintenanceTypeSchema = z.enum(["preventive", "corrective", "inspection", "calibration"]);

const maintenanceStatusSchema = z.enum(["scheduled", "in_progress", "completed", "cancelled"]);

export const createEquipmentSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  category: equipmentCategorySchema.default("tool"),
  status: equipmentStatusSchema.optional(),
  serialNumber: z.string().optional(),
  assetTag: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchaseCostCents: z.number().int().min(0).optional(),
  warrantyUntil: z.string().optional(),
  serviceId: z.string().uuid().optional().nullable(),
  defaultEmployeeId: z.string().uuid().optional().nullable(),
  locationNotes: z.string().optional(),
});

export const updateEquipmentSchema = createEquipmentSchema.partial().extend({
  name: z.string().min(2).optional(),
});

export const assignEquipmentSchema = z.object({
  equipmentId: z.string().uuid(),
  employeeId: z.string().uuid().optional().nullable(),
  taskId: z.string().uuid().optional().nullable(),
  serviceId: z.string().uuid().optional().nullable(),
  notes: z.string().optional(),
});

export const createMaintenanceSchema = z.object({
  equipmentId: z.string().uuid(),
  maintenanceType: maintenanceTypeSchema.default("preventive"),
  title: z.string().min(2),
  description: z.string().optional(),
  scheduledDate: z.string().optional(),
  costCents: z.number().int().min(0).optional(),
  vendor: z.string().optional(),
  nextDueDate: z.string().optional(),
});

export const completeMaintenanceSchema = z.object({
  maintenanceId: z.string().uuid(),
  costCents: z.number().int().min(0).optional(),
  vendor: z.string().optional(),
  nextDueDate: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
export type AssignEquipmentInput = z.infer<typeof assignEquipmentSchema>;
export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
export type CompleteMaintenanceInput = z.infer<typeof completeMaintenanceSchema>;
