"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { JobOffer } from "../page";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ToolComparison {
  tool_id: string;
  name: string;
  provider: string;
  actor_id?: string | null;
  pricing_model: string;
  cost_per_run_usd: number;
  cost_per_100_results_usd: number;
  estimated_cost_usd: number;
  reliability_score: number;
  is_available: boolean;
  unavailability_reason?: string | null;
  notes: string;
}

interface SourceEvaluation {
  source_key: string;
  display_name: string;
  region: string;
  selected_tool: ToolComparison;
  most_expensive_cost_usd: number;
  estimated_savings_usd: number;
  all_5_candidates_comparison: ToolComparison[];
}

interface ApifyAccountStatus {
  connected: boolean;
  username?: string;
  email?: string;
  plan: string;
  monthly_limit_usd: number;
  current_usage_usd: number;
  remaining_usd: number;
}

interface HistorySummary {
  total_runs_count: number;
  total_runs_spent_usd: number;
  total_runs_saved_usd: number;
}

export default function GatekeeperAdminPage() {
  const [token, setToken] = useState<string>("");
  const [username, setUsername] = useState<string>("admin");
  const [password, setPassword] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [isRunningSearch, setIsRunningSearch] = useState<boolean>(false);
  const [runMessage, setRunMessage] = useState<string>("");
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [costComparisons, setCostComparisons] = useState<SourceEvaluation[]>([]);
  const [apifyAccount, setApifyAccount] = useState<ApifyAccountStatus | null>(null);
  const [costTotals, setCostTotals] = useState<{
    total_estimated_cost_usd: number;
    total_worst_case_cost_usd: number;
    total_estimated_savings_usd: number;
  } | null>(null);
  const [historySummary, setHistorySummary] = useState<HistorySummary | null>(null);
  const [wafStatus, setWafStatus] = useState<any>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [tableFilter, setTableFilter] = useState<string>("all");
  const itemsPerPage = 50;

  const toggleCard = (sourceKey: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [sourceKey]: !prev[sourceKey],
    }));
  };

  const setAllCardsState = (expand: boolean) => {
    const updated: Record<string, boolean> = {};
    costComparisons.forEach((src) => {
      updated[src.source_key] = expand;
    });
    setExpandedCards(updated);
  };

  useEffect(() => {
    const saved = window.localStorage.getItem("jh_admin_token");
    if (saved) {
      setToken(saved);
      loadAdminData(saved);
    }
  }, []);

  const loadAdminData = async (jwtToken: string) => {
    try {
      const [jobsRes, costRes, wafRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/jobs?include_discarded=true`),
        fetch(`${API_BASE}/api/v1/cost-comparison`),
        fetch(`${API_BASE}/api/v1/admin/waf-status`, {
          headers: { Authorization: `Bearer ${jwtToken}` },
        }),
      ]);
      if (jobsRes.ok) setJobs(await jobsRes.json());
      if (costRes.ok) {
        const cData = await costRes.json();
        setCostComparisons(cData.sources_evaluated || []);
        if (cData.apify_account) setApifyAccount(cData.apify_account);
        if (cData.history_summary) setHistorySummary(cData.history_summary);
        setCostTotals({
          total_estimated_cost_usd: cData.total_estimated_cost_usd ?? 0,
          total_worst_case_cost_usd: cData.total_worst_case_cost_usd ?? 0,
          total_estimated_savings_usd: cData.total_estimated_savings_usd ?? 0,
        });
      }
      if (wafRes.ok) {
        setWafStatus(await wafRes.json());
      } else if (wafRes.status === 401) {
        window.localStorage.removeItem("jh_admin_token");
        setToken("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const errData = await res.json();
        setAuthError(errData.detail || "Error de autenticación");
        return;
      }
      const data = await res.json();
      window.localStorage.setItem("jh_admin_token", data.access_token);
      setToken(data.access_token);
      loadAdminData(data.access_token);
    } catch {
      setAuthError("No se pudo conectar con el backend FastAPI.");
    }
  };

  const handleManualSearchRun = async () => {
    setIsRunningSearch(true);
    setRunMessage(
      "⏳ Conectando en tiempo real con LinkedIn (Asturias, España Remoto, LATAM), Get on Board API, Remotive, Himalayas, Arbeitnow, RemoteOK y Apify..."
    );
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/search-runs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        const newFoundText =
          data.new_offers_count !== undefined
            ? ` | ✨ ${data.new_offers_count} nuevas ofertas añadidas con insignia destacada`
            : "";
        setRunMessage(
          `✅ Extracción en tiempo real completada (${data.run_uid}): ${data.total_found} ofertas reales evaluadas (${data.total_valid_after_motor_a} válidas, ${data.total_discarded} descartadas por Motor A, ${data.top_20_count} en el Top 20)${newFoundText}. Coste estimado: $${Number(data.estimated_cost_usd).toFixed(4)} USD (Ahorro: $${Number(data.saved_cost_usd).toFixed(4)} USD).`
        );
        await loadAdminData(token);
      } else {
        const err = await res.json();
        setRunMessage(`❌ Error: ${err.detail || err.error}`);
      }
    } catch {
      setRunMessage("❌ Error ejecutando la búsqueda en tiempo real.");
    } finally {
      setIsRunningSearch(false);
    }
  };

  const handleStatusChange = async (jobId: number, newStatus: string) => {
    const res = await fetch(`${API_BASE}/api/v1/admin/jobs/${jobId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ application_status: newStatus }),
    });
    if (res.ok) {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId ? { ...j, application_status: newStatus } : j
        )
      );
    }
  };

  const handleDeleteJob = async (jobId: number, title: string) => {
    if (
      !window.confirm(
        `¿Estás seguro de que deseas eliminar permanentemente de la base de datos la oferta "${title}"?`
      )
    ) {
      return;
    }
    const res = await fetch(`${API_BASE}/api/v1/admin/jobs/${jobId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl space-y-6">
          <div className="space-y-2 text-center">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              🛡️ Protegido por Gatekeeper WAF
            </span>
            <h1 className="text-2xl font-bold text-white pt-2">
              Acceso Privado Administrador
            </h1>
            <p className="text-xs text-slate-400">
              Solo Eche-Dev puede lanzar ejecuciones manuales de scraping y
              modificar estados.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Usuario Administrador
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña de administrador"
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
              />
            </div>
            {authError && (
              <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-500/30 p-2.5 rounded-lg">
                {authError}
              </p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition"
            >
              Entrar al Panel Privado
            </button>
          </form>

          <div className="text-center pt-2">
            <Link href="/" className="text-xs text-cyan-400 hover:underline">
              ← Volver a la Web Pública
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
            Enlace Administrativo Separado · Gatekeeper WAF Activo
          </span>
          <h1 className="text-2xl font-bold text-white">
            Panel de Control de Job Hunter (Eche-Dev)
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/gatekeeper-admin/waf"
            className="px-3.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <span>🛡️</span> Monitor WAF en Vivo
          </Link>
          <Link
            href="/"
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
          >
            ← Ver Web Pública
          </Link>
          <button
            onClick={() => {
              window.localStorage.removeItem("jh_admin_token");
              setToken("");
            }}
            className="px-3.5 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Botón de Ejecución Manual en Tiempo Real */}
      <section className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">
              1. Extracción en Tiempo Real por Partes (LinkedIn + Asturias + España + LATAM + Global)
            </h2>
            <p className="text-xs text-slate-300">
              Compara las 5 herramientas por fuente, extrae ofertas verdaderas publicadas hoy, guarda los 5 archivos JSON en{" "}
              <code className="text-emerald-300">backend/data/runs/</code> y recalcula el Top 20 con Motor A + Motor B (IA).
            </p>
          </div>
          <button
            onClick={handleManualSearchRun}
            disabled={isRunningSearch}
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition"
          >
            {isRunningSearch
              ? "⏳ Extrayendo Ofertas en Vivo..."
              : "🚀 Buscar Nuevas Ofertas Ahora"}
          </button>
        </div>
        {runMessage && (
          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-emerald-300">
            {runMessage}
          </div>
        )}
      </section>

      {/* Estado de Cuenta Apify + Comparador de 5 herramientas por fuente */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">
              2. Comparador Inteligente de Costes (5 Herramientas por Fuente) + Cuenta Apify
            </h2>
            <p className="text-xs text-slate-400">
              Antes de buscar en cada página, el sistema compara el precio de 5 herramientas distintas y selecciona la más barata.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAllCardsState(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 border border-cyan-500/30 transition flex items-center gap-1.5"
            >
              <span>🔽</span> Desplegar Todas (5)
            </button>
            <button
              onClick={() => setAllCardsState(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition flex items-center gap-1.5"
            >
              <span>🔼</span> Minimizar Todas
            </button>
          </div>
        </div>

        {apifyAccount && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-xs">
            <span className="text-cyan-400 font-bold">
              🔌 Apify Conectado: {apifyAccount.username} ({apifyAccount.plan})
            </span>
            <span className="text-slate-300">
              Consumo real factura Apify:{" "}
              <strong className="text-emerald-400 font-mono">
                ${Number(apifyAccount.current_usage_usd).toFixed(5)} USD
              </strong>
            </span>
            {historySummary && (
              <span className="text-slate-300 border-l border-slate-700 pl-3">
                Gasto acumulado del bot ({historySummary.total_runs_count} búsquedas):{" "}
                <strong className="text-amber-300 font-mono">
                  ${Number(historySummary.total_runs_spent_usd).toFixed(4)} USD
                </strong>
              </span>
            )}
            <span className="text-slate-300 border-l border-slate-700 pl-3">
              Saldo restante:{" "}
              <strong className="text-white font-mono">
                ${Number(apifyAccount.remaining_usd).toFixed(2)} / $
                {Number(apifyAccount.monthly_limit_usd).toFixed(2)} USD
              </strong>
            </span>
          </div>
        )}

        {costTotals && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-emerald-950/25 border border-emerald-500/30">
              <div className="text-xs text-slate-400">
                Coste Total Elegido (5 Fuentes)
              </div>
              <div className="text-2xl font-extrabold text-emerald-400">
                ${costTotals.total_estimated_cost_usd.toFixed(4)} USD
              </div>
              <div className="text-[11px] text-slate-400">
                Seleccionando la herramienta #1 más barata en cada fuente
              </div>
            </div>
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30">
              <div className="text-xs text-slate-400">
                Coste si usaras las herramientas caras (Navegador/Proxies)
              </div>
              <div className="text-2xl font-extrabold text-rose-400">
                ${costTotals.total_worst_case_cost_usd.toFixed(4)} USD
              </div>
              <div className="text-[11px] text-slate-400">
                Playwright + Proxies residenciales por búsqueda
              </div>
            </div>
            <div className="p-4 rounded-xl bg-cyan-950/25 border border-cyan-500/30">
              <div className="text-xs text-slate-400">
                Ahorro Inteligente por Búsqueda
              </div>
              <div className="text-2xl font-extrabold text-cyan-300">
                ${costTotals.total_estimated_savings_usd.toFixed(4)} USD (98% ahorro)
              </div>
              <div className="text-[11px] text-slate-400">
                Protegiendo tus $5.00 USD mensuales de Apify
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {costComparisons.map((src) => {
            const isExpanded = Boolean(expandedCards[src.source_key]);
            const candidatesToShow = isExpanded
              ? src.all_5_candidates_comparison
              : src.all_5_candidates_comparison.filter(
                  (c) => c.tool_id === src.selected_tool.tool_id
                );

            return (
              <div
                key={src.source_key}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3 transition duration-200"
              >
                <div
                  onClick={() => toggleCard(src.source_key)}
                  className="flex flex-wrap items-center justify-between gap-2 cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm transition transform group-hover:scale-110">
                      {isExpanded ? "🔼" : "🔽"}
                    </span>
                    <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition">
                      {src.display_name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      Ahorras ${Number(src.estimated_savings_usd).toFixed(4)} USD
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      Elegida: ${Number(src.selected_tool.estimated_cost_usd).toFixed(4)} USD
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCard(src.source_key);
                      }}
                      className="text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                    >
                      {isExpanded ? "Minimizar ▲" : "Desplegar ▼"}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {candidatesToShow.map((cand) => {
                    const idx = src.all_5_candidates_comparison.findIndex(
                      (c) => c.tool_id === cand.tool_id
                    );
                    const isWinner =
                      cand.tool_id === src.selected_tool.tool_id;
                    return (
                      <div
                        key={cand.tool_id}
                        className={`p-2.5 rounded-lg text-xs flex flex-col gap-1 border transition ${
                          isWinner
                            ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                            : "bg-slate-950/50 border-slate-800/80 text-slate-400"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold truncate">
                            #{idx + 1} {cand.name}
                          </span>
                          <span className="whitespace-nowrap font-mono font-bold">
                            ${Number(cand.estimated_cost_usd).toFixed(4)} USD{" "}
                            {isWinner ? "✓ MÁS BARATA" : ""}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] opacity-80">
                          <span>{cand.notes}</span>
                          <span className="whitespace-nowrap ml-2">
                            Fiabilidad: {cand.reliability_score}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Botón inferior para alternar entre minimizado y desplegado */}
                <button
                  type="button"
                  onClick={() => toggleCard(src.source_key)}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-950/60 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 border border-slate-800/80 transition flex items-center justify-center gap-1.5"
                >
                  {isExpanded ? (
                    <>
                      <span>🔼</span> Minimizar a herramienta elegida
                    </>
                  ) : (
                    <>
                      <span>🔽</span> Ver las 5 herramientas comparadas (4 alternativas descartadas)
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Gestión de candidaturas con paginación de 50 en 50 */}
      <section className="space-y-4">
        {(() => {
          const isJobNew = (j: JobOffer) => {
            if (j.is_new !== undefined) return Boolean(j.is_new);
            if (j.discovered_at) {
              const diffHours =
                (Date.now() - new Date(j.discovered_at).getTime()) /
                (1000 * 3600);
              return diffHours < 24;
            }
            return false;
          };

          const filteredJobs = jobs.filter((j) => {
            if (tableFilter === "top20") return j.is_top_20;
            if (tableFilter === "new") return isJobNew(j);
            if (tableFilter === "valid") return !j.is_discarded;
            if (tableFilter === "discarded") return j.is_discarded;
            if (tableFilter === "favorites")
              return j.application_status === "favorita";
            if (tableFilter === "applications")
              return ["solicitada", "entrevista"].includes(
                j.application_status
              );
            return true;
          });

          const totalPages = Math.ceil(filteredJobs.length / itemsPerPage) || 1;
          const safeCurrentPage = Math.min(currentPage, totalPages);
          const startIndex = (safeCurrentPage - 1) * itemsPerPage;
          const endIndex = Math.min(startIndex + itemsPerPage, filteredJobs.length);
          const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

          return (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    3. Gestión de Estados de Candidaturas Reales ({jobs.length} registradas)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Navegación paginada de 50 en 50 para evitar scroll infinito y gestionar cada postulación rápidamente.
                  </p>
                </div>

                {/* Filtros rápidos de tabla */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    onClick={() => {
                      setTableFilter("all");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
                      tableFilter === "all"
                        ? "bg-slate-700 text-white border-slate-600"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    Todas ({jobs.length})
                  </button>
                  <button
                    onClick={() => {
                      setTableFilter("top20");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
                      tableFilter === "top20"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    ⭐ Top 20 ({jobs.filter((j) => j.is_top_20).length})
                  </button>
                  <button
                    onClick={() => {
                      setTableFilter("new");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
                      tableFilter === "new"
                        ? "bg-emerald-500/30 text-emerald-300 border-emerald-500/50"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    ✨ Nuevas (&lt; 24h) ({jobs.filter(isJobNew).length})
                  </button>
                  <button
                    onClick={() => {
                      setTableFilter("valid");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
                      tableFilter === "valid"
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    Válidas ({jobs.filter((j) => !j.is_discarded).length})
                  </button>
                  <button
                    onClick={() => {
                      setTableFilter("discarded");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
                      tableFilter === "discarded"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    Descartadas ({jobs.filter((j) => j.is_discarded).length})
                  </button>
                  <button
                    onClick={() => {
                      setTableFilter("favorites");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
                      tableFilter === "favorites"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    ⭐ Favoritas (
                    {
                      jobs.filter((j) => j.application_status === "favorita")
                        .length
                    }
                    )
                  </button>
                  <button
                    onClick={() => {
                      setTableFilter("applications");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
                      tableFilter === "applications"
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    📨 Mis Postulaciones (
                    {
                      jobs.filter((j) =>
                        ["solicitada", "entrevista"].includes(
                          j.application_status
                        )
                      ).length
                    }
                    )
                  </button>
                </div>
              </div>

              {/* Barra informativa de rango visible */}
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 bg-slate-900/40 px-3.5 py-2 rounded-lg border border-slate-800">
                <span>
                  Mostrando ofertas{" "}
                  <strong className="text-white">
                    {filteredJobs.length === 0 ? 0 : startIndex + 1} - {endIndex}
                  </strong>{" "}
                  de <strong className="text-white">{filteredJobs.length}</strong>{" "}
                  {tableFilter !== "all" ? `(filtradas de ${jobs.length})` : ""}
                </span>
                <span className="text-[11px] text-slate-500">
                  Página {safeCurrentPage} de {totalPages} (50 ofertas por página)
                </span>
              </div>

              {/* Tabla de 50 ofertas */}
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase">
                    <tr>
                      <th className="p-3 whitespace-nowrap">Rank / Score</th>
                      <th className="p-3">Puesto y Empresa</th>
                      <th className="p-3">Ubicación / Regla</th>
                      <th className="p-3 whitespace-nowrap">Enlace Real</th>
                      <th className="p-3 whitespace-nowrap">Estado Candidatura</th>
                      <th className="p-3 text-center w-14"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                    {paginatedJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-bold whitespace-nowrap">
                          {job.is_discarded ? (
                            <span className="text-rose-400">
                              DESCARTADA ({job.final_score}%)
                            </span>
                          ) : (
                            <span className="text-emerald-400">
                              {job.top_20_rank ? `#${job.top_20_rank} · ` : ""}
                              {job.final_score}%
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-white flex items-center gap-2 flex-wrap">
                            <span>{job.title}</span>
                            {isJobNew(job) && (
                              <span
                                title="Oferta descubierta hace menos de 24 horas"
                                className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1 shadow-sm"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                ✨ NUEVA (&lt; 24h)
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400">
                            {job.company} · {job.source}
                          </div>
                        </td>
                        <td className="p-3">
                          <div>{job.location}</div>
                          {job.discard_reason && (
                            <div className="text-rose-400 text-[11px]">
                              {job.discard_reason}
                            </div>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <a
                            href={job.original_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-400 hover:underline font-semibold whitespace-nowrap inline-flex items-center gap-1"
                          >
                            Ver oferta ↗
                          </a>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <select
                            value={job.application_status}
                            onChange={(e) =>
                              handleStatusChange(job.id, e.target.value)
                            }
                            className="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200"
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="favorita">⭐ Favorita</option>
                            <option value="solicitada">
                              📨 Solicitada (CV Enviado)
                            </option>
                            <option value="entrevista">🎯 En Entrevista</option>
                            <option value="descartada">❌ Descartada</option>
                          </select>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteJob(job.id, job.title)}
                            title="Eliminar oferta de la base de datos"
                            aria-label="Eliminar oferta"
                            className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition text-sm hover:scale-105 active:scale-95"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Barra de Paginación Inferior */}
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 pb-6">
                  <div className="text-xs text-slate-400">
                    Página <strong className="text-white">{safeCurrentPage}</strong>{" "}
                    de <strong className="text-white">{totalPages}</strong> (
                    {filteredJobs.length} ofertas en total)
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={safeCurrentPage === 1}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 border border-slate-800 text-xs text-slate-300 font-semibold transition"
                      title="Primera página"
                    >
                      « Primera
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safeCurrentPage === 1}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 border border-slate-800 text-xs text-slate-300 font-semibold transition"
                    >
                      ‹ Anterior
                    </button>

                    {/* Botones de páginas individuales */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold border transition ${
                            safeCurrentPage === pageNum
                              ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
                              : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800"
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    )}

                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={safeCurrentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 border border-slate-800 text-xs text-slate-300 font-semibold transition"
                    >
                      Siguiente ›
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={safeCurrentPage === totalPages}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 border border-slate-800 text-xs text-slate-300 font-semibold transition"
                      title="Última página"
                    >
                      Última »
                    </button>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </section>

      <footer className="border-t border-slate-800/80 py-6 px-4 sm:px-6 text-xs text-slate-500 bg-[#0c1220]/80 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left">
          <div>
            Job Hunter AI v2.0 · Panel de Control Administrativo · Protegido por <strong className="text-slate-400 font-semibold">Gatekeeper WAF</strong>
          </div>
          <div className="text-slate-400 flex items-center gap-1 font-medium">
            <span>🛡️</span>
            <span>Acceso Seguro con JWT & Monitoreo Perimetral</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
