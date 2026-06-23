from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
import database

# Inicializar Base de Datos (en producción usar Alembic)
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Helpdesk Multiparadigma (Clean Architecture)", version="2.1.0")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Importar y registrar routers
from routers import auth, tickets, usuarios, reportes, configuracion

app.include_router(auth.router)
app.include_router(tickets.router)
app.include_router(usuarios.router)
app.include_router(usuarios.admin_router)
app.include_router(reportes.router)
app.include_router(configuracion.router)

@app.get("/")
def raiz():
    return {
        "mensaje": "API de Helpdesk Multiparadigma (Clean Architecture)",
        "version": "2.1.0",
        "mejoras": "Refactorizado a Clean Architecture (Routers, Services, Core)"
    }
