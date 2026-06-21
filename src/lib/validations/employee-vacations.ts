import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

export const employeeVacationRequestSchema = z
  .object({
    startDate: dateString,
    endDate: dateString,
    notes: z.string().max(500).optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export type EmployeeVacationRequestInput = z.infer<typeof employeeVacationRequestSchema>;
export type EmployeeVacationRequestFormValues = z.input<typeof employeeVacationRequestSchema>;
