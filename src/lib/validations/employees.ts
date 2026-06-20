import { z } from "zod";

export const createEmployeeSchema = z.object({
  fullName: z.string().min(2, "Name erforderlich"),
  email: z.email("Ungültige E-Mail").optional().or(z.literal("")),
  phone: z.string().optional(),
  employeeNumber: z.string().optional(),
  hireDate: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
