import { z } from "zod";

export const leadStatusSchema = z.enum([
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
]);

export const createLeadSchema = z.object({
  companyName: z.string().min(2),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().optional(),
  city: z.string().optional(),
  country: z.string(),
  estimatedValueCents: z.number().int().min(0),
  notes: z.string().optional(),
  ownerId: z.string().uuid().optional().nullable(),
  status: leadStatusSchema.optional(),
});

export const updateLeadSchema = createLeadSchema;

export const createLeadContactSchema = z.object({
  leadId: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  roleTitle: z.string().optional(),
  isPrimary: z.boolean(),
});

export type LeadStatus = z.infer<typeof leadStatusSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type CreateLeadContactInput = z.infer<typeof createLeadContactSchema>;
