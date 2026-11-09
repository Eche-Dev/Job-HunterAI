import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Job Hunter AI | Eche-Dev",
    short_name: "JobHunter AI",
    description:
      "Scouting inteligente de empleo IT para Eche-Dev con filtrado geográfico estricto, evaluación con IA y protección Gatekeeper WAF.",
    start_url: "/",
    display: "standalone",
    background_color: "#090d16",
    theme_color: "#10b981",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
