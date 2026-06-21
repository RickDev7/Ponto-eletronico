import { z } from "zod";
import { contractTypeSchema } from "@/lib/validations/workforce";

export const createEmployeeSchema = z.object({
  fullName: z.string().min(2, "Name erforderlich"),
  email: z.email("Ungültige E-Mail").optional().or(z.literal("")),
  phone: z.string().optional(),
  employeeNumber: z.string().optional(),
  hireDate: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const memberAccessRoleSchema = z.enum(["employee", "supervisor", "manager"]);

export const createEmployeeFullSchema = createEmployeeSchema.extend({
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  teamId: z.string().uuid().optional().nullable(),
  supervisorId: z.string().uuid().optional().nullable(),
  contractType: contractTypeSchema.default("full_time"),
  weeklyHours: z.coerce.number().min(0).max(60).default(40),
  status: z.enum(["active", "inactive"]).default("active"),
  accessRole: memberAccessRoleSchema.default("employee"),
  skillIds: z.array(z.string().uuid()).default([]),
  sendInvite: z.boolean().default(false),
});

export type CreateEmployeeFullInput = z.infer<typeof createEmployeeFullSchema>;
export type CreateEmployeeFullFormValues = z.input<typeof createEmployeeFullSchema>;

export const inviteEmployeeSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  jobTitle: z.string().optional(),
  accessRole: memberAccessRoleSchema.default("employee"),
  teamId: z.string().uuid().optional().nullable(),
});

export type InviteEmployeeInput = z.infer<typeof inviteEmployeeSchema>;
export type InviteEmployeeFormValues = z.input<typeof inviteEmployeeSchema>;

export const importEmployeeRowSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  teamName: z.string().optional(),
  weeklyHours: z.coerce.number().min(0).max(60).optional(),
});

export const importEmployeesSchema = z.object({
  rows: z.array(importEmployeeRowSchema).min(1).max(500),
});

export type ImportEmployeesInput = z.infer<typeof importEmployeesSchema>;

export const registerEmployeeMobileSchema = z
  .object({
    employeeId: z.string().uuid(),
    email: z.string().email(),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/, "passwordUppercase")
      .regex(/[0-9]/, "passwordNumber"),
    confirmPassword: z.string(),
    accessRole: memberAccessRoleSchema.default("employee"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwordMismatch",
    path: ["confirmPassword"],
  });

export type RegisterEmployeeMobileInput = z.infer<typeof registerEmployeeMobileSchema>;
export type RegisterEmployeeMobileFormValues = z.input<typeof registerEmployeeMobileSchema>;
