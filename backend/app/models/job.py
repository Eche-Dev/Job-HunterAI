from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, JSON, String, Text

from app.db.session import Base


class JobOffer(Base):
    __tablename__ = "job_offers"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(80), index=True, nullable=False)
    source_category = Column(String(60), index=True, nullable=False)  # linkedin_jobs, linkedin_posts, spain_asturias, latam_remote, global_remote
    external_id = Column(String(180), index=True, nullable=False)
    content_hash = Column(String(64), unique=True, index=True, nullable=False)

    title = Column(String(255), nullable=False, index=True)
    company = Column(String(180), nullable=False, index=True)
    description = Column(Text, nullable=False)
    location = Column(String(180), nullable=False, index=True)
    country = Column(String(80), nullable=False, index=True)
    region_scope = Column(String(60), index=True, nullable=False)  # ASTURIAS, SPAIN_REMOTE, LATAM_REMOTE, GLOBAL_REMOTE
    remote_type = Column(String(40), index=True, nullable=False)  # remote, hybrid, onsite
    is_asturias_local = Column(Boolean, default=False, index=True)

    employment_type = Column(String(60), default="Full-time")
    salary_range = Column(String(120), nullable=True)
    language_required = Column(String(80), default="Español / Inglés B1")
    experience_level = Column(String(60), default="Junior / Entry-Level")

    technologies = Column(JSON, default=list)
    matched_skills = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)

    # Puntuaciones de los 3 Motores
    motor_a_score = Column(Float, default=0.0, index=True)  # Matching determinista (0-100)
    motor_b_score = Column(Float, default=0.0, index=True)  # Evaluador IA (0-100)
    final_score = Column(Float, default=0.0, index=True)  # Motor C Ranking combinado (0-100)
    is_top_20 = Column(Boolean, default=False, index=True)
    top_20_rank = Column(Integer, nullable=True, index=True)

    # Estado de filtrado y explicación IA
    is_discarded = Column(Boolean, default=False, index=True)
    discard_reason = Column(String(255), nullable=True)
    matching_explanation = Column(Text, nullable=True)
    recommended_pitch = Column(Text, nullable=True)
    entry_barrier = Column(String(80), default="Baja / Accesible para Junior")

    # Gestión del candidato
    application_status = Column(String(40), default="pendiente", index=True)  # pendiente, favorita, solicitada, entrevista, descartada
    is_favorite = Column(Boolean, default=False, index=True)
    is_new = Column(Boolean, default=True, index=True)

    original_url = Column(String(500), nullable=False)
    published_at = Column(String(80), nullable=True)
    discovered_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SearchRun(Base):
    __tablename__ = "search_runs"

    id = Column(Integer, primary_key=True, index=True)
    run_uid = Column(String(80), unique=True, index=True, nullable=False)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(40), default="completed")
    sources_executed = Column(JSON, default=list)
    cost_comparison_summary = Column(JSON, default=dict)
    total_found = Column(Integer, default=0)
    total_valid_after_motor_a = Column(Integer, default=0)
    total_discarded_geography_or_seniority = Column(Integer, default=0)
    top_20_count = Column(Integer, default=0)
    json_export_dir = Column(String(300), nullable=True)
    estimated_cost_usd = Column(Float, default=0.0)
    saved_cost_usd = Column(Float, default=0.0)


class WAFSecurityEvent(Base):
    __tablename__ = "waf_security_events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    client_ip = Column(String(80), index=True, nullable=False)
    method = Column(String(20), default="GET")
    path = Column(String(300), nullable=False)
    rule_triggered = Column(String(100), index=True, nullable=False)
    severity = Column(String(40), default="HIGH", index=True)
    details = Column(String(500), nullable=True)
