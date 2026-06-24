from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from sqlalchemy import String
from typing import List, Optional
from datetime import datetime, timezone
import hashlib
import time

import models
from database import get_db
from services.ticket_service import (
    enriquecer_ticket, motor_de_triaje, monitor_sla_escalation, 
    registrar_auditoria, registrar_historial_ticket
)

router = APIRouter(
    prefix="/tickets",
    tags=["Tickets"],
)

idempotency_cache = {}
IDEMPOTENCY_TTL = 10  # segundos de ventana anti-duplicado
IDEMPOTENCY_MAX_SIZE = 500  # máximo de entradas en cache

def _limpiar_cache_idempotencia():
    """Elimina entradas expiradas del cache de idempotencia."""
    now = time.time()
    expiradas = [k for k, v in idempotency_cache.items() if (now - v) > IDEMPOTENCY_TTL]
    for k in expiradas:
        del idempotency_cache[k]
    # Si aún excede el tamaño máximo, eliminar las más antiguas
    if len(idempotency_cache) > IDEMPOTENCY_MAX_SIZE:
        sorted_keys = sorted(idempotency_cache, key=idempotency_cache.get)
        for k in sorted_keys[:len(idempotency_cache) - IDEMPOTENCY_MAX_SIZE]:
            del idempotency_cache[k]

@router.get("/", response_model=List[models.TicketResponse])
def listar_tickets(
    estado: Optional[str] = None,
    criticidad: Optional[str] = None,
    id_area: Optional[int] = None,
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    sort_by: Optional[str] = None,
    sort_order: str = "desc",
    db: Session = Depends(get_db)
):
    """Lista todos los tickets con filtros, búsqueda, paginación y ordenamiento."""
    query = db.query(models.Ticket)

    if estado:
        query = query.filter(models.Ticket.estado == estado)
    if criticidad:
        query = query.filter(models.Ticket.criticidad == criticidad)
    if id_area:
        query = query.filter(models.Ticket.id_area == id_area)
    if q:
        search_term = f"%{q.lower()}%"
        query = query.filter(
            (models.Ticket.titulo.ilike(search_term)) |
            (models.Ticket.descripcion.ilike(search_term)) |
            (models.Ticket.id.cast(String).like(search_term))
        )

    # Ordenamiento dinámico
    sort_column = getattr(models.Ticket, sort_by, None) if sort_by else models.Ticket.fecha_creacion
    if sort_column is None:
        sort_column = models.Ticket.fecha_creacion
    query = query.order_by(sort_column.desc() if sort_order == "desc" else sort_column.asc())

    tickets = query.offset(skip).limit(limit).all()
    return [enriquecer_ticket(t, db) for t in tickets]

@router.get("/{ticket_id}", response_model=models.TicketResponse)
def obtener_ticket(ticket_id: int, db: Session = Depends(get_db)):
    """Obtiene un ticket por su ID."""
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket #{ticket_id} no encontrado")
    return enriquecer_ticket(ticket, db)

@router.post("/triaje/", response_model=models.TicketResponse)
def crear_ticket_con_triaje(ticket_in: models.TicketCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Endpoint que recibe un ticket y utiliza el Motor de Triaje.
    """
    _limpiar_cache_idempotencia()
    payload_hash = hashlib.md5(f"{ticket_in.titulo}-{ticket_in.descripcion}".encode()).hexdigest()
    now = time.time()
    if payload_hash in idempotency_cache and (now - idempotency_cache[payload_hash]) < IDEMPOTENCY_TTL:
        raise HTTPException(status_code=409, detail="Petición duplicada (Doble Submit detectado).")
    idempotency_cache[payload_hash] = now

    try:
        id_area, id_especialista = motor_de_triaje(ticket_in.descripcion, db)

        # Determinar departamento de origen si se envía el operador creador
        id_departamento_origen = None
        if ticket_in.id_operador_creador:
            operador = db.query(models.Usuario).filter(
                models.Usuario.id == ticket_in.id_operador_creador
            ).first()
            if operador and operador.id_departamento:
                id_departamento_origen = operador.id_departamento

        nuevo_ticket = models.Ticket(
            titulo=ticket_in.titulo,
            descripcion=ticket_in.descripcion,
            criticidad=ticket_in.criticidad,
            tipo_solicitud=ticket_in.tipo_solicitud,
            id_area=id_area,
            id_especialista=id_especialista,
            id_operador_creador=ticket_in.id_operador_creador,
            id_departamento_origen=id_departamento_origen,
            estado="Pendiente"
        )

        db.add(nuevo_ticket)
        db.commit()
        db.refresh(nuevo_ticket)

        registrar_auditoria(db, ticket_in.id_operador_creador, "TICKET_CREADO", f"Ticket #{nuevo_ticket.id}",
                           f"Criticidad: {ticket_in.criticidad} — Área: {id_area}")

        registrar_historial_ticket(
            db, nuevo_ticket.id, ticket_in.id_operador_creador,
            None, "Pendiente", "Ticket creado por triaje automático"
        )

        # Disparar Engine de SLAs en Background
        background_tasks.add_task(monitor_sla_escalation, nuevo_ticket.id)

        return enriquecer_ticket(nuevo_ticket, db)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear ticket: {str(e)}")

@router.patch("/{ticket_id}", response_model=models.TicketResponse)
def actualizar_ticket(ticket_id: int, patch: models.TicketPatch, db: Session = Depends(get_db)):
    """Actualiza parcialmente un ticket (estado, resolución, asignación)."""
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket #{ticket_id} no encontrado")

    if patch.version is not None and patch.version != ticket.version:
        raise HTTPException(status_code=409, detail="El ticket ha sido modificado por otro usuario. Recarga la página.")

    try:
        estado_anterior = ticket.estado
        ticket.version += 1

        if patch.estado is not None:
            ticket.estado = patch.estado
            if patch.estado == "Resuelto" and ticket.fecha_creacion:
                ticket.fecha_resolucion = datetime.now(timezone.utc)
                fc = ticket.fecha_creacion.replace(tzinfo=timezone.utc) if ticket.fecha_creacion.tzinfo is None else ticket.fecha_creacion
                delta = ticket.fecha_resolucion - fc
                ticket.tiempo_resolucion_horas = round(delta.total_seconds() / 3600, 2)

        if patch.comentario_resolucion is not None:
            ticket.comentario_resolucion = patch.comentario_resolucion

        if patch.id_especialista is not None:
            ticket.id_especialista = patch.id_especialista

        if patch.tiempo_resolucion_horas is not None:
            ticket.tiempo_resolucion_horas = patch.tiempo_resolucion_horas

        ticket.fecha_actualizacion = datetime.now(timezone.utc)
        db.commit()
        db.refresh(ticket)

        if patch.estado and patch.estado != estado_anterior:
            registrar_auditoria(db, patch.id_especialista, "ESTADO_CAMBIADO", f"Ticket #{ticket_id}",
                               f"{estado_anterior} → {patch.estado}")

            registrar_historial_ticket(
                db, ticket_id, patch.id_especialista,
                estado_anterior, patch.estado,
                patch.comentario_resolucion
            )

        return enriquecer_ticket(ticket, db)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al actualizar ticket: {str(e)}")

@router.delete("/{ticket_id}")
def eliminar_ticket(ticket_id: int, db: Session = Depends(get_db)):
    """Elimina un ticket del sistema."""
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket #{ticket_id} no encontrado")

    try:
        titulo = ticket.titulo
        db.delete(ticket)
        db.commit()

        registrar_auditoria(db, None, "TICKET_ELIMINADO", f"Ticket #{ticket_id}", f"Título: {titulo}")
        return {"mensaje": f"Ticket #{ticket_id} eliminado correctamente"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar ticket: {str(e)}")

@router.get("/{ticket_id}/historial", response_model=List[models.HistorialTicketResponse])
def obtener_historial_ticket(ticket_id: int, db: Session = Depends(get_db)):
    """Retorna la línea de tiempo (timeline) de cambios de estado de un ticket."""
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket #{ticket_id} no encontrado")

    historial = (
        db.query(models.HistorialTicket)
        .filter(models.HistorialTicket.id_ticket == ticket_id)
        .order_by(models.HistorialTicket.fecha.asc())
        .all()
    )

    result = []
    for h in historial:
        result.append({
            "id": h.id,
            "id_ticket": h.id_ticket,
            "id_usuario": h.id_usuario,
            "nombre_usuario": h.usuario.nombre if h.usuario else None,
            "estado_anterior": h.estado_anterior,
            "estado_nuevo": h.estado_nuevo,
            "comentario": h.comentario,
            "fecha": h.fecha,
        })
    return result

@router.get("/{ticket_id}/comentarios", response_model=List[models.ComentarioResponse])
def listar_comentarios(ticket_id: int, db: Session = Depends(get_db)):
    """Lista todos los comentarios de un ticket ordenados cronológicamente."""
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket #{ticket_id} no encontrado")

    comentarios = (
        db.query(models.ComentarioTicket)
        .filter(models.ComentarioTicket.id_ticket == ticket_id)
        .order_by(models.ComentarioTicket.fecha.asc())
        .all()
    )

    return [{
        "id": c.id,
        "id_ticket": c.id_ticket,
        "id_usuario": c.id_usuario,
        "nombre_usuario": c.usuario.nombre if c.usuario else None,
        "contenido": c.contenido,
        "es_nota_interna": c.es_nota_interna,
        "fecha": c.fecha,
    } for c in comentarios]

@router.get("/{ticket_id}/adjuntos", response_model=List[models.AdjuntoResponse])
def listar_adjuntos(ticket_id: int, db: Session = Depends(get_db)):
    return db.query(models.Adjunto).filter(models.Adjunto.id_ticket == ticket_id).all()

@router.post("/{ticket_id}/comentarios", response_model=models.ComentarioResponse)
def crear_comentario(ticket_id: int, data: models.ComentarioCreate, db: Session = Depends(get_db)):
    """Agrega un comentario a un ticket."""
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket #{ticket_id} no encontrado")

    try:
        comentario = models.ComentarioTicket(
            id_ticket=ticket_id,
            id_usuario=data.id_usuario,
            contenido=data.contenido,
            es_nota_interna=data.es_nota_interna,
        )
        db.add(comentario)

        ticket.fecha_actualizacion = datetime.now(timezone.utc)
        db.commit()
        db.refresh(comentario)

        registrar_auditoria(
            db, data.id_usuario, "COMENTARIO_AGREGADO", f"Ticket #{ticket_id}",
            f"{'Nota interna' if data.es_nota_interna else 'Comentario público'}"
        )

        return {
            "id": comentario.id,
            "id_ticket": comentario.id_ticket,
            "id_usuario": comentario.id_usuario,
            "nombre_usuario": comentario.usuario.nombre if comentario.usuario else None,
            "contenido": comentario.contenido,
            "es_nota_interna": comentario.es_nota_interna,
            "fecha": comentario.fecha,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear comentario: {str(e)}")

@router.get("/pendientes/criticos", response_model=List[models.TicketResponse])
def obtener_tickets_criticos_pendientes(db: Session = Depends(get_db)):
    """Endpoint que extrae tickets y usa Prog. Funcional."""
    todos_los_tickets = db.query(models.Ticket).all()
    def es_critico_pendiente(t):
        return t.estado == "Pendiente" and t.criticidad in ["Alta", "Critica"]
        
    tickets_filtrados = list(filter(es_critico_pendiente, todos_los_tickets))

    resultados = []
    for t in tickets_filtrados:
        data = enriquecer_ticket(t, db)
        data["titulo"] = f"[URGENTE] {data['titulo'].upper()}"
        resultados.append(data)
    return resultados
