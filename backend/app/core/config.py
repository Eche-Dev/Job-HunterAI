import json
import os
from pathlib import Path
from typing import Any, Dict, List
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent
CONFIG_DIR = BASE_DIR / "config"
DATA_DIR = BASE_DIR / "data"
RUNS_DIR = DATA_DIR / "runs"

DATA_DIR.mkdir(parents=True, exist_ok=True)
RUNS_DIR.mkdir(parents=True, exist_ok=True)


class Settings:
    PROJECT_NAME: str = "Job Hunter AI + Gatekeeper WAF (Eche-Dev)"
    VERSION: str = "2.0.0"

    # Database: supports Railway PostgreSQL (postgres:// -> postgresql://) or local SQLite
    RAW_DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{(DATA_DIR / 'jobhunter.db').as_posix()}")

    @property
    def DATABASE_URL(self) -> str:
        url = self.RAW_DATABASE_URL
        if url.startswith("sqlite:///./"):
            return f"sqlite:///{(DATA_DIR / 'jobhunter.db').as_posix()}"
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+psycopg2://", 1)
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url

    # Security & Admin
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "cambia-este-secreto-super-seguro-en-produccion-2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hours
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "AdminPass2026!")
    ADMIN_SECRET_PATH: str = os.getenv("ADMIN_SECRET_PATH", "gatekeeper-admin")

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        ).split(",")
        if origin.strip()
    ]

    # Scraping & Cost Control
    APIFY_API_TOKEN: str = os.getenv("APIFY_API_TOKEN", "")
    MAX_SEARCH_BUDGET_USD: float = float(os.getenv("MAX_SEARCH_BUDGET_USD", "2.00"))

    # AI Evaluation (Motor B) - Soporte nativo para Google Gemini (gratis) o OpenAI/Groq compatible
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "gemini")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")
    AI_MODEL: str = os.getenv("AI_MODEL", "gemini-3.5-flash-lite")
    AI_BASE_URL: str = os.getenv("AI_BASE_URL", "")

    def load_candidate_profile(self) -> Dict[str, Any]:
        profile_path = CONFIG_DIR / "candidate_profile.json"
        if profile_path.exists():
            with open(profile_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def save_candidate_profile(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        profile_path = CONFIG_DIR / "candidate_profile.json"
        with open(profile_path, "w", encoding="utf-8") as f:
            json.dump(profile_data, f, ensure_ascii=False, indent=2)
        return profile_data

    def load_cost_router(self) -> Dict[str, Any]:
        router_path = CONFIG_DIR / "cost_router.json"
        if router_path.exists():
            with open(router_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def save_cost_router(self, router_data: Dict[str, Any]) -> Dict[str, Any]:
        router_path = CONFIG_DIR / "cost_router.json"
        with open(router_path, "w", encoding="utf-8") as f:
            json.dump(router_data, f, ensure_ascii=False, indent=2)
        return router_data


settings = Settings()
