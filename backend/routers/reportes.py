from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

import models
from database import get_db
from core.security import get_current_user, get_current_admin
from services.analytics_service import (
    generar_mapa_calor_departamentos, generar_forecasting_picos, 
    generar_reporte_rendimiento, generar_reporte_dashboard
)

router = APIRouter(
    prefix="/reportes",
    tags=["Reportes y Analytics"],
)

@router.get("/mapa-calor-departamentos")
def mapa_calor_departamentos(db: Session = Depends(get_db), usuario: models.Usuario = Depends(get_current_user)):
    """Endpoint protegido para el TÉCNICO (y ADMIN). Usa Pandas groupby()."""
    if usuario.rol not in ("Tecnico", "Administrador"):
        raise HTTPException(status_code=403, detail="Solo técnicos y administradores pueden ver este reporte")
    return generar_mapa_calor_departamentos(db)

@router.get("/forecasting-picos")
def forecasting_horas_pico(db: Session = Depends(get_db)):
    """Determina los días y horas de mayor saturación histórica usando Pandas."""
    return generar_forecasting_picos(db)

@router.get("/rendimiento")
def reporte_rendimiento_areas(db: Session = Depends(get_db), admin: models.Usuario = Depends(get_current_admin)):
    """Endpoint que usa Pandas y Numpy para calcular métricas avanzadas."""
    return generar_reporte_rendimiento(db)

@router.get("/dashboard")
def reporte_dashboard(db: Session = Depends(get_db)):
    """Métricas generales del dashboard con Pandas."""
    return generar_reporte_dashboard(db)

@router.get("/metricas-operador/{operador_id}")
def metricas_operador(operador_id: int, db: Session = Depends(get_db)):
    """
    Lista el desempeño de un operador usando SQLAlchemy y Prog. Funcional.
    """
    tickets = db.query(models.Ticket).filter(models.Ticket.id_operador_creador == operador_id).all()
    if not tickets:
        return {"total_tickets_creados": 0, "resueltos": 0, "pendientes": 0}

    resueltos = list(filter(lambda t: t.estado == "Resuelto", tickets))
    pendientes = list(filter(lambda t: t.estado == "Pendiente", tickets))

    return {
        "total_tickets_creados": len(tickets),
        "resueltos": len(resueltos),
        "pendientes": len(pendientes),
    }
