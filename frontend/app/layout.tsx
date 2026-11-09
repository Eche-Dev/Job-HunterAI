import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://job-hunterai.vercel.app";

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Job Hunter AI — Agente Autónomo de Búsqueda de Empleo IT",
  description:
    "Plataforma inteligente de scouting, evaluación con IA y emparejamiento de vacantes IT. Filtrado geográfico estricto, ranking de afinidad con IA y protección perimetral con Gatekeeper WAF.",
  keywords: [
    "Job Hunter AI",
    "Python Developer",
    "FastAPI",
    "Ciberseguridad",
    "Gatekeeper WAF",
    "Scouting IT",
    "Scraping Empleo",
    "Gemini AI",
    "Remoto España",
    "LATAM Remoto",
  ],
  authors: [{ name: "Job Hunter AI Open Source Community" }],
  creator: "Job Hunter AI",
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: siteUrl,
    title: "Job Hunter AI — Agente Autónomo de Búsqueda de Empleo IT",
    description:
      "Scouting inteligente de empleo IT. Filtrado geográfico estricto, evaluación con IA y seguridad perimetral con Gatekeeper WAF.",
    siteName: "Job Hunter AI",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Job Hunter AI - Eche-Dev Platform Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Job Hunter AI | Eche-Dev — Asturias, España & LATAM Remoto",
    description:
      "Scouting inteligente de empleo IT para Eche-Dev. Filtrado geográfico estricto, evaluación con IA y seguridad perimetral con Gatekeeper WAF.",
    images: ["/og-image.png"],
    creator: "@EcheDev",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JobHunter AI",
  },
  verification: {
    google: "2eP1uWUcRkT2hYPCCnJ6qUt-qUYH3ECbHy_PPwj3L6M",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
