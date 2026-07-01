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

# ─── Palabras Clave Triaje ────────────────────────
@router.get("/palabras-clave/", response_model=List[models.PalabraClaveResponse])
def listar_palabras_clave(db: Session = Depends(get_db)):
    palabras = db.query(models.PalabraClaveTriaje).all()
    result = []
    for p in palabras:
        result.append({
            "id": p.id,
            "palabra": p.palabra,
            "id_area_tecnica": p.id_area_tecnica,
            "nombre_area": p.area_tecnica.nombre_area if p.area_tecnica else None
        })
    return result

@router.post("/palabras-clave/", response_model=models.PalabraClaveResponse)
def crear_palabra_clave(data: models.PalabraClaveCreate, db: Session = Depends(get_db), admin: models.Usuario = Depends(get_current_admin)):
    existente = db.query(models.PalabraClaveTriaje).filter(models.PalabraClaveTriaje.palabra == data.palabra.lower()).first()
    if existente:
        raise HTTPException(400, "Esta palabra clave ya existe")
    
    palabra = models.PalabraClaveTriaje(
        palabra=data.palabra.lower(),
        id_area_tecnica=data.id_area_tecnica
    )
    db.add(palabra)
    db.commit()
    db.refresh(palabra)
    
    return {
        "id": palabra.id,
        "palabra": palabra.palabra,
        "id_area_tecnica": palabra.id_area_tecnica,
        "nombre_area": palabra.area_tecnica.nombre_area if palabra.area_tecnica else None
    }

@router.delete("/palabras-clave/{id_palabra}")
def eliminar_palabra_clave(id_palabra: int, db: Session = Depends(get_db), admin: models.Usuario = Depends(get_current_admin)):
    palabra = db.query(models.PalabraClaveTriaje).filter(models.PalabraClaveTriaje.id == id_palabra).first()
    if not palabra:
        raise HTTPException(404, "Palabra clave no encontrada")
    db.delete(palabra)
    db.commit()
    return {"mensaje": "Palabra clave eliminada correctamente"}

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
    macro = models.Macro(**data.model_dump())
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
    articulo = models.ArticuloKB(**data.model_dump())
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

    csat = models.CalificacionCSAT(id_ticket=id_ticket, **data.model_dump())
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
from core.supabase_client import supabase as supabase_client

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

SUPABASE_BUCKET = "adjuntos"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "text/plain", "text/csv",
    "application/zip",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword", "application/vnd.ms-excel",
}

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

    # Validar tipo MIME
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, f"Tipo de archivo no permitido: {file.content_type}")

    # Leer contenido y validar tamaño
    contents = file.file.read()
    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(400, f"El archivo excede el tamaño máximo de {MAX_UPLOAD_SIZE // (1024*1024)} MB")

    filename_saved = f"{int(time.time())}_{file.filename}"
    size = len(contents)

    # ── Intentar subir a Supabase Storage ──
    if supabase_client and SUPABASE_URL:
        try:
            storage_path = f"ticket_{id_ticket}/{filename_saved}"
            supabase_client.storage.from_(SUPABASE_BUCKET).upload(
                path=storage_path,
                file=contents,
                file_options={"content-type": file.content_type or "application/octet-stream"}
            )
            # URL pública del archivo en Supabase
            ruta_archivo = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{storage_path}"
        except Exception as e:
            print(f"Error subiendo a Supabase Storage, usando fallback local: {e}")
            # Fallback: guardar localmente
            file_location = os.path.join(UPLOAD_DIR, filename_saved)
            with open(file_location, "wb+") as file_object:
                file_object.write(contents)
            ruta_archivo = f"/uploads/{filename_saved}"
    else:
        # Sin Supabase configurado: guardar localmente
        file_location = os.path.join(UPLOAD_DIR, filename_saved)
        with open(file_location, "wb+") as file_object:
            file_object.write(contents)
        ruta_archivo = f"/uploads/{filename_saved}"

    adjunto = models.Adjunto(
        id_ticket=id_ticket,
        id_comentario=id_comentario,
        id_usuario=id_usuario,
        nombre_archivo=file.filename,
        ruta_archivo=ruta_archivo,
        tipo_mime=file.content_type,
        tamano_bytes=size
    )
    db.add(adjunto)
    db.commit()
    db.refresh(adjunto)
    return adjunto
