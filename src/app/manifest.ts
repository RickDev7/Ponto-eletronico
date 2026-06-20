import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FeldOps — Servicemanagement",
    short_name: "FeldOps",
    description:
      "Field service management for Treppenhausreinigung, Gartenpflege, Winterdienst und Glasreinigung",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4f46e5",
    orientation: "portrait-primary",
    categories: ["business", "productivity"],
    lang: "de",
    icons: [
      {
        src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='96' fill='%234f46e5'/%3E%3Cpath d='M148 138h216v64H220v62h122v62H220v124h-72V138z' fill='white'/%3E%3C/svg%3E",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='96' fill='%234f46e5'/%3E%3Cpath d='M148 138h216v64H220v62h122v62H220v124h-72V138z' fill='white'/%3E%3C/svg%3E",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
    shortcuts: [
      {
        name: "Meine Aufgaben",
        url: "/minha-area",
        description: "Meine heutigen Aufgaben",
      },
      {
        name: "Aufgaben",
        url: "/tasks",
        description: "Alle Aufgaben anzeigen",
      },
    ],
  };
}
