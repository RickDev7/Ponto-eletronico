import { z } from "zod";

const vehicleFuelTypeSchema = z.enum(["gasoline", "diesel", "electric", "hybrid", "other"]);
const vehicleStatusSchema = z.enum(["available", "assigned", "maintenance", "retired"]);
const maintenanceTypeSchema = z.enum(["preventive", "corrective", "inspection", "calibration"]);
const usagePurposeSchema = z.enum(["shift", "delivery", "commute", "other"]);

export const createVehicleSchema = z.object({
  name: z.string().min(2),
  plateNumber: z.string().optional(),
  vin: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  color: z.string().optional(),
  fuelType: vehicleFuelTypeSchema.default("gasoline"),
  odometerKm: z.number().int().min(0).optional(),
  defaultDriverId: z.string().uuid().optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
  insuranceUntil: z.string().optional(),
  inspectionUntil: z.string().optional(),
  notes: z.string().optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial().extend({
  name: z.string().min(2).optional(),
  status: vehicleStatusSchema.optional(),
});

export const assignDriverSchema = z.object({
  vehicleId: z.string().uuid(),
  employeeId: z.string().uuid(),
  isPrimary: z.boolean().optional(),
  licenseNumber: z.string().optional(),
  licenseExpires: z.string().optional(),
  notes: z.string().optional(),
});

export const createVehicleMaintenanceSchema = z.object({
  vehicleId: z.string().uuid(),
  maintenanceType: maintenanceTypeSchema.default("preventive"),
  title: z.string().min(2),
  description: z.string().optional(),
  scheduledDate: z.string().optional(),
  odometerKm: z.number().int().min(0).optional(),
  costCents: z.number().int().min(0).optional(),
  vendor: z.string().optional(),
  nextDueDate: z.string().optional(),
  nextDueOdometerKm: z.number().int().min(0).optional(),
});

export const completeVehicleMaintenanceSchema = z.object({
  maintenanceId: z.string().uuid(),
  costCents: z.number().int().min(0).optional(),
  vendor: z.string().optional(),
  odometerKm: z.number().int().min(0).optional(),
  nextDueDate: z.string().optional(),
  nextDueOdometerKm: z.number().int().min(0).optional(),
});

export const logVehicleUsageSchema = z.object({
  vehicleId: z.string().uuid(),
  employeeId: z.string().uuid().optional().nullable(),
  taskId: z.string().uuid().optional().nullable(),
  purpose: usagePurposeSchema.default("shift"),
  odometerStart: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

export const endVehicleUsageSchema = z.object({
  usageId: z.string().uuid(),
  odometerEnd: z.number().int().min(0).optional(),
  distanceKm: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

export const assignVehicleToShiftSchema = z.object({
  vehicleId: z.string().uuid(),
  taskId: z.string().uuid(),
  employeeId: z.string().uuid().optional().nullable(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type AssignDriverInput = z.infer<typeof assignDriverSchema>;
export type CreateVehicleMaintenanceInput = z.infer<typeof createVehicleMaintenanceSchema>;
export type CompleteVehicleMaintenanceInput = z.infer<typeof completeVehicleMaintenanceSchema>;
export type LogVehicleUsageInput = z.infer<typeof logVehicleUsageSchema>;
export type EndVehicleUsageInput = z.infer<typeof endVehicleUsageSchema>;
export type AssignVehicleToShiftInput = z.infer<typeof assignVehicleToShiftSchema>;
