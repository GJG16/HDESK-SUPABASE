from fastapi import APIRouter, HTTPException
from datetime import datetime

router = APIRouter(prefix="/api", tags=["status"])

@router.get("/status")
async def get_status():
    """Endpoint de prueba para verificar que el servidor está funcionando"""
    return {
        "status": "online",
        "service": "Helpdesk API",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "message": "Sistema de Gestión de Tickets operativo"
    }

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Helpdesk API"
    }
