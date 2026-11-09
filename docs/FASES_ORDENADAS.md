# Hoja de Ruta por Fases en Orden (Fase 0 → Despliegue Seguro)

Este documento define **todas las fases en orden estricto** para construir, verificar y desplegar **Job Hunter AI + Gatekeeper WAF**, incorporando todas las mejoras acordadas sobre tu diseño inicial de `Botwork.pdf`.

---

## Resumen de Estado Actual

| Fase | Nombre de la Fase | Archivos Principales | Estado |
| :--- | :--- | :--- | :--- |
| **Fase 0** | Especificación Definitiva, ADR y Reglas Base | `docs/SPECIFICATION.md`, `docs/ADR.md`, `docs/SECURITY.md` | ✅ Completada |
| **Fase 1** | Configuración JSON de Perfil y Comparador de 5 Herramientas | `backend/config/candidate_profile.json`, `backend/config/cost_router.json` | ✅ Completada |
| **Fase 2** | Backend FastAPI + Base de Datos + **Gatekeeper WAF** | `backend/app/main.py`, `backend/app/core/gatekeeper_waf.py`, `backend/app/models/job.py` | ✅ Completada |
| **Fase 3** | Motor Comparador de Costes (5 alternativas por fuente) | `backend/app/core/cost_control.py` | ✅ Completada |
| **Fase 4** | Conectores Multi-Región (Asturias, España, LATAM, LinkedIn Jobs + Posts) y Guardado por Partes en JSON | `backend/app/scrapers/sources.py`, `backend/app/services/search_service.py` | ✅ Completada |
| **Fase 5** | Tres Motores de Inteligencia (Motor A Determinista Asturias/Remoto + Motor B IA Explicativa + Motor C Top 20) | `backend/app/matching/engine.py` | ✅ Completada |
| **Fase 6** | Frontend Web Pública + Enlace Privado Administrador (`/gatekeeper-admin`) | `frontend/app/page.tsx`, `frontend/app/gatekeeper-admin/page.tsx` | ✅ Completada |
| **Fase 7** | Pruebas Automatizadas de Seguridad, Geografía y Costes (`pytest`) | `backend/tests/test_job_hunter.py` | ✅ Completada |
| **Fase 8** | Despliegue Seguro en Producción (**Railway** Backend/PostgreSQL + **Vercel** Frontend) | `backend/Dockerfile`, `backend/railway.json`, `docker-compose.yml` | 🚀 Lista para ejecutar |

---

## Detalle Paso a Paso de Cada Fase

### Fase 0 — Especificación Técnica, ADR y Seguridad por Diseño
1. Definir la **Regla Geográfica Inquebrantable**:
   - **Presencial o Híbrido:** Exclusivamente aceptado si está dentro del **Principado de Asturias** (Oviedo, Gijón, Avilés, Llanera / Parque Tecnológico de Asturias, Siero, Mieres, Langreo, Castrillón).
   - **Resto de España, Latinoamérica y Global:** Obligatoriamente **100% Remoto**.
2. Documentar la arquitectura en [SPECIFICATION.md](file:///d:/ADEV/ProyectosVScode/Bot%20Work/docs/SPECIFICATION.md), [ADR.md](file:///d:/ADEV/ProyectosVScode/Bot%20Work/docs/ADR.md) y [SECURITY.md](file:///d:/ADEV/ProyectosVScode/Bot%20Work/docs/SECURITY.md).

---

### Fase 1 — Archivos JSON de Perfil y Enrutador de Costes
1. Configurar tu perfil técnico en [candidate_profile.json](file:///backend/config/candidate_profile.json) con tu stack y tus proyectos personales.
2. Configurar las **5 herramientas candidatas por fuente** en [cost_router.json](file:///backend/config/cost_router.json).

---

### Fase 2 — Backend Core, PostgreSQL/SQLite y Tu Gatekeeper WAF
1. Implementar el middleware ASGI puro [gatekeeper_waf.py](file:///backend/app/core/gatekeeper_waf.py) delante de FastAPI:
   - Bloqueo activo de **SQL Injection (SQLi)**, **Cross-Site Scripting (XSS)** y **Path Traversal**.
   - **Rate Limiting por IP** específico para `/api/v1/auth/login` (10 req/min contra fuerza bruta) y `/api/v1/admin/search-runs` (6 req/min para proteger tu presupuesto).
   - Cabeceras HTTP de seguridad (`X-Protected-By: Gatekeeper-WAF-2.0`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).
2. Autenticación de administrador en [security.py](file:///backend/app/core/security.py) mediante tokens **JWT HS256** y hash criptográfico **PBKDF2-HMAC-SHA256**.

---

### Fase 3 — Comparador Inteligente de Costes (5 Herramientas por Fuente)
1. En [cost_control.py](file:///backend/app/core/cost_control.py), antes de buscar en cada plataforma, el sistema compara las 5 herramientas registradas para esa fuente:
   - Prioriza **Nivel 0 ($0.00 USD - Gratis)** mediante APIs oficiales y conectores HTTP directos.
   - Si configuras `APIFY_API_TOKEN`, compara los Actors disponibles y elige siempre el de menor coste por ejecución dentro de tu presupuesto (`MAX_SEARCH_BUDGET_USD`).
2. Guarda la auditoría completa en `00_cost_comparison_5_tools.json`.

---

### Fase 4 — Recopilación por Partes (Asturias, España, LATAM y LinkedIn)
1. Conectores en [sources.py](file:///backend/app/scrapers/sources.py) divididos en 5 lotes que se guardan **por partes en archivos JSON independientes** dentro de `backend/data/runs/<run_uid>/`:
   - `part_01_linkedin_jobs.json` — Ofertas de LinkedIn en Asturias (híbrido/presencial/remoto), España (remoto) y LATAM (remoto).
   - `part_02_linkedin_posts.json` — Publicaciones en el muro/feed de recruiters buscando Juniors en español.
   - `part_03_spain_asturias_portals.json` — Tecnoempleo, InfoJobs, Joppy y Cluster TIC Asturias / Parque Tecnológico de Llanera.
   - `part_04_latam_remote.json` — Get on Board, Torre.ai y portales IT de Latinoamérica en español / inglés B1.
   - `part_05_global_remote_apis.json` — Remotive, Himalayas, Arbeitnow, We Work Remotely y RemoteOK.

---

### Fase 5 — Motores A, B y C + Ranking de las 20 Mejores Ofertas
1. **Motor A (Determinista en Python, coste $0)** en [engine.py](file:///backend/app/matching/engine.py):
   - Descarta inmediatamente cualquier oferta presencial o híbrida fuera de la zona local permitida.
   - Descarta "falsos juniors" (ofertas Senior o que exigen >3 años obligatorios).
   - Calcula puntuación técnica de 0 a 100.
2. **Motor B (Evaluador IA + Pitch Personalizado)**:
   - Sanea descripciones contra *Prompt Injection*.
   - Evalúa solo las ofertas válidas y redacta el **Pitch Recomendado** indicando qué proyectos de `candidate_profile.json` enseñar en esa entrevista.
3. **Motor C (Ranking Final Top 20)**:
   - Selecciona las **20 mejores ofertas** donde tienes mayor probabilidad real de ser contratado y las guarda en `top_20_recommendations.json`, `backend/data/latest_top_20.json` y en la base de datos.

---

### Fase 6 — Frontend Next.js (Web Pública + Enlace Privado Administrador)
1. **Web Pública ([page.tsx](file:///frontend/app/page.tsx)):**
   - Muestra KPIs, filtros por región (**Asturias**, **España Remoto**, **LATAM Remoto**, **Global**), fuente y tecnología, y las tarjetas del **Top 20** con su explicación IA y pitch.
2. **Panel Privado ([gatekeeper-admin/page.tsx](file:///frontend/app/gatekeeper-admin/page.tsx)):**
   - Ruta separada `/gatekeeper-admin` protegida por login y **Gatekeeper WAF**.
   - Botón de actualización manual, tabla del comparador de las 5 herramientas por fuente, monitor de ataques bloqueados por Gatekeeper WAF y selector de estado de cada candidatura (*Pendiente*, *Favorita*, *Solicitada*, *Entrevista*).

---

### Fase 7 — Verificación Automatizada (`pytest`)
1. Suite en [test_job_hunter.py](file:///d:/ADEV/ProyectosVScode/Bot%20Work/backend/tests/test_job_hunter.py) que valida:
   - Regla geográfica estricta de Asturias vs. Madrid/LATAM.
   - Comparador de 5 herramientas por fuente.
   - Bloqueo de ataques SQLi y XSS con **Gatekeeper WAF**.
   - Generación de los archivos JSON por partes y del Top 20.

---

### Fase 8 — Despliegue Seguro en Railway (Backend + PostgreSQL) y Vercel (Frontend)
1. **Backend + PostgreSQL en Railway:**
   - Desplegar la carpeta `backend/` usando [Dockerfile](file:///d:/ADEV/ProyectosVScode/Bot%20Work/backend/Dockerfile) y [railway.json](file:///d:/ADEV/ProyectosVScode/Bot%20Work/backend/railway.json).
   - Provisionar el servicio **PostgreSQL** en Railway y vincular `DATABASE_URL`, `JWT_SECRET_KEY`, `ADMIN_USERNAME` y `ADMIN_PASSWORD`.
2. **Frontend en Vercel:**
   - Conectar la carpeta `frontend/` en Vercel con la variable de entorno `NEXT_PUBLIC_API_URL` apuntando al dominio HTTPS de tu backend en Railway.
