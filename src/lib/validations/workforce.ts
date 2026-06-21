import { z } from "zod";

export const vacationStatusSchema = z.enum(["pending", "approved", "rejected", "cancelled"]);
export const absenceTypeSchema = z.enum(["sick", "leave", "absence", "training", "other"]);
export const employeeDocumentTypeSchema = z.enum(["contract", "certificate", "training", "other"]);
export const contractTypeSchema = z.enum(["full_time", "part_time", "mini_job", "temporary"]);

export const updateEmployeeWorkforceSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  employeeNumber: z.string().optional(),
  hireDate: z.string().optional(),
  notes: z.string().optional(),
  jobTitle: z.string().optional(),
  supervisorId: z.string().uuid().optional().nullable(),
  contractType: contractTypeSchema.default("full_time"),
  weeklyHours: z.coerce.number().min(0).max(60).default(40),
  status: z.enum(["active", "inactive", "terminated", "on_vacation", "absent"]).optional(),
});

export const createVacationRequestSchema = z.object({
  employeeId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
  notes: z.string().optional(),
});

export const createAbsenceSchema = z.object({
  employeeId: z.string().uuid(),
  absenceType: absenceTypeSchema,
  startDate: z.string(),
  endDate: z.string(),
  notes: z.string().optional(),
});

export const worktimePolicySchema = z.object({
  workStart: z.string().default("08:00"),
  workEnd: z.string().default("17:00"),
  breakMinutes: z.coerce.number().int().min(0).default(30),
  maxDailyHours: z.coerce.number().min(1).max(24).default(10),
  maxWeeklyHours: z.coerce.number().min(1).max(60).default(48),
  overtimeThresholdHours: z.coerce.number().min(1).max(24).default(8),
});

export const createEmployeeDocumentSchema = z.object({
  employeeId: z.string().uuid(),
  docType: employeeDocumentTypeSchema,
  title: z.string().min(2),
  fileName: z.string().optional(),
  expiresAt: z.string().optional().nullable(),
});

export const createCompanySkillSchema = z.object({
  name: z.string().min(2).max(80),
  serviceType: z.string().optional().nullable(),
  description: z.string().max(300).optional(),
  color: z.string().optional(),
});

export const updateCompanySkillSchema = createCompanySkillSchema;

export const assignEmployeeSkillSchema = z.object({
  employeeId: z.string().uuid(),
  skillId: z.string().uuid(),
  level: z.coerce.number().int().min(1).max(5),
  certifiedAt: z.string().optional().nullable(),
});

export type VacationStatus = z.infer<typeof vacationStatusSchema>;
export type AbsenceType = z.infer<typeof absenceTypeSchema>;
export type UpdateEmployeeWorkforceInput = z.infer<typeof updateEmployeeWorkforceSchema>;
export type CreateVacationRequestInput = z.infer<typeof createVacationRequestSchema>;
export type CreateAbsenceInput = z.infer<typeof createAbsenceSchema>;
export type WorktimePolicyInput = z.infer<typeof worktimePolicySchema>;
export type CreateEmployeeDocumentInput = z.infer<typeof createEmployeeDocumentSchema>;
export type CreateCompanySkillInput = z.infer<typeof createCompanySkillSchema>;
export type UpdateCompanySkillInput = z.infer<typeof updateCompanySkillSchema>;
export type AssignEmployeeSkillInput = z.infer<typeof assignEmployeeSkillSchema>;
