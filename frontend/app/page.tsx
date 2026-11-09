"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface JobOffer {
  id: number;
  source: string;
  source_category: string;
  external_id: string;
  title: string;
  company: string;
  description: string;
  location: string;
  country: string;
  region_scope: string;
  remote_type: string;
  is_asturias_local: boolean;
  employment_type: string;
  salary_range?: string;
  language_required: string;
  experience_level: string;
  technologies: string[];
  matched_skills: string[];
  missing_skills: string[];
  motor_a_score: number;
  motor_b_score: number;
  final_score: number;
  is_top_20: boolean;
  top_20_rank?: number | null;
  is_discarded: boolean;
  discard_reason?: string | null;
  matching_explanation?: string | null;
  recommended_pitch?: string | null;
  entry_barrier?: string | null;
  application_status: string;
  is_favorite: boolean;
  is_new?: boolean;
  original_url: string;
  published_at?: string;
  discovered_at?: string;
}

export interface DashboardStats {
  total_active_offers: number;
  top_20_count: number;
  asturias_local_count: number;
  spain_remote_count: number;
  latam_remote_count: number;
  global_remote_count: number;
  linkedin_offers_and_posts_count: number;
  discarded_count: number;
  favorites_count: number;
  applied_count: number;
  last_run?: {
    run_uid: string;
    completed_at: string;
    total_found: number;
    top_20_count: number;
    estimated_cost_usd: number;
    saved_cost_usd: number;
  } | null;
  waf_summary?: {
    waf_name: string;
    status: string;
    total_inspected_requests: number;
    total_blocked_requests: number;
  };
}

export default function HomePage() {
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterTab, setFilterTab] = useState<"top20" | "compatibles" | "discarded">("top20");
  const [regionFilter, setRegionFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [techFilter, setTechFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [collapsedCards, setCollapsedCards] = useState<Record<number, boolean>>({});
  const itemsPerPage = 10;

  const toggleCard = (id: number) => {
    setCollapsedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isJobNew = (job: JobOffer) => {
    if (job.is_new !== undefined) return Boolean(job.is_new);
    if (job.discovered_at) {
      const diffHours =
        (Date.now() - new Date(job.discovered_at).getTime()) / (1000 * 3600);
      return diffHours < 24;
    }
    return false;
  };

  const fetchPublicData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterTab === "top20") {
        params.set("only_top_20", "true");
      } else if (filterTab === "discarded") {
        params.set("only_discarded", "true");
      }
      if (regionFilter !== "ALL") params.set("region_scope", regionFilter);
      if (sourceFilter !== "ALL") params.set("source_category", sourceFilter);
      if (techFilter !== "ALL") params.set("technology", techFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const [jobsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/jobs?${params.toString()}`),
        fetch(`${API_BASE}/api/v1/stats`),
      ]);
      if (jobsRes.ok) {
        setJobs(await jobsRes.json());
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (err) {
      console.error("Error cargando datos del backend:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchPublicData();
  }, [filterTab, regionFilter, sourceFilter, techFilter]);

  const getScoreBadgeColor = (score: number, isDiscarded: boolean) => {
    if (isDiscarded) return "bg-rose-500/20 text-rose-300 border-rose-500/40";
    if (score >= 90)
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    if (score >= 75)
      return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
    return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  };

  const getRegionBadge = (job: JobOffer) => {
    if (job.is_asturias_local || job.region_scope === "ASTURIAS") {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
          📍 Principado de Asturias ({job.remote_type.toUpperCase()})
        </span>
      );
    }
    if (job.region_scope === "SPAIN_REMOTE") {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          🇪🇸 España · 100% Remoto
        </span>
      );
    }
    if (job.region_scope === "LATAM_REMOTE") {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
          🌎 LATAM · 100% Remoto
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
        🌍 Global / Europa · 100% Remoto
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header / Navbar */}
      <header className="border-b border-slate-800/80 bg-[#0c1220]/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="relative group shrink-0" title="Job Hunter AI">
              {/* Resplandor cyberpunk pulsante */}
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-400 rounded-2xl blur-md opacity-70 group-hover:opacity-100 transition duration-500 animate-pulse"></div>

              {/* Contenedor del icono con borde neón y micro-interacción */}
              <div className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-xl overflow-hidden bg-slate-950 border border-emerald-400/50 shadow-lg shadow-emerald-500/30 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:border-cyan-400">
                <Image
                  src="/icons/icon-192.png"
                  alt="Job Hunter AI Logo"
                  width={44}
                  height={44}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-115 group-hover:rotate-6"
                  priority
                />
              </div>
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-bold text-base sm:text-lg text-white tracking-tight whitespace-nowrap">
                  Job Hunter AI
                </h1>
                <span className="hidden xs:inline-block text-[11px] sm:text-xs px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium whitespace-nowrap">
                  Gatekeeper WAF Protected
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Agente Autónomo de Búsqueda IT & Match Heurístico
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-col lg:flex-row items-end lg:items-center gap-1.5 lg:gap-3 shrink-0">
            <a
              href="https://github.com/Eche-Dev/Job-HunterAI"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition font-medium whitespace-nowrap text-center text-xs lg:text-sm"
            >
              GitHub Repo ↗
            </a>
            <Link
              href="/gatekeeper-admin"
              className="px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold transition shadow-md shadow-emerald-600/20 whitespace-nowrap text-center text-xs lg:text-sm"
            >
              Panel Admin Privado 🔒
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-8 pb-2 space-y-6 sm:space-y-8 flex-1">
        {/* Hero Banner + Regla Geográfica */}
        <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-[#0e172a] to-slate-900 p-6 sm:p-8 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30">
                <span>🎯 Regla Geográfica Estricta Activa:</span>
                <strong className="text-white">
                  Presencial/Híbrido SOLO en Principado de Asturias · Resto 100% Remoto
                </strong>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Las 20 Mejores Oportunidades IT para{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                  tu Perfil
                </span>
              </h2>
              <div className="text-slate-300 text-xs sm:text-sm leading-relaxed space-y-2">
                <p className="text-slate-400 text-xs sm:text-sm font-medium">
                  Arquitectura de búsqueda en tiempo real, optimización de costes y evaluación de vacantes:
                </p>
                <ul className="space-y-1.5 text-slate-300/90 text-xs sm:text-sm">
                  <li>
                    <strong className="text-emerald-400">1. Scouting Multicanal:</strong> Compara en tiempo real <strong>5 herramientas por fuente</strong> (LinkedIn Jobs & Posts, Tecnoempleo, InfoJobs, Empleo Asturias y Get on Board LATAM) seleccionando siempre la opción más económica y fiable.
                  </li>
                  <li>
                    <strong className="text-cyan-400">2. Motor A (Filtro Geográfico y Técnico):</strong> Aplica la regla estricta de <strong>Presencial/Híbrido exclusivo en tu zona local</strong> y <strong>100% Remoto</strong> para el resto del mundo, descartando ofertas senior desalineadas.
                  </li>
                  <li>
                    <strong className="text-purple-400">3. Motor B & C (Evaluación con IA + Ranking Top 20):</strong> Evalúa afinidad técnica, genera pitches conectando los proyectos definidos en <code className="text-cyan-400">candidate_profile.json</code> y selecciona las 20 mejores vacantes.
                  </li>
                  <li>
                    <strong className="text-amber-400">4. Seguridad Perimetral:</strong> Protegido por <strong>Gatekeeper WAF</strong> (middleware ASGI en Python) con inspección OWASP, rate limiting y auditoría en base de datos.
                  </li>
                </ul>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  "Python",
                  "FastAPI",
                  "PostgreSQL / SQL",
                  "Java",
                  "Ciberseguridad & WAF",
                  "Pytest / Testing QA",
                  "HTML5 & CSS3",
                  "Streamlit & Pandas",
                  "IA Generativa",
                  "Apify & Web Scraping",
                  "Docker & Git",
                ].map((skill) => (
                  <span
                    key={skill}
                    className="text-xs px-2.5 py-1 rounded-md bg-slate-800/90 text-slate-200 border border-slate-700 font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-slate-400">Top Recomendadas</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {stats?.top_20_count ?? 20}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 mt-auto pt-2">
                  Ranking Motor C
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-slate-400">Principado de Asturias</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {stats?.asturias_local_count ?? 0}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 mt-auto pt-2">
                  Presencial / Híbrido / Local
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-slate-400">España & LATAM Remoto</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {(stats?.spain_remote_count ?? 0) +
                      (stats?.latam_remote_count ?? 0)}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 mt-auto pt-2">
                  100% Teletrabajo en Español
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-slate-400">LinkedIn (Jobs + Posts)</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {stats?.linkedin_offers_and_posts_count ?? 0}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 mt-auto pt-2">
                  Vacantes + Muro Recruiters
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Barra de Filtros */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setFilterTab("top20");
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filterTab === "top20"
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                🏆 Top 20 Mejores Ofertas
              </button>
              <button
                onClick={() => {
                  setFilterTab("compatibles");
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filterTab === "compatibles"
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                ✅ Todas las Compatibles ({stats?.total_active_offers ?? 0})
              </button>
              <button
                onClick={() => {
                  setFilterTab("discarded");
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filterTab === "discarded"
                    ? "bg-rose-500 text-white font-bold shadow-md shadow-rose-500/20"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                🛑 Ver Descartadas por Motor A ({stats?.discarded_count ?? 0})
              </button>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setCurrentPage(1);
                    fetchPublicData();
                  }
                }}
                placeholder="Buscar puesto, empresa, Oviedo, Gijón, Python..."
                className="w-full px-3.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => {
                  setCurrentPage(1);
                  fetchPublicData();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700"
              >
                Buscar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
                Región y Modalidad
              </label>
              <select
                value={regionFilter}
                onChange={(e) => {
                  setRegionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-200"
              >
                <option value="ALL">Todas las regiones permitidas</option>
                <option value="ASTURIAS">
                  📍 Principado de Asturias (Presencial / Híbrido / Remoto)
                </option>
                <option value="SPAIN_REMOTE">🇪🇸 España (100% Remoto)</option>
                <option value="LATAM_REMOTE">
                  🌎 Latinoamérica (100% Remoto en Español)
                </option>
                <option value="GLOBAL_REMOTE">
                  🌍 Europa / Global (100% Remoto · Inglés A2 / Básico)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
                Fuente / Plataforma
              </label>
              <select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-200"
              >
                <option value="ALL">Todas las plataformas</option>
                <option value="linkedin_jobs">LinkedIn Jobs (Ofertas)</option>
                <option value="linkedin_posts">
                  LinkedIn Feed (Posts de Recruiters)
                </option>
                <option value="spain_asturias_portals">
                  España & Asturias (Tecnoempleo, InfoJobs, Joppy)
                </option>
                <option value="latam_remote">
                  LATAM Remoto (Get on Board, Torre.ai)
                </option>
                <option value="global_remote_apis">
                  Remoto Internacional (Remotive, Himalayas, RemoteOK)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
                Tecnología del Perfil
              </label>
              <select
                value={techFilter}
                onChange={(e) => {
                  setTechFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-200"
              >
                <option value="ALL">Todas las tecnologías</option>
                <option value="Python">Python</option>
                <option value="FastAPI">FastAPI</option>
                <option value="PostgreSQL">PostgreSQL / SQL</option>
                <option value="Java">Java</option>
                <option value="Cybersecurity">Ciberseguridad / WAF</option>
                <option value="QA">Pytest / QA & Testing</option>
                <option value="Pandas">Streamlit & Pandas</option>
                <option value="HTML5">HTML5 & CSS3</option>
                <option value="AI">IA Generativa / LLMs</option>
                <option value="Docker">Docker & Linux</option>
                <option value="Git">Git & GitHub</option>
              </select>
            </div>
          </div>
        </section>

        {/* Listado de Ofertas con Paginación de 10 en 10 */}
        {(() => {
          const totalPages = Math.ceil(jobs.length / itemsPerPage) || 1;
          const safeCurrentPage = Math.min(currentPage, totalPages);
          const startIndex = (safeCurrentPage - 1) * itemsPerPage;
          const endIndex = Math.min(startIndex + itemsPerPage, jobs.length);
          const paginatedJobs = jobs.slice(startIndex, endIndex);

          if (loading) {
            return (
              <div className="p-12 text-center text-slate-400">
                Cargando ofertas evaluadas por Motor A + Motor B (IA)...
              </div>
            );
          }

          if (jobs.length === 0) {
            return (
              <div className="p-12 text-center rounded-xl border border-slate-800 bg-slate-900/40 text-slate-400">
                No se encontraron ofertas con esos filtros. Prueba seleccionando &quot;Todas las regiones&quot;.
              </div>
            );
          }

          return (
            <div className="space-y-6">
              {/* Barra de Rango de Paginación Superior */}
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 bg-slate-900/40 px-3.5 py-2 rounded-lg border border-slate-800 gap-2">
                <span>
                  Mostrando ofertas{" "}
                  <strong className="text-white">
                    {jobs.length === 0 ? 0 : startIndex + 1} - {endIndex}
                  </strong>{" "}
                  de <strong className="text-white">{jobs.length}</strong> (Página{" "}
                  <strong className="text-white">{safeCurrentPage}</strong> de{" "}
                  <strong className="text-white">{totalPages}</strong>)
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-semibold hidden sm:inline">
                    10 ofertas por página
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const allCollapsed =
                        paginatedJobs.length > 0 &&
                        paginatedJobs.every((j) => collapsedCards[j.id]);
                      const next = { ...collapsedCards };
                      paginatedJobs.forEach((j) => {
                        next[j.id] = !allCollapsed;
                      });
                      setCollapsedCards(next);
                    }}
                    className="text-xs text-slate-300 hover:text-cyan-300 transition flex items-center gap-1 cursor-pointer bg-slate-800/80 hover:bg-slate-750 px-2.5 py-1 rounded-md border border-slate-700 font-medium"
                  >
                    {paginatedJobs.length > 0 &&
                    paginatedJobs.every((j) => collapsedCards[j.id])
                      ? "⊞ Desplegar todas"
                      : "⊟ Minimizar todas"}
                  </button>
                </div>
              </div>

              <section className="space-y-4">
                {paginatedJobs.map((job) => {
                  const isExpanded = !collapsedCards[job.id];
                  return (
                  <article
                    key={job.id}
                    className={`rounded-2xl border p-5 sm:p-6 transition shadow-lg ${
                      job.is_discarded
                        ? "border-rose-500/30 bg-rose-950/10"
                        : job.is_asturias_local
                        ? "border-blue-500/40 bg-slate-900/90 hover:border-blue-400/60"
                        : "border-slate-800 bg-slate-900/80 hover:border-emerald-500/40"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-[260px]">
                        <div className="flex flex-wrap items-center gap-2">
                          {job.top_20_rank && !job.is_discarded && (
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-amber-400 text-slate-950">
                              TOP #{job.top_20_rank}
                            </span>
                          )}
                          {isJobNew(job) && (
                            <span
                              title="Oferta descubierta hace menos de 24 horas"
                              className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1 shadow-sm"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              ✨ NUEVA (&lt; 24h)
                            </span>
                          )}
                          {getRegionBadge(job)}
                          <span className="px-2.5 py-1 rounded-full text-xs bg-slate-800 text-slate-300 border border-slate-700">
                            {job.source}
                          </span>
                          {job.salary_range && (
                            <span className="px-2.5 py-1 rounded-full text-xs bg-emerald-950/80 text-emerald-300 border border-emerald-700/40 font-medium">
                              💰 {job.salary_range}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg sm:text-xl font-bold text-white">
                          {job.title}
                        </h3>
                        <p className="text-sm text-slate-300 font-medium">
                          🏢 {job.company} ·{" "}
                          <span className="text-slate-400">{job.location}</span> ·{" "}
                          <span className="text-cyan-300">{job.language_required}</span>
                        </p>
                      </div>

                      {/* Puntuación */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`px-4 py-2.5 rounded-xl border text-center min-w-[115px] ${getScoreBadgeColor(
                            job.final_score,
                            job.is_discarded
                          )}`}
                        >
                          <div className="text-2xl font-extrabold">
                            {job.final_score}%
                          </div>
                          <div className="text-[10px] uppercase tracking-wider opacity-80">
                            {job.is_discarded ? "Descartada" : "Compatibilidad"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                      {job.description}
                    </p>

                    {/* Skills coincidentes */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {job.technologies.map((tech) => {
                        const isMatched = job.matched_skills.includes(tech);
                        return (
                          <span
                            key={tech}
                            className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                              isMatched
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                : "bg-slate-800 text-slate-400 border-slate-700"
                            }`}
                          >
                            {isMatched ? "✓ " : ""}
                            {tech}
                          </span>
                        );
                      })}
                    </div>

                    {/* Explicación de IA (Motor B) y Pitch Recomendado */}
                    {isExpanded && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-slate-800/80">
                        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 text-xs space-y-1">
                          <div className="font-semibold text-cyan-400 flex items-start sm:items-center justify-between gap-2">
                            <span className="min-w-0">🤖 Evaluación Motor B (IA Explicativa)</span>
                            {/* En PC (lg y superior): En una sola línea */}
                            <span className="hidden lg:inline text-slate-400 shrink-0 text-right">
                              Motor A: {job.motor_a_score}% | Motor B: {job.motor_b_score}%
                            </span>
                            {/* En Tablet y Móvil (< lg): Apilado ordenadamente en dos líneas */}
                            <div className="lg:hidden text-slate-400 shrink-0 text-right flex flex-col leading-tight">
                              <span>Motor A: {job.motor_a_score}%</span>
                              <span>Motor B: {job.motor_b_score}%</span>
                            </div>
                          </div>
                          <p className="text-slate-300 leading-relaxed">
                            {job.matching_explanation}
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/25 text-xs space-y-1">
                          <div className="font-semibold text-emerald-300 flex items-center justify-between">
                            <span>🚀 Pitch Recomendado al Postular</span>
                            <span className="text-emerald-400/80">{job.entry_barrier}</span>
                          </div>
                          <p className="text-slate-200 leading-relaxed">
                            {job.recommended_pitch}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2">
                      {/* En PC y Tablet (sm y superior): En una sola línea */}
                      <div className="hidden sm:block text-xs text-slate-400">
                        Nivel: <strong className="text-slate-200">{job.experience_level}</strong>{" "}
                        · Estado:{" "}
                        <span className="uppercase font-semibold text-emerald-400">
                          {job.application_status}
                        </span>
                      </div>

                      {/* Solo en Móvil (< sm): Apilado en 2 líneas */}
                      <div className="sm:hidden text-xs text-slate-400 space-y-0.5">
                        <div>
                          Nivel: <strong className="text-slate-200">{job.experience_level}</strong>
                        </div>
                        <div>
                          Estado:{" "}
                          <span className="uppercase font-semibold text-emerald-400">
                            {job.application_status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleCard(job.id)}
                          className="px-3 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-cyan-300 hover:text-white border border-slate-700/80 font-medium text-xs transition cursor-pointer flex items-center gap-1.5"
                          title={isExpanded ? "Minimizar análisis IA" : "Desplegar análisis IA"}
                        >
                          {isExpanded ? (
                            <>
                              <span>Minimizar</span>
                              <span className="text-slate-400">▲</span>
                            </>
                          ) : (
                            <>
                              <span>🤖 Desplegar IA</span>
                              <span className="text-cyan-400">▼</span>
                            </>
                          )}
                        </button>

                        <a
                          href={job.original_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition whitespace-nowrap"
                        >
                          Abrir Oferta Original ↗
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
              </section>

              {/* Barra de Paginación Inferior */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center pt-3 pb-1 border-t border-slate-800">
                  <div className="flex items-center justify-center gap-1.5 text-xs">
                    <button
                      onClick={() => {
                        setCurrentPage((p) => Math.max(1, p - 1));
                        window.scrollTo({ top: 380, behavior: "smooth" });
                      }}
                      disabled={safeCurrentPage <= 1}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
                    >
                      ← Anterior
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === totalPages ||
                          Math.abs(p - safeCurrentPage) <= 2
                      )
                      .map((p, idx, arr) => {
                        const prev = arr[idx - 1];
                        return (
                          <React.Fragment key={p}>
                            {prev && p - prev > 1 && (
                              <span className="px-1 text-slate-500">...</span>
                            )}
                            <button
                              onClick={() => {
                                setCurrentPage(p);
                                window.scrollTo({ top: 380, behavior: "smooth" });
                              }}
                              className={`w-8 h-8 rounded-lg font-semibold transition ${
                                safeCurrentPage === p
                                  ? "bg-emerald-500 text-slate-950 font-bold"
                                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                              }`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}

                    <button
                      onClick={() => {
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 380, behavior: "smooth" });
                      }}
                      disabled={safeCurrentPage >= totalPages}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </main>

      <footer className="border-t border-slate-800/80 py-3.5 px-4 sm:px-6 text-xs text-slate-500 bg-[#0c1220]/80">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left">
          <div>
            Job Hunter AI v2.0 · Plataforma Open Source de Scouting IT · Protegido por <strong className="text-slate-400 font-semibold">Gatekeeper WAF</strong>
          </div>
          <div className="text-slate-400 flex items-center gap-1 font-medium">
            <span>⚙️</span>
            <span>Reglas y filtros configurables en candidate_profile.json</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
