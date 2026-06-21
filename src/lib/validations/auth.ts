import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Mindestens 8 Zeichen"),
});

export const ACCEPT_TERMS_ERROR_KEY = "acceptTermsRequired";

const registerBaseSchema = z
  .object({
    fullName: z.string().min(2, "Name erforderlich"),
    email: z.email("Ungültige E-Mail-Adresse"),
    password: z
      .string()
      .min(8, "Mindestens 8 Zeichen")
      .regex(/[A-Z]/, "Mindestens ein Großbuchstabe")
      .regex(/[0-9]/, "Mindestens eine Zahl"),
    confirmPassword: z.string(),
    acceptTerms: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwörter stimmen nicht überein",
    path: ["confirmPassword"],
  });

export function createRegisterSchema(acceptTermsMessage: string) {
  return registerBaseSchema.refine((data) => data.acceptTerms === true, {
    message: acceptTermsMessage,
    path: ["acceptTerms"],
  });
}

export const registerSchema = createRegisterSchema(ACCEPT_TERMS_ERROR_KEY);

export const createCompanySchema = z.object({
  name: z.string().min(2, "Firmenname erforderlich"),
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Nur Kleinbuchstaben, Zahlen und Bindestriche",
    ),
  legalName: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignInInput = LoginInput & { redirect?: string | null };
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
