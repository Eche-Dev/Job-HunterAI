from datetime import datetime, timezone
import json
import re
from typing import Any, Dict, List, Set

from sqlalchemy.orm import Session

from app.core.config import DATA_DIR, RUNS_DIR
from app.core.cost_control import cost_router_service
from app.matching.engine import compute_content_hash, matching_engine
from app.models.job import JobOffer, SearchRun
from app.scrapers.sources import multi_source_scraper


class SearchOrchestratorService:
    """
    Orquesta el flujo completo de 9 pasos:
    1. Selección de fuentes
    2. Comparador de costes de 5 herramientas por fuente
    3. Extracción por partes y guardado en JSON (`part_1_linkedin_jobs.json`, etc.)
    4. Normalización + Deduplicación
    5. Motor A (Matching determinista + Regla estricta Principado de Asturias / 100% Remoto)
    6. Preselección de candidaturas válidas
    7. Motor B (Evaluador IA + Pitch con proyectos de echedev.vercel.app)
    8. Motor C (Ranking de las 20 mejores ofertas) + Guardado en `top_20_recommendations.json`
    9. Persistencia en Base de Datos (PostgreSQL / SQLite)
    """

    def execute_search_run(
        self,
        db: Session,
        selected_sources: List[str] | None = None,
    ) -> Dict[str, Any]:
        started_at = datetime.now(timezone.utc)
        run_uid = f"run_{started_at.strftime('%Y%m%d_%H%M%S')}"
        run_folder = RUNS_DIR / run_uid
        run_folder.mkdir(parents=True, exist_ok=True)

        # Paso 2: Comparar las 5 herramientas por cada fuente antes de buscar
        cost_report = cost_router_service.evaluate_all_sources(selected_sources)
        with open(run_folder / "00_cost_comparison_5_tools.json", "w", encoding="utf-8") as f:
            json.dump(cost_report, f, ensure_ascii=False, indent=2)

        raw_offers_all: List[Dict[str, Any]] = []
        sources_executed_names: List[str] = []

        # Paso 3: Recopilación por partes y guardado individual en JSON
        for idx, source_eval in enumerate(cost_report.get("sources_evaluated", []), start=1):
            source_key = source_eval["source_key"]
            winning_tool = source_eval["selected_tool"]
            sources_executed_names.append(source_key)

            batch_offers = multi_source_scraper.fetch_source(source_key, winning_tool)
            part_filename = f"part_{idx:02d}_{source_key}.json"
            part_payload = {
                "part_number": idx,
                "source_key": source_key,
                "display_name": source_eval["display_name"],
                "selected_cheapest_tool": winning_tool,
                "offers_count": len(batch_offers),
                "offers": batch_offers,
            }
            with open(run_folder / part_filename, "w", encoding="utf-8") as f:
                json.dump(part_payload, f, ensure_ascii=False, indent=2)

            raw_offers_all.extend(batch_offers)

        # Paso 4: Deduplicación estricta por huella SHA-256 y por clave canónica (título normalizado + empresa normalizada)
        deduped_offers: List[Dict[str, Any]] = []
        seen_hashes: Set[str] = set()
        seen_title_company: Set[str] = set()

        for raw in raw_offers_all:
            raw_title = str(raw.get("title", ""))
            raw_company = str(raw.get("company", ""))
            raw_id = str(raw.get("external_id", ""))
            c_hash = compute_content_hash(
                source=str(raw.get("source", "")),
                external_id=raw_id,
                title=raw_title,
                company=raw_company,
                location=str(raw.get("location", "")),
            )
            norm_key = (
                re.sub(r"[^a-z0-9]", "", raw_title.lower()),
                re.sub(r"[^a-z0-9]", "", raw_company.lower()),
            )

            # Si ya se procesó esta vacante idéntica (misma empresa y mismo puesto, o mismo hash), se omite
            if c_hash in seen_hashes:
                continue
            if norm_key[0] and norm_key[1] and norm_key in seen_title_company:
                continue

            seen_hashes.add(c_hash)
            if norm_key[0] and norm_key[1]:
                seen_title_company.add(norm_key)

            raw["content_hash"] = c_hash
            deduped_offers.append(raw)

        # Paso 5 y 6: Motor A (Determinista) y Preselección
        matching_engine.reload_profile()
        motor_a_results = [matching_engine.run_motor_a(offer) for offer in deduped_offers]

        # Paso 7: Motor B (Evaluador IA solo para las no descartadas por Motor A)
        motor_b_results = [matching_engine.run_motor_b(offer) for offer in motor_a_results]

        # Paso 8: Motor C (Ranking Final Top 20)
        final_ranked_offers = matching_engine.run_motor_c_ranking(motor_b_results)
        top_20_offers = [o for o in final_ranked_offers if o.get("is_top_20")]
        discarded_offers = [o for o in final_ranked_offers if o.get("is_discarded")]
        valid_offers = [o for o in final_ranked_offers if not o.get("is_discarded")]

        cand_name = matching_engine.profile.get("name", "Candidato")
        cand_url = matching_engine.profile.get("portfolio_url", "")
        cand_str = f"{cand_name} ({cand_url})" if cand_url else cand_name
        residence = matching_engine.profile.get("residence", {})
        local_reg = residence.get("autonomous_community") or residence.get("region") or "Zona Local"
        policy_str = f"Presencial/Híbrido en {local_reg} | 100% Remoto en España, LATAM y Global"

        # Guardar JSON del Top 20 en la carpeta de la ejecución y en latest_top_20.json
        top_20_export = {
            "run_uid": run_uid,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "candidate": cand_str,
            "location_policy": policy_str,
            "total_evaluated": len(final_ranked_offers),
            "total_valid": len(valid_offers),
            "total_discarded_by_motor_a": len(discarded_offers),
            "top_20_count": len(top_20_offers),
            "cost_summary": {
                "total_estimated_cost_usd": cost_report["total_estimated_cost_usd"],
                "total_estimated_savings_usd": cost_report["total_estimated_savings_usd"],
            },
            "top_20_offers": top_20_offers,
        }
        with open(run_folder / "top_20_recommendations.json", "w", encoding="utf-8") as f:
            json.dump(top_20_export, f, ensure_ascii=False, indent=2)
        with open(DATA_DIR / "latest_top_20.json", "w", encoding="utf-8") as f:
            json.dump(top_20_export, f, ensure_ascii=False, indent=2)

        # Paso 9: Persistir en PostgreSQL / SQLite
        # No eliminamos ofertas existentes para preservar permanentemente cualquier estado o favorito asignado por el usuario.
        db.query(JobOffer).update({JobOffer.is_top_20: False, JobOffer.top_20_rank: None})

        new_offers_count = 0

        for item in final_ranked_offers:
            # Buscar coincidencia existente por hash O por URL original
            existing_by_hash = db.query(JobOffer).filter(JobOffer.content_hash == item["content_hash"]).first()
            existing_by_url = db.query(JobOffer).filter(JobOffer.original_url == item["original_url"]).first()
            existing = existing_by_hash or existing_by_url

            if existing:
                # Si existing_by_url era distinto y el hash ya existía en otra fila, sincronizar
                if existing_by_hash and existing_by_hash.id != existing.id:
                    db.delete(existing_by_hash)
                    db.flush()

                existing.content_hash = item["content_hash"]
                existing.title = item["title"]
                existing.company = item["company"]
                existing.description = item["description"]
                existing.location = item["location"]
                existing.country = item["country"]
                existing.region_scope = item["region_scope"]
                existing.remote_type = item["remote_type"]
                existing.is_asturias_local = item["is_asturias_local"]
                existing.salary_range = item.get("salary_range")
                existing.language_required = item["language_required"]
                existing.experience_level = item["experience_level"]
                existing.technologies = item["technologies"]
                existing.matched_skills = item["matched_skills"]
                existing.missing_skills = item["missing_skills"]
                existing.motor_a_score = item["motor_a_score"]
                existing.motor_b_score = item["motor_b_score"]
                existing.final_score = item["final_score"]
                existing.is_top_20 = item["is_top_20"]
                existing.top_20_rank = item["top_20_rank"]
                existing.is_discarded = item["is_discarded"]
                existing.discard_reason = item["discard_reason"]
                existing.matching_explanation = item["matching_explanation"]
                existing.recommended_pitch = item["recommended_pitch"]
                existing.entry_barrier = item["entry_barrier"]
                existing.original_url = item["original_url"]
                existing.published_at = item.get("published_at")
            else:
                new_offers_count += 1
                new_job = JobOffer(
                    source=item["source"],
                    source_category=item["source_category"],
                    external_id=item["external_id"],
                    content_hash=item["content_hash"],
                    title=item["title"],
                    company=item["company"],
                    description=item["description"],
                    location=item["location"],
                    country=item["country"],
                    region_scope=item["region_scope"],
                    remote_type=item["remote_type"],
                    is_asturias_local=item["is_asturias_local"],
                    salary_range=item.get("salary_range"),
                    language_required=item["language_required"],
                    experience_level=item["experience_level"],
                    technologies=item["technologies"],
                    matched_skills=item["matched_skills"],
                    missing_skills=item["missing_skills"],
                    motor_a_score=item["motor_a_score"],
                    motor_b_score=item["motor_b_score"],
                    final_score=item["final_score"],
                    is_top_20=item["is_top_20"],
                    top_20_rank=item["top_20_rank"],
                    is_discarded=item["is_discarded"],
                    discard_reason=item["discard_reason"],
                    matching_explanation=item["matching_explanation"],
                    recommended_pitch=item["recommended_pitch"],
                    entry_barrier=item["entry_barrier"],
                    original_url=item["original_url"],
                    published_at=item.get("published_at"),
                    is_new=True,
                )
                db.add(new_job)

        completed_at = datetime.now(timezone.utc)
        search_run_record = SearchRun(
            run_uid=run_uid,
            started_at=started_at,
            completed_at=completed_at,
            status="completed",
            sources_executed=sources_executed_names,
            cost_comparison_summary=cost_report,
            total_found=len(deduped_offers),
            total_valid_after_motor_a=len(valid_offers),
            total_discarded_geography_or_seniority=len(discarded_offers),
            top_20_count=len(top_20_offers),
            json_export_dir=str(run_folder),
            estimated_cost_usd=cost_report["total_estimated_cost_usd"],
            saved_cost_usd=cost_report["total_estimated_savings_usd"],
        )
        db.add(search_run_record)
        db.commit()
        db.refresh(search_run_record)

        return {
            "run_uid": run_uid,
            "status": "completed",
            "started_at": started_at.isoformat(),
            "completed_at": completed_at.isoformat(),
            "sources_executed": sources_executed_names,
            "total_found": len(deduped_offers),
            "total_valid_after_motor_a": len(valid_offers),
            "total_discarded": len(discarded_offers),
            "top_20_count": len(top_20_offers),
            "estimated_cost_usd": cost_report["total_estimated_cost_usd"],
            "saved_cost_usd": cost_report["total_estimated_savings_usd"],
            "new_offers_count": new_offers_count,
            "json_files_saved_in": str(run_folder),
            "cost_comparison": cost_report,
        }


search_orchestrator = SearchOrchestratorService()
