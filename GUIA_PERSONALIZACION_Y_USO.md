<div align="center">

# 🚀 Guía de Personalización: Cómo Adaptar Job Hunter AI a tu Perfil
### Manual paso a paso para que cualquier desarrollador consiga empleo con esta plataforma

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-Free_API-8E75C4?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com/)

---

**[📖 README Principal](README.md)** · **[⚙️ Cómo Funciona](DOCS_COMO_FUNCIONA.md)** · **[📜 Historial de Cambios](DOCS_HISTORIAL_CAMBIOS.md)** · **[🌐 Web Pública](https://job-hunterai.vercel.app)**

</div>

---

## 💡 ¿Por qué adaptar este proyecto a tu perfil?

**Job Hunter AI** fue concebido como un bot de empleo modular y desacoplado. Aunque de fábrica viene calibrado para el stack de **Eche-Dev** y la regla local de **Asturias**, la arquitectura está diseñada para que **cualquier desarrollador del mundo** pueda clonarlo, configurar sus propias tecnologías, su ciudad de residencia y sus proyectos personales para **automatizar su búsqueda de empleo y maximizar sus entrevistas de trabajo**.

---

## 📋 Pasos para Configurar tu Propio Job Hunter AI

### Paso 1: Hacer Fork y Clonar el Repositorio

1. Haz un **Fork** de este repositorio en tu cuenta de GitHub:
   👉 `https://github.com/Eche-Dev/Job-HunterAI`
2. Clona tu repositorio en local:
   ```bash
   git clone https://github.com/TU_USUARIO/Job-HunterAI.git
   cd Job-HunterAI
   ```

---

### Paso 2: Personalizar tu Perfil de Candidato (`candidate_profile.json`)

Edita el archivo de configuración del candidato en `backend/config/candidate_profile.json`:

```json
{
  "full_name": "Tu Nombre y Apellidos",
  "professional_title": "Full Stack Developer / Backend Python / Tu Rol",
  "portfolio_url": "https://tu-portfolio.vercel.app",
  "github_url": "https://github.com/tu-usuario",
  "linkedin_url": "https://linkedin.com/in/tu-perfil",
  "email": "tu-email@gmail.com",
  "location": "Tu Ciudad, Tu Región, Tu País",
  "language_level": {
    "spanish": "Nativo",
    "english": "B2 / Técnico / Tu Nivel"
  },
  "primary_skills": [
    "Python",
    "FastAPI",
    "PostgreSQL",
    "Docker",
    "Tus Tecnologías Fuertes"
  ],
  "secondary_skills": [
    "Git",
    "Pytest",
    "HTML5 & CSS3",
    "Tailwind CSS"
  ],
  "featured_projects": [
    {
      "name": "Mi Gran Proyecto 1",
      "tagline": "Descripción corta de impacto",
      "tech_stack": ["Python", "FastAPI", "PostgreSQL"],
      "live_url": "https://mi-proyecto.vercel.app",
      "highlight_for_roles": ["backend", "python", "api", "seguridad"]
    },
    {
      "name": "Mi Gran Proyecto 2",
      "tagline": "E-commerce o dashboard de datos",
      "tech_stack": ["Streamlit", "Pandas", "SQL"],
      "live_url": "https://mi-dashboard.app",
      "highlight_for_roles": ["data", "analista", "pandas"]
    }
  ]
}
```

---

### Paso 3: Configurar tu Regla Geográfica (Tu Ciudad vs. Remoto)

Si no resides en el Principado de Asturias y vives, por ejemplo, en **Madrid**, **Valencia**, **Bogotá**, **Buenos Aires** o **CDMX**, abre `backend/app/matching/engine.py` y edita la lista de palabras clave locales:

```python
# Ejemplo para alguien que vive en Valencia, España:
LOCAL_KEYWORDS = [
    "valencia",
    "comunidad valenciana",
    "alicante",
    "castellón",
    "paterna",
    "torrent",
]
```

En la función `classify_geography_and_modality()`:
- Reemplaza `ASTURIAS_KEYWORDS` por tus `LOCAL_KEYWORDS`.
- Ahora el bot admitirá **Presencial / Híbrido** exclusivamente en tu zona metropolitana, y **100% Remoto** para el resto del mundo.

---

### Paso 4: Configurar los Proyectos de tu Pitch con IA

En `backend/app/matching/engine.py`, dentro del método `run_motor_b()`, cambia las referencias de los proyectos para que la IA mencione **tus propios repositorios y aplicaciones**:

```python
# Ejemplo: Personalizar el pitch para tus propios proyectos
if any(k in matched for k in ["Python", "Backend"]):
    pitches.append(
        "Destaca tu proyecto **MiAPI** (disponible en GitHub), API REST desarrollada con FastAPI y PostgreSQL..."
    )
```

---

### Paso 5: Obtener tus Claves de API Gratuitas

Crea un archivo `.env` en la carpeta `backend/` copiando el ejemplo `.env.example`:

```ini
# Configuración del Candidato
CANDIDATE_NAME="Tu Nombre"
PORTFOLIO_URL="https://tu-portfolio.vercel.app"

# Base de Datos (SQLite para desarrollo local rápido)
DATABASE_URL="sqlite:///./data/job_hunter.db"

# Claves de IA (Gratis)
AI_PROVIDER="gemini"
GEMINI_API_KEY="AIzaSy...Tu_Clave_Gratuita_De_Google_AI_Studio"
AI_MODEL="gemini-1.5-flash"

# Token de Apify (Opcional para scraping cloud masivo)
APIFY_API_TOKEN="apify_api_...Tu_Token_Gratis"

# Seguridad de Gatekeeper WAF y Panel Privado
JWT_SECRET_KEY="tu_clave_secreta_super_segura_de_32_caracteres"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="TuContraseñaSegura2026!"
```

> [!TIP]
> Puedes obtener tu clave gratuita de **Google Gemini API** en 1 minuto en [Google AI Studio](https://aistudio.google.com/). Su cuota gratuita es más que suficiente para evaluar cientos de ofertas diarias sin coste alguno.

---

### Paso 6: Ejecutar en Local para Probar tu Configuración

#### 1. Iniciar el Backend (FastAPI + WAF):
```powershell
cd backend
python -m venv venv
venv\Scripts\activate       # En Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

#### 2. Iniciar el Frontend (Next.js):
```powershell
cd frontend
npm install
npm run dev
```

Abre en tu navegador `http://localhost:3000`. Verás la web con tu nombre, tus proyectos y las vacantes adaptadas a tu perfil.

---

### Paso 7: Desplegar en la Nube (Gratis y Permanente)

1. **Backend en [Railway](https://railway.app):**
   - Conecta tu repositorio de GitHub.
   - En **Root Directory**, pon `/backend`.
   - Añade una base de datos **PostgreSQL**.
   - En **Variables**, define tus variables de entorno del `.env`.
   - Genera un dominio público (ej. `tu-backend.up.railway.app`) asegurándote de que el puerto de destino sea `8080`.

2. **Frontend en [Vercel](https://vercel.com):**
   - Conecta tu repositorio de GitHub en Vercel.
   - En **Root Directory**, selecciona `frontend`.
   - Añade la variable de entorno:
     `NEXT_PUBLIC_API_URL=https://tu-backend.up.railway.app`
   - Pulsa **Deploy**.

---

## 🎯 Estrategia Recomendada para Conseguir Trabajo con esta Web

1. **Usa el Top 20 a diario:** Cada mañana, revisa las 20 mejores ofertas seleccionadas por el Motor C.
2. **Copia el Pitch de la IA:** Cuando envíes tu solicitud en LinkedIn o por email, copia el bloque **🚀 Pitch Recomendado al Postular** generado por el Motor B. Enviarás un mensaje que cita exactamente la necesidad de la empresa y cómo tu proyecto personal lo resuelve.
3. **Mueve los Estados en el Panel Admin:** Entra a `/gatekeeper-admin` con tu usuario y contraseña, y cambia el estado de cada oferta a **`SOLICITADA`**, **`ENTREVISTA`** o **`FAVORITA`** para hacer un seguimiento metódico de tus candidaturas.
4. **Comparte el Enlace de tu Bot:** Pon el enlace de tu Job Hunter AI desplegado en tu currículum o perfil de LinkedIn. Demostrará a los reclutadores que eres capaz de construir arquitecturas full-stack avanzadas con IA, APIs, web scraping, ciberseguridad y CI/CD en producción.

---

<div align="center">

**Desarrollado y compartido abiertamente por [Angel David Echenique Villanueva (Eche-Dev)](https://echedev.vercel.app/)**  
*Principado de Asturias, España*

[![Portfolio](https://img.shields.io/badge/Portfolio-echedev.vercel.app-10b981?style=for-the-badge&logo=vercel&logoColor=white)](https://echedev.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-Eche--Dev-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Eche-Dev)

</div>
