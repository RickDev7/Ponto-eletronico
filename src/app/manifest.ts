import type { MetadataRoute } from "next";

const ICONS = [
  {
    src: "/icons/employee-192.svg",
    sizes: "192x192",
    type: "image/svg+xml" as const,
    purpose: "any" as const,
  },
  {
    src: "/icons/employee-512.svg",
    sizes: "512x512",
    type: "image/svg+xml" as const,
    purpose: "any" as const,
  },
  {
    src: "/icons/employee-512.svg",
    sizes: "512x512",
    type: "image/svg+xml" as const,
    purpose: "maskable" as const,
  },
];

export function buildEmployeeManifest(
  options: {
    slug?: string;
    companyName?: string;
    startUrl?: string;
    locale?: "pt" | "en";
  } = {},
): MetadataRoute.Manifest {
  const locale = options.locale ?? "pt";
  const isEn = locale === "en";
  const startUrl = options.startUrl ?? (options.slug ? `/${options.slug}/mobile` : "/select-company");
  const name = options.companyName
    ? `FeldOps — ${options.companyName}`
    : isEn
      ? "FeldOps — Employee"
      : "FeldOps — Colaborador";

  return {
    name,
    short_name: "FeldOps",
    description: isEn
      ? "Mobile app for field employees — services, check-in and hours"
      : "App mobile para colaboradores — serviços, check-in e horas",
    start_url: startUrl,
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4f46e5",
    orientation: "portrait-primary",
    categories: ["business", "productivity"],
    lang: locale,
    icons: ICONS,
    shortcuts: options.slug
      ? [
          {
            name: isEn ? "My services" : "Meus serviços",
            url: `/${options.slug}/mobile`,
            description: isEn ? "Today's services" : "Serviços de hoje",
          },
          {
            name: isEn ? "Schedule" : "Agenda",
            url: `/${options.slug}/mobile/schedule`,
            description: isEn ? "Weekly schedule" : "Agenda semanal",
          },
        ]
      : [],
  };
}

export default function manifest(): MetadataRoute.Manifest {
  return buildEmployeeManifest();
}
