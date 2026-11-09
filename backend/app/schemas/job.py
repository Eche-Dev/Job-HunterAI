from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, computed_field


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin_username: str
    waf_protected: bool = True


class JobStatusUpdate(BaseModel):
    application_status: Optional[str] = Field(
        default=None, description="pendiente | favorita | solicitada | entrevista | descartada"
    )
    is_favorite: Optional[bool] = None


class SearchRunRequest(BaseModel):
    sources: Optional[List[str]] = Field(
        default=None,
        description="Lista opcional de fuentes a ejecutar. Si es nula, ejecuta todas las fuentes habilitadas.",
    )
    keywords: Optional[List[str]] = Field(
        default=None,
        description="Palabras clave adicionales para buscar.",
    )


class JobOfferOut(BaseModel):
    id: int
    source: str
    source_category: str
    external_id: str
    title: str
    company: str
    description: str
    location: str
    country: str
    region_scope: str
    remote_type: str
    is_asturias_local: bool
    employment_type: str
    salary_range: Optional[str] = None
    language_required: str
    experience_level: str
    technologies: List[str] = []
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    motor_a_score: float
    motor_b_score: float
    final_score: float
    is_top_20: bool
    top_20_rank: Optional[int] = None
    is_discarded: bool
    discard_reason: Optional[str] = None
    matching_explanation: Optional[str] = None
    recommended_pitch: Optional[str] = None
    entry_barrier: Optional[str] = None
    application_status: str
    is_favorite: bool
    original_url: str
    published_at: Optional[str] = None
    discovered_at: Optional[datetime] = None

    @computed_field
    @property
    def is_new(self) -> bool:
        """Una oferta se considera NUEVA automáticamente durante sus primeras 24 horas desde que fue descubierta."""
        if not self.discovered_at:
            return False
        now = datetime.now(timezone.utc)
        disc = self.discovered_at
        if disc.tzinfo is None:
            disc = disc.replace(tzinfo=timezone.utc)
        return (now - disc).total_seconds() < 24 * 3600

    model_config = {"from_attributes": True}


class DashboardStatsOut(BaseModel):
    total_active_offers: int
    top_20_count: int
    asturias_local_count: int
    spain_remote_count: int
    latam_remote_count: int
    global_remote_count: int
    linkedin_offers_and_posts_count: int
    discarded_count: int
    favorites_count: int
    applied_count: int
    last_run: Optional[Dict[str, Any]] = None
    waf_summary: Dict[str, Any]
