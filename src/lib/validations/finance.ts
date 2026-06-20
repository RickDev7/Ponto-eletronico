import { z } from "zod";

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPriceCents: z.coerce.number().int().min(0),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
});

export const createQuoteSchema = z.object({
  clientId: z.string().uuid().optional().nullable(),
  clientName: z.string().min(2),
  clientCompany: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientPhone: z.string().optional(),
  clientAddress: z.string().optional(),
  issueDate: z.string().optional(),
  validUntil: z.string().optional().nullable(),
  paymentTerms: z.string().optional(),
  taxRate: z.coerce.number().min(0).max(100).default(19),
  discountCents: z.coerce.number().int().min(0).default(0),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  signatureText: z.string().optional(),
  assignedTo: z.string().uuid().optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  items: z.array(lineItemSchema).min(1),
});

export const updateQuoteSchema = createQuoteSchema;

export const quoteStatusSchema = z.enum([
  "draft",
  "sent",
  "under_review",
  "accepted",
  "rejected",
  "expired",
]);

const contractItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPriceCents: z.coerce.number().int().min(0),
});

export const contractStatusSchema = z.enum([
  "active",
  "pending",
  "suspended",
  "expired",
  "cancelled",
  "renewing",
]);

export const createContractSchema = z.object({
  clientId: z.string().uuid(),
  addressId: z.string().uuid().optional().nullable(),
  clientName: z.string().optional(),
  clientCompany: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientPhone: z.string().optional(),
  clientAddress: z.string().optional(),
  title: z.string().min(2),
  serviceDescription: z.string().optional(),
  items: z.array(contractItemSchema).min(1),
  frequency: z.enum(["monthly", "bimonthly", "quarterly", "semiannual", "annual"]),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  taxRate: z.coerce.number().min(0).max(100).default(19),
  discountCents: z.coerce.number().int().min(0).default(0),
  notes: z.string().optional(),
  autoRenew: z.boolean().default(true),
  renewalNoticeDays: z.coerce.number().int().min(0).default(30),
  autoGenerateInvoice: z.boolean().default(true),
  autoSendEmail: z.boolean().default(false),
  autoGeneratePdf: z.boolean().default(true),
  paymentReminder: z.boolean().default(true),
  assignedTo: z.string().uuid().optional().nullable(),
  isActive: z.boolean().default(true),
  status: contractStatusSchema.optional(),
});

export const createInvoiceSchema = z.object({
  clientId: z.string().uuid().optional().nullable(),
  contractId: z.string().uuid().optional().nullable(),
  clientName: z.string().min(2),
  clientCompany: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientPhone: z.string().optional(),
  issueDate: z.string(),
  dueDate: z.string(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  taxRate: z.coerce.number().min(0).max(100).default(19),
  discountCents: z.coerce.number().int().min(0).default(0),
  notes: z.string().optional(),
  bankDetails: z.string().optional(),
  items: z.array(lineItemSchema).min(1),
});

export const createPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amountCents: z.coerce.number().int().positive(),
  paymentDate: z.string(),
  method: z.enum(["bank_transfer", "cash", "card", "other"]).default("bank_transfer"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
