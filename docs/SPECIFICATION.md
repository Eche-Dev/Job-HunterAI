# Job Hunter (Bot Work) — Especificación Técnica y Funcional (v2.0)

**Estado:** Aprobada — En implementación  
**Propietario:** Eche-Dev ([echedev.vercel.app](https://echedev.vercel.app/) | [GitHub](https://github.com/Eche-Dev))  
**Arquitectura de Despliegue:** Frontend en **Vercel** (Next.js + React + TypeScript) + Backend en **Railway** (Python + FastAPI + Gatekeeper WAF + PostgreSQL)

---

## 1. Objetivo del Sistema
Construir una plataforma personal e inteligente de búsqueda, recopilación, filtrado y evaluación de ofertas de empleo IT adaptadas al perfil de **Eche-Dev**, que:
1. Recopile ofertas por partes (guardándolas en JSON y base de datos) desde portales de **España (con foco presencial/híbrido exclusivo en el Principado de Asturias)**, **Latinoamérica (100% remoto)** y **Remoto Internacional**, incluyendo **ofertas y publicaciones del feed de LinkedIn**.
2. Compare antes de cada ejecución hasta **5 alternativas/herramientas por fuente** para seleccionar siempre la opción **más barata y fiable** (priorizando Nivel 0 gratuito por API/HTTP/Guest antes de gastar créditos de Apify).
3. Filtre mediante un **Motor A (Determinista)** descartando ofertas incompatibles con la ubicación o que sean "falsos juniors".
4. Evalúe las preseleccionadas con un **Motor B (IA Explicativa)** y elabore en el **Motor C el Ranking de las 20 Mejores Ofertas** donde el candidato tiene mayor probabilidad real de ser contratado, incluyendo un **pitch personalizado** con los proyectos de su portfolio (`Gatekeeper WAF`, `Biblioteca Web`, `Web de País`).

---

## 2. Regla Geográfica Estricta (Asturias vs. Resto del Mundo)

| Modalidad de la Oferta | Ubicación Permitida | Acción del Motor A |
| :--- | :--- | :--- |
| **Presencial (`onsite`)** | **EXCLUSIVAMENTE Principado de Asturias** (Oviedo, Gijón, Avilés, Llanera / Parque Tecnológico de Asturias, Siero, Mieres, Langreo, Castrillón, etc.) | Si es fuera de Asturias (ej. Madrid, Barcelona, CDMX) → **Descarte inmediato (`is_discarded = True`)** |
| **Híbrido (`hybrid`)** | **EXCLUSIVAMENTE Principado de Asturias** | Si es fuera de Asturias → **Descarte inmediato (`is_discarded = True`)** |
| **100% Remoto (`remote`)** | **Asturias, Toda España, Latinoamérica (LATAM), Europa / Global** | **Permitida** (Bonificación extra si es en español o acepta inglés B1) |

---

## 3. Perfil Profesional Configurable (Semilla Inicial)
- **Nombre / Marca:** Eche-Dev (`https://echedev.vercel.app/`)
- **Nivel:** Junior / Entry-Level / Trainee / Prácticas / Primer empleo IT (con experiencia práctica demostrable en proyectos propios en producción).
- **Idiomas:** Español (Nativo), Inglés (B1 en mejora continua — prioriza ofertas en español o internacionales que no exijan C1/C2 excluyente).
- **Stack Técnico:**
  - **Frontend:** HTML5, CSS3, JavaScript, TypeScript, React, Next.js, Tailwind CSS.
  - **Backend:** Python, FastAPI, Node.js, Java, APIs REST.
  - **Bases de Datos:** PostgreSQL, SQL, SQLite.
  - **Especialidades Diferenciales:** Ciberseguridad Web (creador de **Gatekeeper WAF** en Python/ASGI), Desarrollo asistido por IA e integración de LLMs, Automatización y Scraping (Apify), Testing / QA.

---

## 4. Fuentes de Empleo Cubiertas
1. **LinkedIn Jobs (Ofertas oficiales):** Búsqueda focalizada en Asturias (presencial/híbrido/remoto), España (remoto) y LATAM (remoto).
2. **LinkedIn Posts (Publicaciones de Recruiters en el Feed):** Captura vacantes publicadas en el muro por reclutadores hispanohablantes (`"buscamos" + "junior/trainee" + "python/react/fullstack" + "remoto"`).
3. **Latinoamérica (Remoto en español / inglés B1):**
   - **Get on Board (`getonbrd.com`)** — Startups y empresas tech en LATAM con filtro Junior y Remoto.
   - **Torre.ai / Computrabajo / Bumeran (vía conectores y Apify)** — Mercado hispanohablante.
4. **España y Principado de Asturias:**
   - **Tecnoempleo** (Especializado IT en España y Asturias).
   - **InfoJobs** (Ofertas en Asturias y Teletrabajo España).
   - **Joppy** (Matching tech en España).
   - **Empleo Asturias / Trabajastur / Parque Tecnológico de Asturias**.
5. **Remoto Internacional:**
   - **RemoteOK**, **Remotive**, **Himalayas**, **Arbeitnow** (Europa), **We Work Remotely**, **Wellfound**.

---

## 5. Flujo de Ejecución en 9 Pasos (Manual por el Administrador)
1. **Inicio Manual:** El administrador entra a su enlace privado protegido por **Gatekeeper WAF** y pulsa *"Buscar nuevas ofertas"*.
2. **Comparador de Costes (5 alternativas por fuente):** El sistema verifica `cost_router.json` y elige la herramienta más económica disponible dentro del presupuesto.
3. **Recopilación por Partes:** Ejecuta cada fuente y guarda el resultado bruto en `backend/data/runs/<run_id>/part_<source>.json`.
4. **Normalización y Deduplicación:** Convierte al esquema común y elimina duplicados mediante `content_hash` y `(source, external_id)`.
5. **Motor A (Matching Determinista):** Aplica el Hard Filter de **Asturias / Remoto**, filtra "falsos seniors" (>2 años obligatorios) y puntúa de 0 a 100.
6. **Preselección:** Las mejores ofertas compatibles pasan al Motor B.
7. **Motor B (Evaluador IA):** Analiza requisitos reales, barreras de entrada, genera la explicación y redacta el **Pitch Recomendado** basado en los proyectos configurados en `candidate_profile.json`.
8. **Motor C (Ranking Top 20):** Combina Motor A (35%) + Motor B (35%) + Accesibilidad Junior (20%) + Condiciones/Ubicación (10%) y exporta el Top 20 a `top_20_recommendations.json` y PostgreSQL.
9. **Publicación Instantánea:** La web pública muestra las ofertas actualizadas y el panel privado permite gestionar el estado de cada candidatura.
