<div align="center">

# 📜 Historial Completo de Desarrollo e Hitos Técnicos
### Job Hunter AI v2.0 + Gatekeeper WAF

[![FastAPI](https://img.shields.io/badge/FastAPI-v0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-v15.1.8-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Railway_Volume-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://railway.app/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://job-hunterai.vercel.app)
[![CI Pipeline](https://img.shields.io/badge/GitHub_Actions-CI_Passed-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/Eche-Dev/Job-HunterAI)

---

**[📖 README Principal](README.md)** · **[⚙️ Cómo Funciona (Arquitectura)](DOCS_COMO_FUNCIONA.md)** · **[🌐 Web Pública en Vivo](https://job-hunterai.vercel.app)**

</div>

---

## 📌 Resumen Cronológico de Fases e Implementaciones

Este documento detalla cada una de las fases de ingeniería de software, arquitectura, ciberseguridad, responsive design, persistencia en base de datos, telemetría y despliegue completadas en **Job Hunter AI**.

---

### Fase 1: Arquitectura Base y Regla Geográfica Innegociable de Asturias
- **Problema Inicial:** Cientos de portales ofrecen puestos en Madrid o Barcelona que exigen presencialidad, obligando al candidato a filtrar manualmente ofertas no viables.
- **Implementación Técnica:**
  - Creación del **Motor A** (filtro determinista de alta velocidad).
  - Definición de la **Regla Geográfica Estricta de Asturias**:
    - **Presencial / Híbrido:** Única y exclusivamente aceptado si la ubicación radica en el Principado de Asturias (Oviedo, Gijón, Avilés, Llanera / Parque Tecnológico, Siero, Mieres, Langreo).
    - **100% Remoto:** Permitido sin restricción geográfica para España, Latinoamérica (LATAM) y Global.
  - Implementación de tests unitarios en pytest (`test_asturias_strict_geography_rule`) para validar que ninguna oferta presencial de Madrid o Barcelona supere el Motor A.

---

### Fase 2: Enrutador de Costes Inteligente (5 Herramientas por Fuente)
- **Problema Inicial:** El scraping mediante navegadores headless (Playwright/Puppeteer) o actores premium de Apify genera costes recurrentes innecesarios cuando existen APIs o peticiones HTTP gratuitas.
- **Implementación Técnica:**
  - Diseño del servicio `cost_router_service` respaldado por `backend/data/cost_router.json`.
  - Jerarquía de 5 herramientas por portal:
    1. **Nivel 0 (HTTP Directo / API):** Coste \$0.00.
    2. **Nivel 1 (Cheerio / BeautifulSoup Ligero):** Coste <\$0.001.
    3. **Nivel 2 (Headless Browser / Playwright):** Coste ~\$0.005.
    4. **Nivel 3 (Actor Apify Estandarizado):** Coste ~\$0.010.
    5. **Nivel 4 (Actor Apify con Proxies Residenciales):** Coste ~\$0.030.
  - Registro automático del dinero ahorrado por ejecución (`saved_cost_usd`), acumulado y visible tanto en la API como en el panel de administración.

---

### Fase 3: Integración de IA y Generación de Pitches con Proyectos Reales
- **Alineación con el Stack Real de Eche-Dev:**
  - Se eliminaron dependencias ajenas al perfil (ej. React) en los requisitos de matching, enfocando la búsqueda en:
    - **Python, FastAPI, SQL / PostgreSQL, Java, Ciberseguridad / WAF, Pytest, Docker, Git, Scraping e IA Generativa**.
  - Calibración de inglés a nivel **A2 (Básico / Técnico)**.
- **Motor B (Evaluación Cognitiva con Gemini / Heurística):**
  - Generación de explicaciones de afinidad basadas en coincidencias exactas y semánticas.
  - Redacción automática de un **Pitch de Postulación** conectando directamente la vacante con los proyectos configurados en `candidate_profile.json`:
    - **Proyectos de Seguridad/FastAPI:** Para roles que valoran seguridad web, arquitectura ASGI y QA exhaustivo.
    - **Proyectos de Bases de Datos/E-commerce:** Para puestos de persistencia relacional, PostgreSQL y pasarelas de pago.
    - **Proyectos de Automatización/IA:** Para roles de ingeniería de datos, automatizaciones complejas y microservicios.

---

### Fase 4: Gatekeeper WAF (Seguridad Perimetral y Auditoría Persistente)
- **Desarrollo del Middleware ASGI Puro:**
  - Creado en `backend/app/core/gatekeeper_waf.py` para proteger FastAPI contra el Top 10 de OWASP sin penalizar la latencia (< 1 ms de inspección).
- **Reglas Activas:**
  - `OWASP-SQLi-Protection`: Bloquea `UNION SELECT`, comentarios SQL, `DROP`, inyecciones booleanas.
  - `OWASP-XSS-Filter`: Neutraliza `<script>`, atributos `onerror`, inyecciones DOM.
  - `Path-Traversal-Shield`: Impide escape de directorios mediante `../` y accesos a rutas sensibles del SO.
  - `BruteForce-Login-RateLimit`: Máximo 10 intentos de autenticación por minuto por IP.
  - `SearchRun-Cost-RateLimit`: Máximo 6 ejecuciones de scraping por minuto para proteger presupuestos.
- **Persistencia en Base de Datos:**
  - Migración del WAF de memoria volátil a almacenamiento relacional (`WAFSecurityEvent` en PostgreSQL).
  - Creación del panel `/gatekeeper-admin/waf` con monitor de eventos en tiempo real, simulador interactivo de ciberataques y botón para purgar registros de auditoría.

---

### Fase 5: Persistencia Completa y Despliegue en Railway
- **Base de Datos PostgreSQL en Producción:**
  - Conexión configurada en Railway con volumen persistente (`postgres-volume`, 5 GB) para garantizar que las ofertas, postulaciones, estados, presupuestos y eventos del WAF nunca se borren.
- **Resolución de Error 502 en Railway:**
  - Se detectó que Railway iniciaba el contenedor con `PORT=8080`, pero el proxy del dominio apuntaba a `8000`.
  - Se actualizó el puerto de destino del dominio en Railway a **`8080`** mediante Railway MCP, restaurando el tráfico al instante (200 OK en `/api/v1/health`, `/api/v1/stats` y `/api/v1/jobs`).

---

### Fase 6: UI/UX, Responsive Design Extremo y Componentes Interactivos
- **Tarjetas Colapsables (Minimizar / Desplegar):**
  - Cada tarjeta cuenta con su botón `Minimizar ▲` / `🤖 Desplegar IA ▼` para ocultar o mostrar el análisis explicativo de IA y el pitch adaptado.
  - Botón maestro en la barra superior: `⊟ Minimizar todas` / `⊞ Desplegar todas`.
- **Badge Dinámico de Oferta Nueva (< 24h):**
  - Cálculo en tiempo real respecto al timestamp de descubrimiento (`discovered_at`).
  - Muestra un badge esmeralda con punto pulsante `✨ NUEVA (< 24h)` que expira automáticamente tras un día.
- **Paginación Centrada de 10 Ofertas:**
  - 10 ofertas por página con scroll suave automático al cambiar de vista.
  - Centrado horizontal universal en PC, Tablet y Móvil.
  - Eliminación de textos redundantes (`Página 1 de 2`).
- **Alineación de Tarjetas KPI en Móvil:**
  - Uso de `flex flex-col justify-between` y `mt-auto pt-2` en las tarjetas KPI para que `Ranking Motor C` quede perfectamente anclado a la base independientemente del tamaño de pantalla.
- **Icono Cyberpunk Animado:**
  - Logo oficial en la barra de navegación con halo degradado neón esmeralda/cian pulsante (`animate-pulse`) y micro-interacción de rotación/zoom al pasar el ratón o pulsar en móvil.
- **Footer Universal:**
  - Estructurado en dos columnas en PC y centrado ordenado en móvil/tablet con mención al Principado de Asturias y enlace al portfolio del creador.

---

### Fase 7: PWA, SEO Técnico y Google Search Console
- **PWA (Progressive Web App):**
  - Configurado en `frontend/app/manifest.ts` con modo `standalone`, iconos generados por IA en 192x192 y 512x512, tema `#10b981` y capacidades de instalación nativa en Android e iOS.
- **Indexación y SEO:**
  - `robots.ts`: Autoriza indexación completa de la home y bloquea el acceso de rastreadores a rutas de administración.
  - `sitemap.ts`: Mapa del sitio XML dinámico en `/sitemap.xml` con frecuencia horaria y prioridad 1.0.
  - Metadatos Open Graph, Twitter Cards y preview social en alta definición (`/og-image.png`).
- **Google Search Console:**
  - Verificación por etiqueta meta integrada en `layout.tsx`:
    `<meta name="google-site-verification" content="2eP1uWUcRkT2hYPCCnJ6qUt-qUYH3ECbHy_PPwj3L6M" />`
  - Sitemap validado y marcado como **Correcto** por Google.

---

### Fase 8: Telemetría en Tiempo Real y Despliegue en Vercel
- **Despliegue de Producción del Frontend:**
  - Desplegado en **Vercel** en la URL oficial: **[https://job-hunterai.vercel.app](https://job-hunterai.vercel.app/)**.
  - Solucionado el bloqueo de seguridad de Vercel actualizando Next.js a `^15.1.8`.
- **Integración de Telemetría Oficial:**
  - **`@vercel/analytics`:** Monitoreo en vivo de visitantes únicos, páginas vistas y tasa de rebote.
  - **`@vercel/speed-insights`:** Registro de Core Web Vitals (LCP, FID/INP, CLS, TTFB y Real Experience Score RES > 90).

---

### Fase 9: Pipeline de Integración Continua (CI/CD) con GitHub Actions
- **Automatización en [.github/workflows/ci.yml](.github/workflows/ci.yml):**
  - **Job 1 (Backend QA):** Monta entorno Ubuntu con Python 3.12, instala dependencias, compila sintaxis con `python -m compileall` y corre la suite completa de Pytest (4/4 tests pasando sin advertencias).
  - **Job 2 (Frontend QA):** Monta Node.js 20, valida tipado estricto con `npx tsc --noEmit` y genera la compilación de producción de Next.js.
  - **Job 3 (Pipeline Status):** Valida que ambos entornos estén en verde antes de autorizar cualquier cambio a producción.

---

<div align="center">

**Desarrollado con dedicación y precisión técnica por [Angel David Echenique Villanueva (Eche-Dev)](https://echedev.vercel.app/)**  
*Principado de Asturias, España*

[![Portfolio](https://img.shields.io/badge/Portfolio-echedev.vercel.app-10b981?style=for-the-badge&logo=vercel&logoColor=white)](https://echedev.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-Eche--Dev-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Eche-Dev)

</div>
