import { z } from "zod";

export const propertyTypeSchema = z.enum([
  "office",
  "condominium",
  "retail",
  "hotel",
  "school",
  "warehouse",
  "other",
]);

export const createServiceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  estimatedDurationMinutes: z.coerce.number().int().min(15).default(60),
  frequency: z.string().optional(),
  color: z.string().default("#6366f1"),
  defaultChecklist: z.array(z.object({ label: z.string().min(1) })).default([]),
  legacyServiceType: z
    .enum(["treppenhausreinigung", "gartenpflege", "winterdienst", "glasreinigung"])
    .optional()
    .nullable(),
  isActive: z.boolean().default(true),
});

export const createTeamSchema = z.object({
  name: z.string().min(2),
  supervisorId: z.string().uuid().optional().nullable(),
  vehicleInfo: z.string().optional(),
  memberIds: z.array(z.string().uuid()).default([]),
  isActive: z.boolean().default(true),
});

export type PropertyType = z.infer<typeof propertyTypeSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const DEFAULT_SERVICES: Omit<CreateServiceInput, "isActive">[] = [
  {
    name: "Limpeza Regular",
    description: "Reinigung nach Standardplan",
    estimatedDurationMinutes: 120,
    frequency: "weekly",
    color: "#6366f1",
    defaultChecklist: [{ label: "Eingangsbereich" }, { label: "Treppenhaus" }, { label: "Aufzug" }],
    legacyServiceType: "treppenhausreinigung",
  },
  {
    name: "Limpeza Profunda",
    description: "Grundreinigung",
    estimatedDurationMinutes: 240,
    frequency: "monthly",
    color: "#8b5cf6",
    defaultChecklist: [{ label: "Böden" }, { label: "Sanitär" }, { label: "Küche" }],
    legacyServiceType: "treppenhausreinigung",
  },
  {
    name: "Limpeza Vidros",
    description: "Glasreinigung innen/außen",
    estimatedDurationMinutes: 90,
    frequency: "monthly",
    color: "#06b6d4",
    defaultChecklist: [{ label: "Fenster innen" }, { label: "Fenster außen" }],
    legacyServiceType: "glasreinigung",
  },
  {
    name: "Hausmeisterservice",
    description: "Objektbetreuung",
    estimatedDurationMinutes: 180,
    frequency: "weekly",
    color: "#f59e0b",
    defaultChecklist: [{ label: "Kontrolle" }, { label: "Kleinreparaturen" }],
    legacyServiceType: "treppenhausreinigung",
  },
  {
    name: "Jardinagem",
    description: "Grünflächenpflege",
    estimatedDurationMinutes: 120,
    frequency: "weekly",
    color: "#22c55e",
    defaultChecklist: [{ label: "Rasen" }, { label: "Hecken" }],
    legacyServiceType: "gartenpflege",
  },
  {
    name: "Winterdienst",
    description: "Schnee- und Eisbeseitigung",
    estimatedDurationMinutes: 60,
    frequency: "on_demand",
    color: "#3b82f6",
    defaultChecklist: [{ label: "Gehwege" }, { label: "Einfahrt" }],
    legacyServiceType: "winterdienst",
  },
  {
    name: "Inspeção",
    description: "Objektinspektion",
    estimatedDurationMinutes: 45,
    frequency: "monthly",
    color: "#64748b",
    defaultChecklist: [{ label: "Sicherheit" }, { label: "Mängel dokumentieren" }],
    legacyServiceType: null,
  },
];
