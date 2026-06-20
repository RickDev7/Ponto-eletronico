import { z } from "zod";
import { SERVICE_TYPES } from "@/types/enums";

export const createClientSchema = z.object({
  name: z.string().min(2, "Name erforderlich"),
  contactName: z.string().optional(),
  email: z.email("Ungültige E-Mail").optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export const createAddressSchema = z.object({
  clientId: z.string().uuid("Client erforderlich"),
  label: z.string().optional(),
  street: z.string().min(2, "Straße erforderlich"),
  houseNumber: z.string().optional(),
  postalCode: z.string().min(4, "PLZ erforderlich"),
  city: z.string().min(2, "Stadt erforderlich"),
  accessNotes: z.string().optional(),
  serviceTypes: z.array(z.enum(SERVICE_TYPES as [string, ...string[]])).min(1, "Mindestens ein Dienst"),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
