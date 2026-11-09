from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_v1_router
from app.core.config import settings
from app.core.gatekeeper_waf import GatekeeperWAFMiddleware
from app.db.session import Base, SessionLocal, engine
from app.models.job import JobOffer
from app.services.search_service import search_orchestrator


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crear tablas automáticamente al iniciar
    Base.metadata.create_all(bind=engine)
    # Asegurar columnas nuevas en bases de datos existentes sin romper
    with engine.connect() as conn:
        try:
            from sqlalchemy import text
            conn.execute(text("ALTER TABLE job_offers ADD COLUMN is_new BOOLEAN DEFAULT FALSE"))
            conn.commit()
        except Exception:
            pass
    # Si la base de datos está vacía, ejecutar una recopilación inicial automática
    # para que la web pública y el archivo JSON del Top 20 estén listos desde el primer segundo
    db = SessionLocal()
    try:
        count = db.query(JobOffer).count()
        if count == 0:
            search_orchestrator.execute_search_run(db=db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Plataforma inteligente de búsqueda y evaluación de empleo IT para Eche-Dev. "
        "Incluye Comparador de 5 Herramientas por Fuente, Regla Geográfica Estricta "
        "(Presencial/Híbrido exclusivo en Principado de Asturias, 100% Remoto en España, LATAM y Global), "
        "Motor A Determinista, Motor B con IA, Ranking Top 20 y protección Gatekeeper WAF."
    ),
    lifespan=lifespan,
)

# 1. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Gatekeeper WAF Middleware (Inspección OWASP SQLi/XSS, Rate Limiting, Cabeceras Seguras)
app.add_middleware(GatekeeperWAFMiddleware)

# 3. Rutas API v1
app.include_router(api_v1_router, prefix="/api/v1")
