# Architecture Decision Records (ADR) — Job Hunter

## ADR-001: Ejecución de Búsquedas por Partes y Persistencia Dual (JSON + PostgreSQL)
- **Contexto:** Las búsquedas en múltiples portales pueden tardar entre 15 segundos y 2 minutos, y el propietario necesita trazabilidad por partes en archivos `.json` además de persistencia relacional en PostgreSQL para la web.
- **Decisión:**
  1. Cada ejecución (`SearchRun`) crea una carpeta con timestamp en `backend/data/runs/<run_id>/`.
  2. Cada conector guarda su lote individual en `part_<numero>_<fuente>.json`.
  3. El resultado consolidado y el **Top 20 final** se guardan tanto en `top_20_recommendations.json` como en la base de datos PostgreSQL (con soporte automático para SQLite en entorno local si no se define `DATABASE_URL`).

## ADR-002: Comparador de Costes de 5 Herramientas por Fuente (Smart Cost Router)
- **Contexto:** Existen herramientas de scraping muy caras (actores con navegador y proxies residenciales) y alternativas gratuitas o ultra-baratas.
- **Decisión:** Antes de ejecutar cualquier conector, el módulo `CostRouterService` evalúa las **5 herramientas registradas para esa fuente** en `config/cost_router.json`:
  - Calcula el `estimated_cost_usd` para el volumen de ofertas solicitado.
  - Descarta herramientas deshabilitadas o que requieran credenciales no configuradas (por ejemplo, si no hay `APIFY_API_TOKEN`, selecciona automáticamente la alternativa de Nivel 0 gratuita sin fallar).
  - Ordena las candidatas por **menor coste efectivo ajustado por fiabilidad** y registra en el log de auditoría qué herramienta ganó la comparativa de las 5 y cuánto dinero ahorró.

## ADR-003: Arquitectura de Tres Motores (A: Determinista, B: IA, C: Ranking Top 20)
- **Contexto:** Enviar cientos de ofertas crudas a un LLM es caro, lento e innecesario cuando muchas ofertas son presenciales fuera de Asturias o piden 5+ años de experiencia.
- **Decisión:**
  - **Motor A (Python puro, coste $0):** Aplica la regla geográfica estricta (**Presencial/Híbrido = SOLO Principado de Asturias; resto = 100% Remoto**), detecta experiencia exigida y calcula compatibilidad de stack.
  - **Motor B (IA / Evaluador Cualitativo):** Solo recibe las ofertas preseleccionadas por el Motor A. Incluye un motor heurístico inteligente de respaldo (fallback coste $0) y soporte nativo para APIs compatibles con OpenAI / Gemini / Groq.
  - **Motor C (Ranking Final):** Selecciona exactamente las **20 mejores ofertas** donde el candidato tiene mayor probabilidad real de superar el proceso de selección.

## ADR-004: Seguridad con Gatekeeper WAF y Enlace Administrativo Separado
- **Contexto:** La aplicación tendrá una vista pública (para mostrar en el portfolio) y una vista privada de administración para lanzar búsquedas y gestionar candidaturas.
- **Decisión:**
  - Integrar el middleware **Gatekeeper WAF** en el backend FastAPI para inspeccionar cabeceras, query params y payloads JSON contra SQLi, XSS, Path Traversal y abuso de fuerza bruta.
  - Separar las rutas públicas (`/api/v1/jobs`) de las administrativas (`/api/v1/admin/*`), exigiendo JWT firmado + Rate Limiting estricto en login y ejecución de búsquedas.
