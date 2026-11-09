import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import DATA_DIR, settings
from app.core.cost_control import cost_router_service
from app.core.gatekeeper_waf import inspect_text_for_attacks, waf_state
from app.core.security import create_access_token, require_admin, verify_password
from app.db.session import get_db
from app.models.job import JobOffer, SearchRun
from app.schemas.job import (
    DashboardStatsOut,
    JobOfferOut,
    JobStatusUpdate,
    LoginRequest,
    SearchRunRequest,
    TokenResponse,
)
from app.services.search_service import search_orchestrator

router = APIRouter()


@router.get("/health")
def health_check() -> Dict[str, Any]:
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "waf": "Gatekeeper WAF Active",
        "location_policy": "Asturias (Presencial/Híbrido/Remoto) + Resto del Mundo (100% Remoto)",
    }


@router.post("/auth/login", response_model=TokenResponse)
def login_admin(payload: LoginRequest) -> TokenResponse:
    if payload.username != settings.ADMIN_USERNAME or not verify_password(
        payload.password, settings.ADMIN_PASSWORD
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas. Intento registrado por Gatekeeper WAF.",
        )
    token = create_access_token(subject=payload.username)
    return TokenResponse(
        access_token=token,
        admin_username=payload.username,
        waf_protected=True,
    )


@router.get("/auth/me")
def get_admin_me(admin: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    return {
        "authenticated": True,
        "username": admin.get("sub"),
        "role": admin.get("role"),
        "admin_secret_path": settings.ADMIN_SECRET_PATH,
    }


@router.get("/profile")
def get_public_profile() -> Dict[str, Any]:
    return settings.load_candidate_profile()


@router.get("/cost-comparison")
def get_cost_comparison_preview(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Devuelve la comparativa de las 5 herramientas por fuente e histórico de gasto acumulado."""
    return cost_router_service.evaluate_all_sources(db=db)


@router.get("/jobs", response_model=List[JobOfferOut])
def list_jobs(
    only_top_20: bool = False,
    only_discarded: bool = False,
    region_scope: Optional[str] = None,
    source_category: Optional[str] = None,
    technology: Optional[str] = None,
    search: Optional[str] = None,
    include_discarded: bool = False,
    db: Session = Depends(get_db),
) -> List[JobOffer]:
    query = db.query(JobOffer)

    if only_discarded:
        query = query.filter(JobOffer.is_discarded.is_(True))
    elif not include_discarded:
        query = query.filter(JobOffer.is_discarded.is_(False))

    if only_top_20 and not only_discarded:
        query = query.filter(JobOffer.is_top_20.is_(True))
    if region_scope and region_scope != "ALL":
        query = query.filter(JobOffer.region_scope == region_scope)
    if source_category and source_category != "ALL":
        query = query.filter(JobOffer.source_category == source_category)
    if search and search.strip():
        q = f"%{search.strip()}%"
        query = query.filter(
            (JobOffer.title.ilike(q)) | (JobOffer.company.ilike(q)) | (JobOffer.location.ilike(q))
        )

    jobs = query.order_by(JobOffer.is_discarded.asc(), JobOffer.final_score.desc()).all()

    if technology and technology.strip() and technology != "ALL":
        tech_lower = technology.strip().lower()
        jobs = [
            j
            for j in jobs
            if any(tech_lower in t.lower() for t in (j.technologies or []))
        ]

    return jobs


@router.get("/jobs/top20-json")
def get_latest_top_20_json() -> Dict[str, Any]:
    top_20_file = DATA_DIR / "latest_top_20.json"
    if top_20_file.exists():
        with open(top_20_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"message": "Aún no se ha generado ningún archivo JSON. Ejecuta una búsqueda primero."}


@router.get("/stats", response_model=DashboardStatsOut)
def get_dashboard_stats(db: Session = Depends(get_db)) -> DashboardStatsOut:
    all_jobs = db.query(JobOffer).all()
    valid_jobs = [j for j in all_jobs if not j.is_discarded]
    discarded_jobs = [j for j in all_jobs if j.is_discarded]

    top_20_count = sum(1 for j in valid_jobs if j.is_top_20)
    asturias_count = sum(1 for j in valid_jobs if j.region_scope == "ASTURIAS" or j.is_asturias_local)
    spain_remote_count = sum(1 for j in valid_jobs if j.region_scope == "SPAIN_REMOTE")
    latam_remote_count = sum(1 for j in valid_jobs if j.region_scope == "LATAM_REMOTE")
    global_remote_count = sum(1 for j in valid_jobs if j.region_scope == "GLOBAL_REMOTE")
    linkedin_count = sum(
        1 for j in valid_jobs if j.source_category in ("linkedin_jobs", "linkedin_posts")
    )
    favorites_count = sum(1 for j in all_jobs if j.is_favorite or j.application_status == "favorita")
    applied_count = sum(1 for j in all_jobs if j.application_status in ("solicitada", "entrevista"))

    last_run_obj = db.query(SearchRun).order_by(SearchRun.id.desc()).first()
    last_run_dict = None
    if last_run_obj:
        last_run_dict = {
            "run_uid": last_run_obj.run_uid,
            "completed_at": last_run_obj.completed_at.isoformat() if last_run_obj.completed_at else None,
            "status": last_run_obj.status,
            "sources_executed": last_run_obj.sources_executed,
            "total_found": last_run_obj.total_found,
            "total_valid_after_motor_a": last_run_obj.total_valid_after_motor_a,
            "total_discarded": last_run_obj.total_discarded_geography_or_seniority,
            "top_20_count": last_run_obj.top_20_count,
            "estimated_cost_usd": last_run_obj.estimated_cost_usd,
            "saved_cost_usd": last_run_obj.saved_cost_usd,
            "json_export_dir": last_run_obj.json_export_dir,
        }

    return DashboardStatsOut(
        total_active_offers=len(valid_jobs),
        top_20_count=top_20_count,
        asturias_local_count=asturias_count,
        spain_remote_count=spain_remote_count,
        latam_remote_count=latam_remote_count,
        global_remote_count=global_remote_count,
        linkedin_offers_and_posts_count=linkedin_count,
        discarded_count=len(discarded_jobs),
        favorites_count=favorites_count,
        applied_count=applied_count,
        last_run=last_run_dict,
        waf_summary=waf_state.get_summary(),
    )


# =====================================================================
# ENDPOINTS PRIVADOS DE ADMINISTRACIÓN (PROTEGIDOS CON JWT + WAF)
# =====================================================================

@router.post("/admin/search-runs")
def trigger_manual_search_run(
    request: SearchRunRequest = SearchRunRequest(),
    db: Session = Depends(get_db),
    admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    """
    Ejecuta manualmente la búsqueda por partes:
    1) Compara las 5 herramientas por fuente y elige la más barata.
    2) Recopila y guarda cada parte en JSON.
    3) Ejecuta Motor A (Asturias / 100% Remoto) + Motor B (IA) + Motor C (Top 20).
    """
    result = search_orchestrator.execute_search_run(db=db, selected_sources=request.sources)
    result["triggered_by"] = admin.get("sub")
    return result


@router.get("/admin/search-runs")
def list_search_runs(
    db: Session = Depends(get_db),
    admin: Dict[str, Any] = Depends(require_admin),
) -> List[Dict[str, Any]]:
    runs = db.query(SearchRun).order_by(SearchRun.id.desc()).limit(15).all()
    return [
        {
            "id": r.id,
            "run_uid": r.run_uid,
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            "status": r.status,
            "sources_executed": r.sources_executed,
            "total_found": r.total_found,
            "total_valid_after_motor_a": r.total_valid_after_motor_a,
            "total_discarded": r.total_discarded_geography_or_seniority,
            "top_20_count": r.top_20_count,
            "estimated_cost_usd": r.estimated_cost_usd,
            "saved_cost_usd": r.saved_cost_usd,
            "json_export_dir": r.json_export_dir,
        }
        for r in runs
    ]


@router.patch("/admin/jobs/{job_id}/status", response_model=JobOfferOut)
def update_job_status(
    job_id: int,
    payload: JobStatusUpdate,
    db: Session = Depends(get_db),
    admin: Dict[str, Any] = Depends(require_admin),
) -> JobOffer:
    job = db.query(JobOffer).filter(JobOffer.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Oferta no encontrada.")
    if payload.application_status is not None:
        job.application_status = payload.application_status
    if payload.is_favorite is not None:
        job.is_favorite = payload.is_favorite
    db.commit()
    db.refresh(job)
    return job


@router.delete("/admin/jobs/{job_id}")
def delete_job_offer(
    job_id: int,
    db: Session = Depends(get_db),
    admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    job = db.query(JobOffer).filter(JobOffer.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Oferta no encontrada.")
    db.delete(job)
    db.commit()
    return {"deleted": True, "job_id": job_id}


@router.get("/admin/waf-status")
def get_waf_security_status(admin: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    return waf_state.get_summary()


@router.delete("/admin/waf/events")
def clear_waf_security_events(
    db: Session = Depends(get_db),
    admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    """
    Elimina permanentemente el historial de ataques y auditoría del WAF en base de datos.
    """
    deleted_count = db.query(WAFSecurityEvent).delete()
    db.commit()
    waf_state.recent_events.clear()
    waf_state.total_blocked = 0
    return {"deleted_count": deleted_count, "message": "Auditoría de eventos WAF limpiada exitosamente."}


@router.post("/admin/waf/test-probe")
def test_waf_probe(
    payload: Dict[str, str],
    admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    """
    Permite probar ataques simulados (SQLi, XSS, Path Traversal o Petición Limpia)
    para verificar en tiempo real cómo Gatekeeper WAF intercepta, bloquea y audita.
    """
    probe_text = payload.get("payload", "").strip()
    attack_type = payload.get("attack_type", "Prueba Manual")

    is_attack, rule = inspect_text_for_attacks(probe_text)
    if is_attack:
        waf_state.record_event(
            client_ip="127.0.0.1 (Simulador Admin)",
            path=f"/api/v1/jobs?search={probe_text[:60]}",
            method="GET",
            rule_triggered=rule,
            severity="CRITICAL" if "SQLi" in rule else "HIGH",
            details=f"Ataque simulado interceptado por Gatekeeper WAF: {attack_type}",
        )
        return {
            "blocked": True,
            "rule_triggered": rule,
            "http_status": 403,
            "action": "BLOQUEADO 403 FORBIDDEN",
            "message": f"Ataque neutralizado por Gatekeeper WAF bajo la regla '{rule}'.",
            "summary": waf_state.get_summary(),
        }

    return {
        "blocked": False,
        "rule_triggered": None,
        "http_status": 200,
        "action": "PERMITIDO 200 OK",
        "message": "Petición limpia. Sin patrones maliciosos detectados por Gatekeeper WAF.",
        "summary": waf_state.get_summary(),
    }


@router.put("/admin/profile")
def update_candidate_profile(
    profile_data: Dict[str, Any],
    admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    updated = settings.save_candidate_profile(profile_data)
    return {"status": "updated", "profile": updated}
