from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.config.settings import settings
from backend.database import connect_db, close_db, get_database
from backend.routes import status_router
from backend.routes.auth import router as auth_router
from backend.routes.usuarios import router as usuarios_router
from backend.routes.tickets import router as tickets_router
from backend.routes.reports import router as reports_router

# Lifecycle events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_db()
    print("[START] Aplicacion iniciada")
    yield
    # Shutdown
    await close_db()
    print("[STOP] Aplicacion detenida")

# Crear aplicación FastAPI
app = FastAPI(
    title=settings.app_name,
    description=settings.app_description,
    version=settings.app_version,
    lifespan=lifespan
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_credentials,
    allow_methods=settings.cors_methods,
    allow_headers=settings.cors_headers,
)

# Registrar rutas
app.include_router(status_router)
app.include_router(auth_router)
app.include_router(usuarios_router)
app.include_router(tickets_router)
app.include_router(reports_router)

# Ruta raíz
@app.get("/")
async def root():
    return {
        "message": "Bienvenido a Helpdesk API",
        "docs": "/docs",
        "version": settings.app_version
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
           "backend.main:app",
        host=settings.server_host,
        port=settings.server_port,
        reload=settings.debug
    )
