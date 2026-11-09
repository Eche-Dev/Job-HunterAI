"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface WafEvent {
  timestamp: string;
  client_ip: string;
  method: string;
  path: string;
  rule_triggered: string;
  severity: string;
  details: string;
}

interface WafSummary {
  waf_name: string;
  version: string;
  status: string;
  total_inspected_requests: number;
  total_blocked_requests: number;
  rate_limit_blocks: number;
  active_rules: string[];
  recent_events: WafEvent[];
}

export default function GatekeeperWafDashboardPage() {
  const [token, setToken] = useState<string>("");
  const [wafData, setWafData] = useState<WafSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [customPayload, setCustomPayload] = useState<string>("");
  const [selectedAttackType, setSelectedAttackType] = useState<string>("SQL Injection");
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  useEffect(() => {
    const savedToken = window.localStorage.getItem("jh_admin_token");
    if (savedToken) {
      setToken(savedToken);
      loadWafData(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const loadWafData = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/waf-status`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWafData(data);
      }
    } catch (e) {
      console.error("Error cargando telemetría WAF:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleClearWafEvents = async () => {
    if (!token) return;
    if (
      !window.confirm(
        "¿Estás seguro de que deseas eliminar permanentemente todo el historial de auditoría del WAF en la base de datos?"
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/waf/events`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await loadWafData(token);
      }
    } catch (e) {
      console.error("Error limpiando eventos WAF:", e);
    }
  };

  const handleRunProbe = async (payloadToSend: string, attackLabel: string) => {
    if (!token) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/waf/test-probe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payload: payloadToSend,
          attack_type: attackLabel,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setTestResult(result);
        if (result.summary) {
          setWafData(result.summary);
        }
      } else {
        const err = await res.json();
        setTestResult({
          blocked: true,
          http_status: res.status,
          action: "INTERCEPTADO A NIVEL ASGI",
          message: err.error || "Petición bloqueada por Gatekeeper WAF.",
        });
        await loadWafData(token);
      }
    } catch {
      setTestResult({
        blocked: true,
        http_status: 403,
        action: "BLOQUEADO 403",
        message: "Conexión rechazada por el middleware de seguridad.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl text-center space-y-4">
          <div className="text-3xl">🛡️</div>
          <h1 className="text-xl font-bold text-white">Acceso Restringido</h1>
          <p className="text-xs text-slate-400">
            Debes iniciar sesión como administrador en el panel principal para ver el monitor de Gatekeeper WAF.
          </p>
          <Link
            href="/gatekeeper-admin"
            className="inline-block px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
          >
            Ir al Login de Administrador
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Barra Superior de Navegación */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
              Gatekeeper WAF 2.0 · Pure ASGI Security Engine
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <span>🛡️</span> Centro de Control y Auditoría de Seguridad
          </h1>
          <p className="text-xs text-slate-400">
            Monitor en tiempo real del middleware WAF desarrollado por Eche-Dev protegiendo FastAPI y Starlette.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/gatekeeper-admin"
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
          >
            ← Volver a Búsquedas y Ofertas
          </Link>
          <Link
            href="/"
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
          >
            Ver Web Pública
          </Link>
          <button
            onClick={() => {
              window.localStorage.removeItem("jh_admin_token");
              setToken("");
            }}
            className="px-3.5 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas en Tiempo Real */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Peticiones Inspeccionadas
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">
            {wafData?.total_inspected_requests ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Tráfico analizado a nivel ASGI antes de FastAPI
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-950/20 via-slate-900 to-slate-900">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Ataques Neutralizados (403)
          </div>
          <div className="text-3xl font-extrabold text-rose-400">
            {wafData?.total_blocked_requests ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Inyecciones SQL, XSS y Path Traversal bloqueadas
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-900">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Bloqueos Rate Limit (429)
          </div>
          <div className="text-3xl font-extrabold text-amber-300">
            {wafData?.rate_limit_blocks ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Protección de fuerza bruta en login y presupuesto
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 via-slate-900 to-slate-900">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Estado de Protección
          </div>
          <div className="text-xl font-extrabold text-cyan-300 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
            ACTIVO Y BLINDADO
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Cabeceras HTTP de seguridad inyectadas en cada respuesta
          </div>
        </div>
      </div>

      {/* Simulador Interactivo de Ataques en Vivo */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>⚡</span> Simulador Interactivo de Ataques en Vivo
            </h2>
            <p className="text-xs text-slate-400">
              Prueba tú mismo en tiempo real cómo Gatekeeper WAF intercepta y neutraliza ataques reales al instante.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            Pruebas en Vivo contra el Backend
          </span>
        </div>

        {/* Botones de Ataques Predefinidos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => {
              const payload = "' UNION SELECT * FROM users--";
              setCustomPayload(payload);
              setSelectedAttackType("SQL Injection");
              handleRunProbe(payload, "SQL Injection (UNION SELECT)");
            }}
            disabled={isTesting}
            className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/20 hover:bg-rose-900/30 text-left transition space-y-1 group"
          >
            <div className="text-xs font-bold text-rose-300 flex items-center justify-between">
              <span>🚨 Probar SQL Injection</span>
              <span className="text-[10px] font-mono opacity-70 group-hover:opacity-100">→</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 truncate">
              &apos; UNION SELECT * FROM users--
            </div>
          </button>

          <button
            onClick={() => {
              const payload = "<script>alert('Gatekeeper-XSS')</script>";
              setCustomPayload(payload);
              setSelectedAttackType("Cross-Site Scripting (XSS)");
              handleRunProbe(payload, "Cross-Site Scripting (XSS)");
            }}
            disabled={isTesting}
            className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/20 hover:bg-amber-900/30 text-left transition space-y-1 group"
          >
            <div className="text-xs font-bold text-amber-300 flex items-center justify-between">
              <span>🚨 Probar XSS Scripting</span>
              <span className="text-[10px] font-mono opacity-70 group-hover:opacity-100">→</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 truncate">
              &lt;script&gt;alert(&apos;Gatekeeper&apos;)&lt;/script&gt;
            </div>
          </button>

          <button
            onClick={() => {
              const payload = "../../../../etc/passwd";
              setCustomPayload(payload);
              setSelectedAttackType("Path Traversal / LFI");
              handleRunProbe(payload, "Path Traversal (/etc/passwd)");
            }}
            disabled={isTesting}
            className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-950/20 hover:bg-purple-900/30 text-left transition space-y-1 group"
          >
            <div className="text-xs font-bold text-purple-300 flex items-center justify-between">
              <span>🚨 Probar Path Traversal</span>
              <span className="text-[10px] font-mono opacity-70 group-hover:opacity-100">→</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 truncate">
              ../../../../etc/passwd
            </div>
          </button>

          <button
            onClick={() => {
              const payload = "Junior Python FastAPI Developer Asturias";
              setCustomPayload(payload);
              setSelectedAttackType("Petición Limpia");
              handleRunProbe(payload, "Petición Limpia Legítima");
            }}
            disabled={isTesting}
            className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-900/30 text-left transition space-y-1 group"
          >
            <div className="text-xs font-bold text-emerald-300 flex items-center justify-between">
              <span>🟢 Probar Petición Limpia</span>
              <span className="text-[10px] font-mono opacity-70 group-hover:opacity-100">→</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 truncate">
              Junior Python FastAPI Developer
            </div>
          </button>
        </div>

        {/* Input para Payload Personalizado */}
        <div className="pt-2">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            O escribe cualquier payload malicioso o texto para testear la respuesta del WAF:
          </label>
          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            <input
              type="text"
              value={customPayload}
              onChange={(e) => setCustomPayload(e.target.value)}
              placeholder="Ejemplo: 1' OR '1'='1' o <iframe src='javascript:alert(1)'> o un texto normal"
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={() => handleRunProbe(customPayload, `Manual: ${selectedAttackType}`)}
              disabled={isTesting || !customPayload.trim()}
              className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs whitespace-nowrap transition shadow-lg shadow-cyan-500/20"
            >
              {isTesting ? "⏳ Analizando..." : "Disparar Test al WAF"}
            </button>
          </div>
        </div>

        {/* Resultado del Test en Vivo */}
        {testResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-1.5 transition ${
              testResult.blocked
                ? "bg-rose-950/40 border-rose-500/50 text-rose-200"
                : "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">{testResult.blocked ? "⛔" : "✅"}</span>
                <span className="font-bold text-sm">
                  {testResult.action} (Código HTTP {testResult.http_status})
                </span>
                {testResult.rule_triggered && (
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 font-mono text-[11px] font-bold text-rose-300">
                    Regla: {testResult.rule_triggered}
                  </span>
                )}
              </div>
              <span className="text-[11px] opacity-75 font-mono">
                Interceptado a nivel ASGI
              </span>
            </div>
            <p className="text-xs opacity-90">{testResult.message}</p>
          </div>
        )}
      </section>

      {/* Tabla de Eventos de Seguridad y Auditoría en Tiempo Real */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📋</span> Registro de Auditoría de Ataques Bloqueados
            </h2>
            <p className="text-xs text-slate-400">
              Historial de intentos maliciosos neutralizados por Gatekeeper WAF con IP de origen, regla disparada y detalle.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadWafData(token)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 border border-cyan-500/30 transition flex items-center gap-1.5"
            >
              <span>🔄</span> Actualizar Registro
            </button>
            {wafData?.recent_events && wafData.recent_events.length > 0 && (
              <button
                onClick={handleClearWafEvents}
                className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-xs font-semibold text-rose-300 border border-rose-500/30 transition flex items-center gap-1.5"
              >
                <span>🗑️</span> Limpiar Historial WAF
              </button>
            )}
          </div>
        </div>

        {wafData?.recent_events && wafData.recent_events.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3">Fecha / Hora</th>
                  <th className="p-3">IP Origen</th>
                  <th className="p-3">Método / Ruta</th>
                  <th className="p-3">Regla OWASP</th>
                  <th className="p-3">Severidad</th>
                  <th className="p-3">Detalle del Ataque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono">
                {wafData.recent_events.map((evt, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 text-slate-300 whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleString("es-ES")}
                    </td>
                    <td className="p-3 text-cyan-300">{evt.client_ip}</td>
                    <td className="p-3 text-slate-200">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] mr-1.5 font-bold">
                        {evt.method}
                      </span>
                      <span className="truncate max-w-xs inline-block align-middle">
                        {evt.path}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold text-[11px]">
                        {evt.rule_triggered}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          evt.severity === "CRITICAL"
                            ? "bg-red-500/20 text-red-300 border border-red-500/40"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        }`}
                      >
                        {evt.severity}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 truncate max-w-sm">
                      {evt.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs rounded-xl bg-slate-950/40 border border-slate-800">
            Aún no hay ataques bloqueados registrados. Dispara una prueba arriba para ver cómo se registra en vivo.
          </div>
        )}
      </section>

      {/* Reglas y Defensas Activas de Gatekeeper WAF */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>🛡️</span> Reglas de Seguridad Activas en el Middleware ASGI
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-1.5">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>✓</span> OWASP-SQLi-Protection
            </div>
            <p className="text-[11px] text-slate-400">
              Bloquea patrones de inyección SQL (UNION SELECT, DROP TABLE, 1=1, SLEEP, comentarios) antes de que la consulta llegue a la base de datos.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-1.5">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>✓</span> OWASP-XSS-Filter
            </div>
            <p className="text-[11px] text-slate-400">
              Neutraliza scripts maliciosos, manejadores de eventos (onerror, onload) y etiquetas iframe en URLs y parámetros de búsqueda.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-1.5">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>✓</span> Path-Traversal-Shield
            </div>
            <p className="text-[11px] text-slate-400">
              Impide el acceso a archivos del sistema operativo mediante secuencias ../../ o rutas sensibles como /etc/passwd o system32.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-1.5">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>✓</span> BruteForce-Login-RateLimit
            </div>
            <p className="text-[11px] text-slate-400">
              Límite estricto de máximo 10 peticiones por minuto por IP en la ruta de login para evitar ataques de fuerza bruta por diccionario.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-1.5">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>✓</span> SearchRun-Cost-RateLimit
            </div>
            <p className="text-[11px] text-slate-400">
              Control de presupuesto: máximo 6 ejecuciones manuales por minuto para evitar consumo accidental de cuotas de scraping.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-1.5">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>✓</span> Strict-Security-Headers
            </div>
            <p className="text-[11px] text-slate-400">
              Inyecta cabeceras HTTP de protección: X-Protected-By: Gatekeeper-WAF-2.0, X-Content-Type-Options: nosniff y X-Frame-Options: DENY.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800/80 py-6 px-4 sm:px-6 text-xs text-slate-500 bg-[#0c1220]/80 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left">
          <div>
            Job Hunter AI v2.0 · Monitor de Seguridad en Tiempo Real · Protegido por <strong className="text-slate-400 font-semibold">Gatekeeper WAF</strong>
          </div>
          <div className="text-slate-400 flex items-center gap-1 font-medium">
            <span>🛡️</span>
            <span>Inspección Activa ASGI & OWASP Top 10</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
