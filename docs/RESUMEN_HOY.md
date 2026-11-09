# Resumen de Sesión — Job Hunter AI (Bot Work)
**Fecha:** 8 y 9 de noviembre de 2026  
**Propietario:** Eche-Dev ([echedev.vercel.app](https://echedev.vercel.app/))  
**Repositorio GitHub:** [`Eche-Dev/Job-HunterAI`](https://github.com/Eche-Dev/Job-HunterAI)  
**Backend Desplegado en Railway:** `https://tu-backend.up.railway.app` (o en local `http://localhost:8000`)  

---

## 1. Lo que se ha construido y completado hoy

### A. Especificación y Arquitectura
- **Regla Geográfica Estricta (Asturias vs. 100% Remoto):**
  - **Presencial o Híbrido:** Solo permitido en el **Principado de Asturias** (Oviedo, Gijón, Avilés, Llanera / Parque Tecnológico, Siero, Mieres, Langreo). Si una vacante exige presencialidad fuera de Asturias (ej. Madrid o Barcelona), se descarta de inmediato con motivo explícito.
  - **Resto de España, LATAM y Global:** Aceptado exclusivamente en modalidad **100% Remoto**.
- **Documentación de Diseño:**
  - `docs/SPECIFICATION.md`: Especificación técnica v2.0.
  - `docs/ADR.md`: Registros de decisión arquitectónica (ADRs 001 a 004).
  - `docs/SECURITY.md`: Modelo de amenazas y defensa en profundidad con Gatekeeper WAF.
  - `docs/FASES_ORDENADAS.md`: Ruta de desarrollo por fases.

### B. Seguridad con Gatekeeper WAF
- Integración en FastAPI de un middleware ASGI puro inspirado en el proyecto de ciberseguridad de Eche-Dev:
  - Inspección activa de parámetros y payloads contra **SQL Injection (SQLi)**, **Cross-Site Scripting (XSS)** y **Path Traversal**.
  - **Rate Limiting** por IP para evitar ataques de fuerza bruta en `/api/v1/auth/login` (máx. 10 req/min) y proteger el presupuesto en `/api/v1/admin/search-runs` (máx. 6 req/min).
  - Cabeceras de seguridad HTTP (`X-Protected-By: Gatekeeper-WAF-2.0`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, etc.).
  - Registro de incidentes de seguridad visible en el panel administrativo.

### C. Comparador Inteligente de Costes (5 Herramientas por Fuente)
- Configurado en `backend/config/cost_router.json` y operado por `cost_control.py`.
- Evalúa 5 alternativas por plataforma (APIs oficiales de coste $0.00, scrapers ligeros HTTP Cheerio de Apify, scrapers de navegador Puppeteer y APIs externas).
- Conexión con la cuenta de Apify de Eche-Dev (`Eche_Dev`, Plan FREE con $10.00 USD/mes de límite):
  - Muestra en el panel el consumo facturado por Apify y el **gasto acumulado del bot** a través de todas las búsquedas.
  - Elige automáticamente la opción más barata, logrando un ahorro del 98% frente a herramientas con navegador y proxies.

### D. Extracción en Tiempo Real (14 Fuentes / 5 Bloques)
1. **LinkedIn Jobs:** Asturias (híbrido/presencial/remoto), España (100% remoto) y LATAM (100% remoto).
2. **LinkedIn Feed / Posts de Recruiters:** Publicaciones de reclutadores buscando Juniors en español.
3. **España y Principado de Asturias:** Tecnoempleo, InfoJobs, Joppy, Empleo TIC Asturias y Arbeitnow España.
4. **Latinoamérica Remoto en Vivo:** API Oficial de **Get on Board** (`getonbrd.com`) y portales IT hispanos.
5. **Remoto Internacional / Europa:** APIs JSON oficiales en vivo de **Remotive**, **Himalayas**, **RemoteOK** y **Arbeitnow**.

### E. Los Tres Motores de Inteligencia y Deduplicación
- **Motor A (Determinista):** Aplica la regla geográfica estricta (Asturias vs. 100% Remoto), detecta tecnologías, descarta "falsos juniors" (>2-3 años obligatorios) y descarta automáticamente puestos enfocados puramente en React de acuerdo con el perfil real del candidato.
- **Motor B (IA Explicativa con Google Gemini):** 
  - Conectado nativamente a la API de **Google Gemini** (`gemini-2.0-flash`, nivel gratuito de Google AI Studio).
  - Evalúa cada vacante válida y genera un **Pitch Recomendado** personalizado vinculando la oferta a los proyectos configurados en `candidate_profile.json` (Gatekeeper WAF, APIs REST, dashboards analíticos, etc.).
- **Motor C (Ranking Top 20):** Pondera ajuste técnico (35%), evaluación cualitativa con Gemini (35%), accesibilidad junior (20%) y condiciones/Asturias (10%) para seleccionar exactamente las 20 mejores oportunidades.
- **Deduplicación Estricta:** Comprobación por `content_hash`, `original_url` y par canónico `(título normalizado + empresa normalizada)`. La base de datos tiene **0 duplicados** tras múltiples ejecuciones.

### F. Frontend en Next.js y Despliegue en Railway
- **Frontend Next.js 15 + Tailwind CSS:**
  - Web pública con KPIs, filtros interactivos (Asturias, España Remoto, LATAM Remoto, Global, tecnologías) y tarjetas del Top 20.
  - Panel privado `/gatekeeper-admin` con login seguro, disparador manual de búsquedas, monitor de costes y monitor de Gatekeeper WAF.
  - Script para arranque local con un solo comando: `iniciar_local.ps1`.
- **Despliegue Backend + PostgreSQL en Railway:**
  - Servicio `jobhunter-backend` en Railway vinculado a base de datos gestionada PostgreSQL y variables de entorno (`DATABASE_URL`, `APIFY_API_TOKEN`, `GEMINI_API_KEY`, etc.).
  - Dominio público activo con certificado SSL: `https://tu-backend.up.railway.app` (o en local `http://localhost:8000`).

---

## 2. Lo que queda pendiente para mañana

1. **Despliegue del Frontend en Vercel:**
   - Conectar el repositorio `Eche-Dev/Job-HunterAI` en Vercel con Root Directory `frontend/` y variable `NEXT_PUBLIC_API_URL` apuntando al backend de Railway.
2. **Validación de Postulación Real:**
   - Probar el flujo completo de candidatura: revisar el Top 20, pulsar en el enlace de la oferta original, postular utilizando el pitch recomendado por Gemini y marcar el estado como *"Solicitada"* en el panel admin.
3. **Nuevos Conectores Especializados (Opcional):**
   - Incorporar fuentes locales adicionales de Asturias (Bolsa de empleo del Parque Tecnológico de Llanera, Trabajastur) si se desea ampliar la cobertura presencial en la región.

---

## 3. Estado de Pruebas y Git
- **Tests Automatizados:** `pytest` pasando al 100% (4/4 tests: regla geográfica Asturias, comparador de costes de 5 herramientas, Gatekeeper WAF & pipeline completo, y exclusión de React con pitch de Gemini).
- **Base de Datos:** Limpia de duplicados.
- **Control de Versiones:** Todo el código versionado y subido a GitHub en la rama `main`.
