import hashlib
import re
from typing import Any, Dict, List, Tuple

import httpx

from app.core.config import settings

ASTURIAS_KEYWORDS = [
    "asturias",
    "principado de asturias",
    "oviedo",
    "gijón",
    "gijon",
    "avilés",
    "aviles",
    "llanera",
    "parque tecnológico de asturias",
    "parque tecnologico de asturias",
    "siero",
    "pola de siero",
    "lugones",
    "mieres",
    "langreo",
    "castrillón",
    "nava",
]

LATAM_COUNTRIES_AND_KEYWORDS = [
    "latam",
    "latinoamérica",
    "latinoamerica",
    "méxico",
    "mexico",
    "colombia",
    "argentina",
    "chile",
    "perú",
    "peru",
    "uruguay",
    "costa rica",
    "ecuador",
    "panamá",
    "panama",
    "bogotá",
    "buenos aires",
    "santiago",
    "ciudad de méxico",
    "cdmx",
    "montevideo",
    "lima",
]

SPAIN_KEYWORDS = [
    "españa",
    "spain",
    "madrid",
    "barcelona",
    "valencia",
    "sevilla",
    "málaga",
    "malaga",
    "bilbao",
    "zaragoza",
    "galicia",
    "coruña",
    "vigo",
    "castilla",
    "andalucía",
]

SENIOR_EXCLUSION_PATTERNS = [
    re.compile(r"\b([3-9]|1\d)\+?\s*(años|anos|years)\s*(de\s+experiencia|of\s+experience)?", re.IGNORECASE),
    re.compile(r"\b(senior|sr\.|tech\s+lead|staff\s+engineer|principal\s+engineer|architect|engineering\s+manager)\b", re.IGNORECASE),
]

JUNIOR_FRIENDLY_PATTERNS = [
    re.compile(
        r"\b(junior|jr\.?|trainee|intern|internship|beca|prácticas|practicas|entry[\s\-]?level|sin\s+experiencia|primer\s+empleo|0[\s\-]?2\s*años|1\s*año|graduado)\b",
        re.IGNORECASE,
    )
]

PROMPT_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?previous\s+instructions", re.IGNORECASE),
    re.compile(r"system\s*prompt\s*:", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+a", re.IGNORECASE),
]

CANONICAL_TECH_MAP: Dict[str, List[str]] = {
    "Python": ["python", "py"],
    "FastAPI": ["fastapi", "fast api", "starlette", "asgi"],
    "Cybersecurity / WAF": ["waf", "ciberseguridad", "cybersecurity", "appsec", "owasp", "seguridad web", "security"],
    "AI / LLM": ["ia", "ai", "llm", "gemini", "openai", "prompt", "inteligencia artificial", "apify", "automatización", "machine learning"],
    "Java": ["java", "spring", "springboot"],
    "PostgreSQL": ["postgresql", "postgres", "psql"],
    "SQL / Database": ["sql", "mysql", "sqlite", "mongodb", "base de datos", "database"],
    "QA / Testing": ["qa", "testing", "pytest", "jest", "playwright", "cypress", "tester", "automatización de pruebas"],
    "Data / Pandas": ["pandas", "streamlit", "plotly", "numpy", "analista de datos", "data analyst"],
    "HTML5 & CSS3": ["html", "html5", "css", "css3", "tailwind", "tailwindcss"],
    "Docker & Linux": ["docker", "containers", "contenedores", "linux", "bash"],
    "Git": ["git", "github", "gitlab"],
    "REST API": ["rest", "api rest", "restful", "apis", "graphql"],
    "IT Support / Hardware": ["soporte técnico", "soporte tecnico", "helpdesk", "microinformática", "microinformatica", "hardware", "mantenimiento"],
    "JavaScript": ["javascript", "js", "ecmascript", "es6"],
    "Node.js": ["node", "node.js", "nodejs", "express"],
    "React (Desaconsejado)": ["react", "reactjs", "react.js", "next.js", "nextjs"],
    "Angular / Vue": ["angular", "vue", "vuejs"],
}


def compute_content_hash(source: str, external_id: str, title: str, company: str, location: str = "") -> str:
    norm_title = re.sub(r"[^a-z0-9]", "", title.lower())
    norm_company = re.sub(r"[^a-z0-9]", "", company.lower())
    norm_id = external_id.strip().lower()
    raw = f"{norm_id}|{norm_title}|{norm_company}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def sanitize_untrusted_description(text: str) -> str:
    cleaned = text or ""
    for pat in PROMPT_INJECTION_PATTERNS:
        cleaned = pat.sub("[REDACTED_UNTRUSTED_INSTRUCTION]", cleaned)
    return cleaned.strip()


def extract_technologies(text: str, existing_tags: List[str] | None = None) -> List[str]:
    combined = f"{text} {' '.join(existing_tags or [])}".lower()
    detected: List[str] = []
    for canonical, aliases in CANONICAL_TECH_MAP.items():
        for alias in aliases:
            pattern = rf"(?<![a-z0-9]){re.escape(alias)}(?![a-z0-9])"
            if re.search(pattern, combined):
                detected.append(canonical)
                break
    return detected


def classify_geography_and_modality(
    location: str,
    country: str,
    remote_type_hint: str,
    title: str,
    description: str,
    allowed_local_keywords: List[str] | None = None,
    local_region_name: str = "el Principado de Asturias",
) -> Tuple[str, str, bool, bool, str | None]:
    """
    Evalúa la Regla Geográfica:
    - Presencial (`onsite`) o Híbrido (`hybrid`): EXCLUSIVAMENTE en la zona local permitida del candidato.
    - Fuera de la zona local: OBLIGATORIAMENTE 100% Remoto (`remote`).

    Devuelve:
    (remote_type_normalized, region_scope, is_asturias_local, is_discarded, discard_reason)
    """
    loc_text = f"{location} {country} {title}".lower()
    full_text = f"{loc_text} {description[:600]}".lower()

    keywords = allowed_local_keywords if allowed_local_keywords is not None else ASTURIAS_KEYWORDS
    is_asturias = any(kw in full_text for kw in keywords)

    # Normalizar modalidad
    hint = (remote_type_hint or "").lower().strip()
    if hint in ("remote", "remoto", "teletrabajo", "100% remoto", "full remote"):
        remote_type = "remote"
    elif hint in ("hybrid", "híbrido", "hibrido"):
        remote_type = "hybrid"
    elif hint in ("onsite", "presencial", "on-site", "oficina"):
        remote_type = "onsite"
    else:
        if any(w in full_text for w in ["100% remoto", "teletrabajo", "full remote", "fully remote", "trabajo remoto", "remote"]):
            if any(w in loc_text for w in ["híbrido", "hibrido", "hybrid"]):
                remote_type = "hybrid"
            else:
                remote_type = "remote"
        elif any(w in full_text for w in ["híbrido", "hibrido", "hybrid"]):
            remote_type = "hybrid"
        else:
            remote_type = "onsite"

    # Clasificar región
    if is_asturias:
        region_scope = "ASTURIAS" if "asturias" in local_region_name.lower() else "LOCAL_REGION"
    elif any(kw in loc_text for kw in LATAM_COUNTRIES_AND_KEYWORDS):
        region_scope = "LATAM_REMOTE"
    elif any(kw in loc_text for kw in SPAIN_KEYWORDS):
        region_scope = "SPAIN_REMOTE"
    else:
        region_scope = "GLOBAL_REMOTE"

    # REGLA ESTRICTA: Si NO está en el Principado de Asturias y NO es 100% remoto -> Descartar
    if not is_asturias and remote_type in ("onsite", "hybrid"):
        modality_es = "Presencial" if remote_type == "onsite" else "Híbrido"
        return (
            remote_type,
            region_scope,
            False,
            True,
            f"Descartada por Regla Geográfica: Modalidad {modality_es} en '{location}' (fuera del Principado de Asturias). Solo se acepta presencial/híbrido en Asturias o 100% remoto.",
        )

    return remote_type, region_scope, is_asturias, False, None


class MatchingEngine:
    """
    Implementa los tres motores de arquitectura:
    - Motor A: Matching determinista en Python (Coste $0)
    - Motor B: Evaluador IA + Pitch personalizado con proyectos de echedev.vercel.app
    - Motor C: Ranking final de las 20 mejores ofertas
    """

    def __init__(self) -> None:
        self.profile = settings.load_candidate_profile()

    def reload_profile(self) -> None:
        self.profile = settings.load_candidate_profile()

    def run_motor_a(self, raw_job: Dict[str, Any]) -> Dict[str, Any]:
        """Motor A: Normaliza, aplica Hard Filters (Asturias/Remoto y Seniority) y puntúa de 0 a 100."""
        title = str(raw_job.get("title", "")).strip()
        company = str(raw_job.get("company", "Empresa Confidencial")).strip()
        description = sanitize_untrusted_description(str(raw_job.get("description", "")))
        location = str(raw_job.get("location", "Remoto")).strip()
        country = str(raw_job.get("country", "España")).strip()
        remote_hint = str(raw_job.get("remote_type", ""))

        # 1. Regla Geográfica Estricta (Zona Local vs. Remoto)
        residence = self.profile.get("residence", {})
        allowed_keywords = residence.get("allowed_onsite_hybrid_keywords")
        region_name = residence.get("autonomous_community") or residence.get("region") or "el Principado de Asturias"

        remote_type, region_scope, is_asturias, geo_discarded, geo_reason = classify_geography_and_modality(
            location=location,
            country=country,
            remote_type_hint=remote_hint,
            title=title,
            description=description,
            allowed_local_keywords=allowed_keywords,
            local_region_name=region_name,
        )

        # 2. Extracción tecnológica
        detected_techs = extract_technologies(
            f"{title} {description}",
            existing_tags=raw_job.get("technologies") or [],
        )
        candidate_primary = set(self.profile.get("skills", {}).get("primary", []))
        candidate_secondary = set(self.profile.get("skills", {}).get("secondary", []))
        all_candidate_skills_lower = {s.lower() for s in (candidate_primary | candidate_secondary)}

        matched_skills: List[str] = []
        missing_skills: List[str] = []
        for tech in detected_techs:
            if any(
                part in all_candidate_skills_lower
                for part in [tech.lower(), tech.split("/")[0].strip().lower()]
            ):
                matched_skills.append(tech)
            else:
                missing_skills.append(tech)

        # 3. Detector de "Falsos Juniors" / Seniority Excluyente y Filtro de Pure React
        combined_text = f"{title} {description}"
        is_junior_friendly = any(pat.search(combined_text) for pat in JUNIOR_FRIENDLY_PATTERNS)
        has_senior_exclusion = any(pat.search(combined_text) for pat in SENIOR_EXCLUSION_PATTERNS)

        seniority_discarded = False
        seniority_reason = None
        if has_senior_exclusion and not is_junior_friendly:
            seniority_discarded = True
            seniority_reason = "Descartada por Motor A: Exige nivel Senior o >3 años de experiencia obligatoria."

        title_lower = title.lower()
        is_pure_react = bool(re.search(r"\b(react\s+developer|frontend\s+react|desarrollador\s+react|react\.js\s+developer|react\s+native)\b", title_lower))
        react_discarded = False
        react_reason = None
        if is_pure_react:
            react_discarded = True
            react_reason = "Descartada por perfil: Puesto enfocado puramente en React/Frontend. El candidato está especializado en Python Backend, Ciberseguridad/WAF, IA Aplicada y QA."

        is_discarded = geo_discarded or seniority_discarded or react_discarded
        discard_reason = geo_reason or seniority_reason or react_reason

        # 4. Cálculo determinista (0 - 100 puntos)
        # A) Compatibilidad Tecnológica (máx 30 pts)
        if matched_skills:
            tech_score = min(30.0, 12.0 + len(matched_skills) * 4.5)
        else:
            tech_score = 8.0

        # B) Nivel de Experiencia / Accesibilidad Junior (máx 25 pts)
        if is_junior_friendly:
            exp_score = 25.0
            experience_label = "Junior / Trainee / Sin experiencia previa"
        elif not has_senior_exclusion:
            exp_score = 19.0
            experience_label = "Abierta a perfiles Junior con Portfolio"
        else:
            exp_score = 5.0
            experience_label = "Senior / +3 años"

        # C) Tipo de puesto y funciones (máx 15 pts)
        role_keywords = [
            "python", "fastapi", "backend", "ciberseguridad", "seguridad", "waf", "security",
            "ia", "ai", "llm", "automatización", "qa", "tester", "testing", "pytest",
            "java", "soporte", "helpdesk", "data", "developer", "programador", "desarrollador"
        ]
        role_matches = sum(1 for kw in role_keywords if kw in title.lower())
        role_score = min(15.0, 8.0 + role_matches * 3.5)

        # D) Modalidad y Ubicación (máx 10 pts)
        if geo_discarded:
            loc_score = 0.0
        elif is_asturias:
            loc_score = 10.0  # Máxima prioridad: Presencial/Híbrido/Remoto en Principado de Asturias
        elif region_scope in ("SPAIN_REMOTE", "LATAM_REMOTE"):
            loc_score = 9.5  # Excelente ajuste: 100% Remoto en España o Latinoamérica
        else:
            loc_score = 8.5  # 100% Remoto Internacional

        # E) Idioma (Español nativo + Inglés A2) (máx 10 pts)
        c1_c2_required = bool(re.search(r"\b(c1|c2|native\s+english|inglés\s+alto\s+imprescindible|fluent\s+english\s+required|advanced\s+english)\b", combined_text, re.IGNORECASE))
        b2_required = bool(re.search(r"\b(b2|inglés\s+fluido|fluent\s+english|intermediate\s+high)\b", combined_text, re.IGNORECASE))
        spanish_friendly = bool(re.search(r"[áéíóúñ]|desarrollador|programador|remoto|españa|asturias|latam|empresa", combined_text, re.IGNORECASE))

        if spanish_friendly and not (c1_c2_required or b2_required):
            lang_score = 10.0
            lang_label = "Español nativo (Perfecto encaje A2)"
        elif not (c1_c2_required or b2_required):
            lang_score = 8.5
            lang_label = "Documentación en inglés (Apto A2 con herramientas)"
        elif b2_required:
            lang_score = 5.0
            lang_label = "Requiere B2 (El candidato posee A2 básico)"
        else:
            lang_score = 2.0
            lang_label = "Excluyente: Exige Inglés C1/Avanzado"

        # F) Bonus por coincidencia con proyectos de echedev.vercel.app (máx 10 pts)
        project_bonus = 5.0
        # 1. Gatekeeper WAF (Python, FastAPI, Starlette, Seguridad, Pytest)
        if any(t in matched_skills for t in ["Python", "FastAPI", "Cybersecurity / WAF"]):
            project_bonus += 3.0
        # 2. Clash Friends / Job Hunter AI (IA, LLM, Automatizaciones)
        if any(t in matched_skills for t in ["AI / LLM"]):
            project_bonus += 2.0
        # 3. War Analytics (Python, Streamlit, Pandas, Plotly, Data)
        if any(t in matched_skills for t in ["Data / Pandas"]):
            project_bonus += 2.0
        # 4. Amapola Store (PostgreSQL, Bases de Datos)
        if any(t in matched_skills for t in ["PostgreSQL", "SQL / Database"]):
            project_bonus += 1.5
        # 5. Formación Java (Aspasia / Asturnet) o QA Testing (Pytest)
        if any(t in matched_skills for t in ["Java", "QA / Testing"]):
            project_bonus += 1.5
        # 6. Librería HTML & CSS / EchedevKit o Conociendo Mi Tierra
        if any(t in matched_skills for t in ["HTML5 & CSS3"]):
            project_bonus += 1.0
        project_bonus = min(10.0, project_bonus)

        motor_a_score = round(tech_score + exp_score + role_score + loc_score + lang_score + project_bonus, 1)
        if is_discarded:
            motor_a_score = round(motor_a_score * 0.25, 1)

        return {
            **raw_job,
            "title": title,
            "company": company,
            "description": description,
            "location": location,
            "country": country,
            "remote_type": remote_type,
            "region_scope": region_scope,
            "is_asturias_local": is_asturias,
            "technologies": detected_techs or ["Python", "JavaScript"],
            "matched_skills": matched_skills or ["Python", "Desarrollo Web"],
            "missing_skills": missing_skills,
            "language_required": lang_label,
            "experience_level": experience_label,
            "motor_a_score": min(100.0, motor_a_score),
            "is_discarded": is_discarded,
            "discard_reason": discard_reason,
        }

    def run_motor_b(self, job_after_a: Dict[str, Any]) -> Dict[str, Any]:
        """
        Motor B (Evaluador IA + Asistente de Candidatura):
        Evalúa únicamente las ofertas válidas que superaron el Motor A.
        Construye una explicación verificable y el Pitch Recomendado con los proyectos de echedev.vercel.app.
        """
        if job_after_a.get("is_discarded"):
            return {
                **job_after_a,
                "motor_b_score": 0.0,
                "matching_explanation": job_after_a.get("discard_reason"),
                "recommended_pitch": "No postular (oferta descartada automáticamente por filtros de ubicación o seniority).",
                "entry_barrier": "Excluyente",
            }

        matched = job_after_a.get("matched_skills", [])
        region = job_after_a.get("region_scope", "SPAIN_REMOTE")
        is_asturias = job_after_a.get("is_asturias_local", False)
        remote_type = job_after_a.get("remote_type", "remote")
        title_lower = job_after_a.get("title", "").lower()

        # Selección inteligente de proyectos definidos en candidate_profile.json para el pitch
        pitches: List[str] = []
        user_projects = self.profile.get("projects", [])

        if user_projects:
            for proj in user_projects:
                p_name = proj.get("name", "")
                p_desc = proj.get("description", "")
                p_stack = [str(s).lower() for s in proj.get("stack", [])]
                p_best = [str(b).lower() for b in proj.get("best_for", [])]
                criteria = p_stack + p_best
                
                matched_lower = [m.lower() for m in matched]
                if any(any(c in m or m in c for c in criteria) for m in matched_lower) or any(c in title_lower for c in criteria):
                    pitches.append(f"Destaca tu proyecto **{p_name}** ({p_desc}).")

        if not pitches:
            portfolio = self.profile.get("portfolio_url") or "tu portfolio/GitHub"
            pitches.append(
                f"Presenta tus proyectos y experiencia técnica en {portfolio} demostrando tus competencias en {', '.join(matched[:4]) if matched else 'desarrollo de software'}."
            )

        if is_asturias:
            geo_advantage = (
                f"Ventaja competitiva muy alta: resides en el **Principado de Asturias**, por lo que puedes acudir en modalidad **{remote_type}** sin costes de reubicación para la empresa."
            )
            geo_bonus = 12.0
            barrier = "Baja (Ventaja local en Asturias + Portfolio real)"
        elif region == "SPAIN_REMOTE":
            geo_advantage = "Oferta **100% Remota en España**: encaje legal, fiscal y comunicación 100% en español nativo (ideal para nivel de inglés A2)."
            geo_bonus = 9.0
            barrier = "Media-Baja (Apta para Junior con proyectos propios)"
        elif region == "LATAM_REMOTE":
            geo_advantage = "Oferta **100% Remota en Latinoamérica**: comunicación 100% en español nativo sin barrera de idioma."
            geo_bonus = 8.5
            barrier = "Baja (Idioma español + Stack coincidente)"
        else:
            geo_advantage = "Oferta **100% Remota Internacional**: verificar si el equipo permite trabajo asíncrono o comunicación escrita con soporte de traducción (nivel de inglés A2 básico)."
            geo_bonus = 5.0
            barrier = "Media-Alta (Nivel inglés A2 frente a exigencias internacionales)"

        base_b = min(98.0, job_after_a["motor_a_score"] * 0.88 + geo_bonus)
        skills_str = ", ".join(matched[:6]) if matched else "Python, Backend"

        explanation = (
            f"Encaja con tu perfil por coincidencia directa en **{skills_str}**. "
            f"{geo_advantage} "
            f"Nivel detectado: *{job_after_a.get('experience_level')}*."
        )

        # Si el usuario configuró GEMINI_API_KEY o AI_API_KEY, enriquecemos la explicación vía IA
        if (settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip()) or (settings.AI_API_KEY and settings.AI_API_KEY.strip()):
            llm_note = self._call_optional_llm(job_after_a, explanation)
            if llm_note:
                explanation = llm_note

        return {
            **job_after_a,
            "motor_b_score": round(base_b, 1),
            "matching_explanation": explanation,
            "recommended_pitch": " ".join(pitches),
            "entry_barrier": barrier,
        }

    def _call_optional_llm(self, job: Dict[str, Any], fallback_text: str) -> str | None:
        """
        Llama a la API de Google Gemini (nivel gratuito de Google AI Studio)
        o a un endpoint compatible con OpenAI (Groq, etc.) para generar una recomendación precisa.
        """
        gemini_key = (settings.GEMINI_API_KEY or "").strip()
        openai_key = (settings.AI_API_KEY or "").strip()

        if not gemini_key and not openai_key:
            return fallback_text

        candidate_name = self.profile.get("name", "Candidato")
        candidate_title = self.profile.get("title", "Desarrollador de Software")
        residence = self.profile.get("residence", {})
        residence_loc = residence.get("autonomous_community") or residence.get("country", "España")
        portfolio = self.profile.get("portfolio_url", "")
        languages = self.profile.get("languages", {})
        english_level = languages.get("english", "técnico para lectura de APIs")

        user_projects = self.profile.get("projects", [])
        if user_projects:
            projects_desc = "\n".join(
                [f"- {p.get('name')}: {p.get('description', '')}" for p in user_projects[:6]]
            )
        else:
            projects_desc = "- Proyectos de desarrollo backend y APIs en GitHub"

        prompt = (
            f"Eres un reclutador IT experto evaluando la candidatura de {candidate_name}, "
            f"{candidate_title} residente en {residence_loc}. "
            f"Su nivel de inglés es: {english_level}. "
            f"Proyectos destacados en su portfolio ({portfolio}):\n"
            f"{projects_desc}\n"
            f"Evalúa brevemente en máximo 2 frases claras en español por qué encaja o qué proyecto debe destacar:\n"
            f"Puesto: {job.get('title')} en {job.get('company')} ({job.get('location')} - Modalidad: {job.get('remote_type')})\n"
            f"Tecnologías detectadas: {', '.join(job.get('matched_skills', []))}"
        )

        # 1. Si está configurada la API de Google Gemini (nivel gratuito)
        if gemini_key:
            try:
                gemini_model = settings.AI_MODEL if "gemini" in settings.AI_MODEL else "gemini-2.0-flash"
                gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={gemini_key}"
                with httpx.Client(verify=False, timeout=8.0) as client:
                    resp = client.post(
                        gemini_url,
                        headers={"Content-Type": "application/json"},
                        json={
                            "contents": [{"parts": [{"text": prompt}]}],
                            "generationConfig": {
                                "temperature": 0.2,
                                "maxOutputTokens": 180,
                            },
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts and "text" in parts[0]:
                                text_out = parts[0]["text"].strip()
                                if text_out:
                                    return text_out
            except Exception:
                pass

        # 2. Si está configurada una API compatible con OpenAI / Groq
        if openai_key and settings.AI_BASE_URL:
            try:
                with httpx.Client(timeout=8.0) as client:
                    resp = client.post(
                        f"{settings.AI_BASE_URL.rstrip('/')}/chat/completions",
                        headers={"Authorization": f"Bearer {openai_key}"},
                        json={
                            "model": settings.AI_MODEL or "gpt-4o-mini",
                            "messages": [{"role": "user", "content": prompt}],
                            "max_tokens": 140,
                            "temperature": 0.2,
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        content = data["choices"][0]["message"]["content"].strip()
                        if content:
                            return content
            except Exception:
                pass

        return fallback_text

    def run_motor_c_ranking(self, evaluated_jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Motor C (Ranking Final Top 20):
        Combina:
        - Matching Técnico Motor A (35%)
        - Evaluación IA Motor B (35%)
        - Accesibilidad Junior / Sin Experiencia (20%)
        - Condiciones y Ubicación Asturias/Remoto (10%)
        Y selecciona las 20 mejores ofertas donde tiene mayor probabilidad de contratación.
        """
        ranked: List[Dict[str, Any]] = []
        for job in evaluated_jobs:
            if job.get("is_discarded"):
                job["final_score"] = round(job.get("motor_a_score", 0.0), 1)
                job["is_top_20"] = False
                job["top_20_rank"] = None
                ranked.append(job)
                continue

            motor_a = float(job.get("motor_a_score", 0.0))
            motor_b = float(job.get("motor_b_score", 0.0))
            junior_score = 95.0 if "Junior" in job.get("experience_level", "") else 78.0
            cond_score = 100.0 if job.get("is_asturias_local") else (94.0 if job.get("region_scope") in ("SPAIN_REMOTE", "LATAM_REMOTE") else 85.0)

            final_score = round(
                (motor_a * 0.35) + (motor_b * 0.35) + (junior_score * 0.20) + (cond_score * 0.10),
                1,
            )
            job["final_score"] = min(99.5, final_score)
            ranked.append(job)

        # Separar válidas y descartadas
        valid_jobs = [j for j in ranked if not j.get("is_discarded")]
        discarded_jobs = [j for j in ranked if j.get("is_discarded")]

        valid_jobs.sort(
            key=lambda x: (
                x["final_score"],
                1 if x.get("is_asturias_local") else 0,
                len(x.get("matched_skills", [])),
            ),
            reverse=True,
        )

        for idx, job in enumerate(valid_jobs):
            if idx < 20:
                job["is_top_20"] = True
                job["top_20_rank"] = idx + 1
            else:
                job["is_top_20"] = False
                job["top_20_rank"] = None

        return valid_jobs + discarded_jobs


matching_engine = MatchingEngine()
