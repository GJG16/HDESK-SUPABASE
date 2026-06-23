from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
import time

import models
from database import get_db
from core.security import get_current_admin

router = APIRouter(tags=["Configuración y Otros"])

# ─── Áreas y Departamentos ────────────────────────
@router.get("/areas/", response_model=List[models.AreaResponse])
def listar_areas(db: Session = Depends(get_db)):
    return db.query(models.AreaTecnica).all()

@router.get("/departamentos/", response_model=List[models.DepartamentoResponse])
def listar_departamentos(db: Session = Depends(get_db)):
    return db.query(models.DepartamentoNegocio).filter(models.DepartamentoNegocio.activo == True).all()

# ─── Auditoría ────────────────────────
@router.get("/auditoria/", response_model=List[models.AuditoriaResponse])
def listar_auditoria(limit: int = 50, db: Session = Depends(get_db)):
    logs = db.query(models.Auditoria).order_by(models.Auditoria.fecha.desc()).limit(limit).all()
    result = []
    for log in logs:
        data = {
            "id": log.id,
            "id_usuario": log.id_usuario,
            "accion": log.accion,
            "entidad": log.entidad,
            "detalle": log.detalle,
            "fecha": log.fecha,
            "nombre_usuario": log.usuario.nombre if log.usuario else None,
        }
        result.append(data)
    return result

# ─── Macros ─────────────────────────────────
@router.get("/macros/", response_model=List[models.MacroResponse])
def listar_macros(id_area: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.Macro).filter(models.Macro.activo == True)
    if id_area:
        query = query.filter((models.Macro.id_area_tecnica == id_area) | (models.Macro.id_area_tecnica == None))
    return query.all()

@router.post("/macros/", response_model=models.MacroResponse)
def crear_macro(data: models.MacroCreate, db: Session = Depends(get_db), admin: models.Usuario = Depends(get_current_admin)):
    macro = models.Macro(**data.dict())
    db.add(macro)
    db.commit()
    db.refresh(macro)
    return macro

# ─── Base de Conocimientos (KB) ─────────────
@router.get("/kb/", response_model=List[models.ArticuloKBResponse])
def listar_kb(q: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.ArticuloKB)
    if q:
        search = f"%{q.lower()}%"
        query = query.filter(models.ArticuloKB.titulo.ilike(search) | models.ArticuloKB.contenido.ilike(search))
    return query.all()

@router.post("/kb/", response_model=models.ArticuloKBResponse)
def crear_articulo_kb(data: models.ArticuloKBCreate, db: Session = Depends(get_db), admin: models.Usuario = Depends(get_current_admin)):
    articulo = models.ArticuloKB(**data.dict())
    db.add(articulo)
    db.commit()
    db.refresh(articulo)
    return articulo

# ─── CSAT (Satisfacción del Cliente) ────────
@router.post("/csat/", response_model=models.CSATResponse)
def crear_csat(id_ticket: int, data: models.CSATCreate, db: Session = Depends(get_db)):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == id_ticket).first()
    if not ticket or ticket.estado != "Resuelto":
        raise HTTPException(400, "Solo se pueden calificar tickets resueltos")
    
    existente = db.query(models.CalificacionCSAT).filter(models.CalificacionCSAT.id_ticket == id_ticket).first()
    if existente:
        raise HTTPException(400, "El ticket ya ha sido calificado")

    csat = models.CalificacionCSAT(id_ticket=id_ticket, **data.dict())
    db.add(csat)
    db.commit()
    db.refresh(csat)
    return csat

@router.get("/csat/{id_ticket}", response_model=models.CSATResponse)
def obtener_csat(id_ticket: int, db: Session = Depends(get_db)):
    csat = db.query(models.CalificacionCSAT).filter(models.CalificacionCSAT.id_ticket == id_ticket).first()
    if not csat:
        raise HTTPException(404, "Calificación no encontrada")
    return csat

# ─── Adjuntos (Uploads) ─────────────────────
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/upload/", response_model=models.AdjuntoResponse)
def subir_adjunto(
    id_ticket: int, 
    file: UploadFile = File(...), 
    id_comentario: Optional[int] = None, 
    id_usuario: Optional[int] = None, 
    db: Session = Depends(get_db)
):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == id_ticket).first()
    if not ticket:
        raise HTTPException(404, "Ticket no encontrado")
        
    file_location = os.path.join(UPLOAD_DIR, f"{int(time.time())}_{file.filename}")
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)

    size = os.path.getsize(file_location)

    adjunto = models.Adjunto(
        id_ticket=id_ticket,
        id_comentario=id_comentario,
        id_usuario=id_usuario,
        nombre_archivo=file.filename,
        ruta_archivo=file_location,
        tipo_mime=file.content_type,
        tamano_bytes=size
    )
    db.add(adjunto)
    db.commit()
    db.refresh(adjunto)
    return adjunto
