import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import models
import database

# Inicializar Base de Datos (en producción usar Alembic)
models.Base.metadata.create_all(bind=database.engine)

from apscheduler.schedulers.background import BackgroundScheduler
from services.ticket_service import revisar_escalamientos_sla

scheduler = BackgroundScheduler()

app = FastAPI(title="Helpdesk Multiparadigma (Clean Architecture)", version="2.1.0")

@app.on_event("startup")
def start_scheduler():
    scheduler.add_job(revisar_escalamientos_sla, 'interval', minutes=15, id='sla_monitor')
    scheduler.start()
    print("SLA Monitor Scheduler started.")

@app.on_event("shutdown")
def stop_scheduler():
    scheduler.shutdown()
    print("SLA Monitor Scheduler stopped.")

# CORS Middleware — Orígenes configurables desde variable de entorno
cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:4200")
cors_origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir archivos adjuntos subidos
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Importar y registrar routers
from routers import auth, tickets, usuarios, reportes, configuracion, ws

app.include_router(auth.router)
app.include_router(tickets.router)
app.include_router(usuarios.router)
app.include_router(usuarios.admin_router)
app.include_router(reportes.router)
app.include_router(configuracion.router)
app.include_router(ws.router)

@app.get("/")
def raiz():
    return {
        "mensaje": "API de Helpdesk Multiparadigma (Clean Architecture)",
        "version": "2.1.0",
        "mejoras": "Refactorizado a Clean Architecture (Routers, Services, Core)"
    }
