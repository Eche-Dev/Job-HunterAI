<div align="center">

# 📘 Guía Maestra de Conexión, Configuración y Uso Local
### Job Hunter AI — Agente Autónomo de Búsqueda IT & Match Heurístico con IA

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-API_Gratuita-8E75C4?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Local_$0.00-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org/)

---

**[📖 README Principal](README.md)** · **[⚙️ Cómo Funciona la Arquitectura](DOCS_COMO_FUNCIONA.md)** · **[📜 Historial de Cambios](DOCS_HISTORIAL_CAMBIOS.md)**

</div>

---

## 🎯 ¿Qué es esta guía y para quién está pensada?

Esta guía contiene **todo lo necesario** para que cualquier programador o profesional de TI pueda:
1. **Clonar este repositorio en su ordenador**.
2. **Conectar sus propias herramientas y APIs** (100% gratuitas, sin coste oculto).
3. **Definir sus propios parámetros de búsqueda**: su ciudad de residencia, sus tecnologías, su nivel de experiencia y sus proyectos personales.
4. **Ejecutar el bot en local** y obtener de inmediato su **Top 20 de ofertas de empleo con pitches personalizados generados por Inteligencia Artificial**.

> [!TIP]
> **¿Vas a pedirle a una IA (ChatGPT, Claude, Gemini, Cursor) que te configure el proyecto?**  
> ¡Perfecto! Al final de este documento tienes una **[sección con el prompt exacto](#-sección-para-asistentes-de-ia-prompt-listo-para-copiar-y-pegar)** para que tu IA lea este archivo y deje todo conectado por ti en 2 minutos.

---

## 📋 Requisitos Previos en tu Ordenador

Antes de empezar, asegúrate de tener instalado:
- **Python 3.11 o superior** ([descargar oficial](https://www.python.org/downloads/)) — Marca la casilla *"Add Python to PATH"*.
- **Node.js 18 o superior** ([descargar LTS oficial](https://nodejs.org/)).
- **Git** ([descargar](https://git-scm.com/)).

---

## 🚀 Paso 1: Clonar el Repositorio e Instalar Dependencias

Abre tu terminal (PowerShell, Bash o CMD) y ejecuta:

```bash
# 1. Clonar el repositorio
git clone https://github.com/Eche-Dev/Job-HunterAI.git
cd Job-HunterAI

# 2. Instalar dependencias del Backend (Python)
cd backend
python -m venv venv

# Activar entorno virtual:
# En Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# En Linux/Mac:
# source venv/bin/activate

pip install -r requirements.txt
cd ..

# 3. Instalar dependencias del Frontend (Next.js)
cd frontend
npm install
cd ..
```

---

## 🔑 Paso 2: Crear y Configurar tu Archivo `.env`

Copia el archivo de plantilla `.env.example` para crear tu `.env` privado:

**En Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**En Linux o macOS:**
```bash
cp .env.example .env
```

Abre `.env` en tu editor de código. Verás las siguientes variables con sus respectivos placeholders:

```ini
# =====================================================================
# 1. BASE DE DATOS
# =====================================================================
# Por defecto utiliza SQLite local. NO requiere instalar PostgreSQL ni Docker.
DATABASE_URL=sqlite:///./data/jobhunter.db

# =====================================================================
# 2. SEGURIDAD Y PANEL PRIVADO (/gatekeeper-admin)
# =====================================================================
# Genera una clave secreta larga para firmar sesiones JWT
JWT_SECRET_KEY=AQUI_TU_JWT_SECRET_SUPER_SEGURO_DE_32_CARACTERES

# Usuario y contraseña para entrar al panel de control de tu bot
ADMIN_USERNAME=admin
ADMIN_PASSWORD=AQUI_TU_CONTRASENA_SEGURA_2026!
ADMIN_SECRET_PATH=gatekeeper-admin

# Orígenes CORS permitidos
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# =====================================================================
# 3. INTELIGENCIA ARTIFICIAL (MOTOR B - EVALUACIÓN Y PITCH CON GEMINI)
# =====================================================================
# Obtén tu clave 100% GRATIS en https://aistudio.google.com/
AI_PROVIDER=gemini
GEMINI_API_KEY=AQUI_TU_GEMINI_API_KEY_DE_GOOGLE_AI_STUDIO
AI_MODEL=gemini-2.0-flash

# (Opcional) Si en vez de Gemini prefieres OpenAI, Groq u OpenRouter:
# AI_PROVIDER=openai
# AI_API_KEY=AQUI_TU_API_KEY_DE_OPENAI_O_GROQ
# AI_BASE_URL=https://api.openai.com/v1

# =====================================================================
# 4. SCRAPING AVANZADO EN LINKEDIN (APIFY - OPCIONAL)
# =====================================================================
# Si lo dejas vacío, el bot funciona al 100% con scrapers Nivel 0 gratuitos ($0.00).
# Si deseas scraping en LinkedIn cloud, regístrate gratis en https://apify.com/
APIFY_API_TOKEN=AQUI_TU_APIFY_API_TOKEN_OPCIONAL
MAX_SEARCH_BUDGET_USD=2.00

# =====================================================================
# 5. FRONTEND NEXT.JS
# =====================================================================
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 💡 ¿Cómo conseguir tu clave de IA gratis (Paso a paso)?
1. Entra en **[Google AI Studio](https://aistudio.google.com/)**.
2. Inicia sesión con tu cuenta de Google.
3. Haz clic en el botón azul **"Get API key"** y luego en **"Create API key"**.
4. Copia la clave generada y pégala en `GEMINI_API_KEY=` dentro de tu `.env`.
5. ¡Listo! Google te ofrece cuota gratuita para evaluar miles de ofertas al mes sin pagar un céntimo.

---

## 👤 Paso 3: Configurar tu Perfil de Búsqueda (`candidate_profile.json`)

El archivo `backend/config/candidate_profile.json` es el **cerebro de personalización del bot**. Aquí configuras tus datos para que los 3 motores evalúen las ofertas para ti.

> [!NOTE]
> Puedes ver un ejemplo completamente relleno en `backend/config/candidate_profile.example.json`.

Abre `backend/config/candidate_profile.json` y personaliza los campos:

```json
{
  "name": "AQUI TU NOMBRE Y APELLIDOS",
  "title": "AQUI TU ROL PROFESIONAL (Ej: Junior Python Backend Developer)",
  "portfolio_url": "https://tu-portfolio.com",
  "github_url": "https://github.com/tu-usuario",
  "experience_years": 0,
  "accepts_junior_up_to_years": 2,

  "residence": {
    "country": "España",
    "autonomous_community": "Tu Comunidad Autónoma o Región (Ej: Comunidad de Madrid)",
    "allowed_onsite_hybrid_keywords": [
      "madrid",
      "getafe",
      "leganes",
      "alcobendas"
    ],
    "strict_onsite_local_only": true,
    "allow_remote_spain": true,
    "allow_remote_latam": true,
    "allow_remote_global": true
  },

  "languages": {
    "spanish": "Nativo",
    "english": "B1 (Lectura técnica y APIs con herramientas)"
  },

  "skills": {
    "primary": [
      "Python",
      "FastAPI",
      "PostgreSQL",
      "Docker",
      "Git"
    ],
    "secondary": [
      "Pandas",
      "Streamlit",
      "Linux",
      "Pytest"
    ],
    "explicitly_avoid_or_unskilled": [
      "React",
      "Angular",
      "C++"
    ]
  },

  "target_roles": [
    "Junior Python Developer",
    "Backend Developer Junior (FastAPI)",
    "QA Tester Junior"
  ],

  "projects": [
    {
      "name": "MiAPI-Ecommerce",
      "stack": ["Python", "FastAPI", "PostgreSQL"],
      "description": "API REST con autenticación JWT, carrito de compras y pasarela de pago.",
      "best_for": ["Backend", "Python", "FastAPI", "PostgreSQL", "REST API"]
    },
    {
      "name": "Dashboard-Financiero",
      "stack": ["Python", "Streamlit", "Pandas"],
      "description": "Dashboard interactivo para análisis de métricas y exportación de reportes.",
      "best_for": ["Data", "Pandas", "Streamlit", "Automatización"]
    }
  ],

  "matching_weights": {
    "tech_stack": 35,
    "experience_level": 25,
    "role_fit": 15,
    "location_modality": 15,
    "language_fit": 10
  }
}
```

### 📍 ¿Cómo funciona la Regla Geográfica (`residence`)?
- El bot aplica un **Filtro Duro (Coste $0)**:
  - Si una vacante es **Presencial** o **Híbrida**, verifica si la ubicación coincide con tus palabras clave en `allowed_onsite_hybrid_keywords`. Si está fuera de tu ciudad (por ejemplo, vives en Valencia y la oferta exige oficina en Barcelona), **la descarta de inmediato con un motivo claro**.
  - Si la vacante es **100% Remota**, la admite para España, LATAM o Internacional según tus flags (`allow_remote_*`).

### 💼 ¿Cómo usa la IA tus `projects`?
Cuando el **Motor B (Google Gemini)** evalúa una oferta válida, examina las tecnologías solicitadas y redacta un **Pitch de Postulación personalizado**, indicando exactamente cuál de tus proyectos debes mencionar en la entrevista y por qué.

---

## ⚡ Paso 4: Iniciar la Aplicación en Local

### Opción A: Script Automático (Recomendado en Windows)
En la raíz del proyecto, ejecuta:
```powershell
.\iniciar_local.ps1
```
Este script:
1. Abre una ventana de terminal con el backend FastAPI en `http://localhost:8000`.
2. Inicia el servidor de desarrollo de Next.js en `http://localhost:3000`.

---

### Opción B: Inicio Manual (Windows, Linux, macOS)

Abre dos terminales:

**Terminal 1 (Backend FastAPI):**
```bash
cd backend
# Activa tu venv
source venv/bin/activate  # En Windows: .\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 (Frontend Next.js):**
```bash
cd frontend
npm run dev
```

---

### Opción C: Con Docker Compose
Si tienes Docker Desktop instalado:
```bash
docker-compose up -d
```

---

## 🖥️ Paso 5: Cómo Hacer tu Primera Búsqueda de Empleo

1. Abre tu navegador en **`http://localhost:3000`**. Verás la interfaz pública con los KPIs y filtros.
2. Haz clic en el botón superior derecho **"Panel Admin Privado 🔒"** (o navega a `http://localhost:3000/gatekeeper-admin`).
3. Inicia sesión con las credenciales que pusiste en tu `.env`:
   - **Usuario:** `admin` (o tu `ADMIN_USERNAME`)
   - **Contraseña:** la que configuraste en `ADMIN_PASSWORD`
4. Pulsa el botón **"🚀 Ejecutar Búsqueda Ahora"**.
5. El bot ejecutará:
   - **Comparador de Costes:** Elige la herramienta más barata ($0.00 por defecto).
   - **Extracción:** Recopila ofertas de LinkedIn, InfoJobs, Tecnoempleo, Get on Board LATAM, etc.
   - **Motor A:** Aplica tu regla geográfica local y descarta vacantes desalineadas.
   - **Motor B con Gemini AI:** Evalúa la compatibilidad técnica y redacta el pitch con tus proyectos.
   - **Motor C:** Ordena el ranking y publica el **Top 20** en tu panel y en la web pública.
6. ¡Listo! Vuelve a `http://localhost:3000` para ver tus vacantes recomendadas, copiar los pitches y postular directamente.

---

## 🤖 Sección para Asistentes de IA (Prompt listo para copiar y pegar)

Si has clonado este repositorio y quieres que un asistente de IA (como ChatGPT, Claude, Cursor, Copilot o Gemini) te deje todo configurado, copia y pega el siguiente mensaje:

```text
Hola. He clonado el repositorio Job Hunter AI y necesito que me ayudes a configurarlo para mi perfil profesional.

Por favor, revisa:
1. La guía de configuración en GUIA_CONEXION_Y_CONFIGURACION.md
2. El archivo de entorno de ejemplo en .env.example
3. El archivo de perfil de candidato en backend/config/candidate_profile.json

Aquí tienes mis datos para que me generes el archivo `.env` y el `candidate_profile.json` adaptados a mí:

- Mi Nombre: [Pon aquí tu nombre]
- Mi Título / Especialidad: [Ej: Backend Developer Python / Fullstack Junior]
- Mi Portfolio / GitHub: [Ej: https://github.com/miusuario]
- Ciudad y País donde resido: [Ej: Valencia, España]
- Ciudades cercanas donde acepto presencial/híbrido: [Ej: Valencia, Paterna, Torrent]
- ¿Acepto 100% remoto?: [Sí: España, LATAM y Global]
- Mi nivel de inglés: [Ej: B1 técnico / A2 básico]
- Mis tecnologías principales: [Ej: Python, FastAPI, PostgreSQL, Docker]
- Mis tecnologías secundarias: [Ej: Git, Linux, Pytest, Pandas]
- Tecnologías que NO domino o quiero evitar: [Ej: React, Angular, C++]
- Mis 2 o 3 mejores proyectos personales (nombre, stack y breve descripción):
  1. Proyecto A: ...
  2. Proyecto B: ...

Genera el contenido exacto que debo poner en `.env` y en `backend/config/candidate_profile.json`.
```

---

## 🛡️ Seguridad y Buenas Prácticas

- **Nunca subas tu `.env` a GitHub:** El archivo `.env` contiene tus claves de API privadas y contraseñas. Está protegido en `.gitignore`.
- **Base de datos local:** Por defecto el bot almacena las ofertas en `data/jobhunter.db` (SQLite). No compartas este archivo si contiene historiales de búsqueda con datos personales.
- **Gatekeeper WAF:** El sistema incluye protección perimetral activa contra inyecciones SQL (SQLi), Cross-Site Scripting (XSS) y Prompt Injection en las descripciones de las ofertas. Puedes monitorizar los bloqueos en tiempo real en `http://localhost:3000/gatekeeper-admin/waf`.

---

<div align="center">
<strong>Job Hunter AI — Publicado con licencia MIT para la comunidad de desarrolladores.</strong>
</div>
