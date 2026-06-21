import { z } from "zod";

const materialUnitSchema = z.enum(["piece", "liter", "kg", "meter", "box", "other"]);

const quantitySchema = z.number().positive();

export const createMaterialSchema = z.object({
  name: z.string().min(2),
  sku: z.string().optional(),
  description: z.string().optional(),
  unit: materialUnitSchema.default("piece"),
  quantityOnHand: z.number().min(0).optional(),
  minStockLevel: z.number().min(0).optional(),
  unitCostCents: z.number().int().min(0).optional(),
  serviceId: z.string().uuid().optional().nullable(),
});

export const updateMaterialSchema = createMaterialSchema.partial().extend({
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
});

export const linkMaterialServiceSchema = z.object({
  materialId: z.string().uuid(),
  serviceId: z.string().uuid(),
  quantityPerService: quantitySchema.default(1),
  notes: z.string().optional(),
});

export const recordPurchaseSchema = z.object({
  materialId: z.string().uuid(),
  quantity: quantitySchema,
  unitCostCents: z.number().int().min(0).optional(),
  vendor: z.string().optional(),
  invoiceRef: z.string().optional(),
  purchasedAt: z.string().optional(),
  notes: z.string().optional(),
});

export const recordUsageSchema = z.object({
  materialId: z.string().uuid(),
  quantity: quantitySchema,
  employeeId: z.string().uuid().optional().nullable(),
  taskId: z.string().uuid().optional().nullable(),
  serviceId: z.string().uuid().optional().nullable(),
  notes: z.string().optional(),
});

export const recordConsumptionSchema = z.object({
  materialId: z.string().uuid(),
  serviceId: z.string().uuid(),
  quantity: quantitySchema,
  taskId: z.string().uuid().optional().nullable(),
  employeeId: z.string().uuid().optional().nullable(),
  notes: z.string().optional(),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type LinkMaterialServiceInput = z.infer<typeof linkMaterialServiceSchema>;
export type RecordPurchaseInput = z.infer<typeof recordPurchaseSchema>;
export type RecordUsageInput = z.infer<typeof recordUsageSchema>;
export type RecordConsumptionInput = z.infer<typeof recordConsumptionSchema>;
