from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from typing import Optional
import html
import asyncio
from datetime import datetime, timezone

import models
import database

def enriquecer_ticket(ticket: models.Ticket, db: Session) -> dict:
    """Convierte un objeto Ticket SQLAlchemy a dict enriquecido con nombres de relaciones."""
    data = {
        "id": ticket.id,
        "titulo": ticket.titulo,
        "descripcion": ticket.descripcion,
        "estado": ticket.estado,
        "criticidad": ticket.criticidad,
        "tipo_solicitud": ticket.tipo_solicitud,
        "id_area": ticket.id_area,
        "id_operador_creador": ticket.id_operador_creador,
        "id_especialista": ticket.id_especialista,
        "id_departamento_origen": ticket.id_departamento_origen,
        "comentario_resolucion": ticket.comentario_resolucion,
        "fecha_creacion": ticket.fecha_creacion,
        "fecha_actualizacion": ticket.fecha_actualizacion,
        "fecha_resolucion": ticket.fecha_resolucion,
        "tiempo_resolucion_horas": float(ticket.tiempo_resolucion_horas) if ticket.tiempo_resolucion_horas is not None else None,
        "nombre_area": ticket.area.nombre_area if ticket.area else None,
        "nombre_operador": ticket.operador.nombre if ticket.operador else None,
        "nombre_especialista": ticket.especialista.nombre if ticket.especialista else None,
        "nombre_departamento_origen": ticket.departamento_origen.nombre if ticket.departamento_origen else None,
        "version": ticket.version,
    }
    return data

def registrar_auditoria(db: Session, id_usuario: Optional[int], accion: str, entidad: str, detalle: Optional[str] = None):
    """Registra una acción en la tabla de auditoría."""
    log = models.Auditoria(
        id_usuario=id_usuario,
        accion=accion,
        entidad=entidad,
        detalle=detalle
    )
    db.add(log)
    db.commit()

def registrar_historial_ticket(db: Session, id_ticket: int, id_usuario: Optional[int],
                                estado_anterior: Optional[str], estado_nuevo: str, comentario: Optional[str] = None):
    """Registra un cambio de estado en el historial del ticket."""
    historial = models.HistorialTicket(
        id_ticket=id_ticket,
        id_usuario=id_usuario,
        estado_anterior=estado_anterior,
        estado_nuevo=estado_nuevo,
        comentario=comentario
    )
    db.add(historial)
    db.commit()

def motor_de_triaje(descripcion: str, db: Session) -> tuple[int, Optional[int]]:
    """
    Evalúa reglas condicionales deductivas para determinar el área y el especialista.
    """
    desc = html.escape(descripcion.lower())

    scores = {1: 0, 2: 0, 3: 0, 5: 0}

    palabras_redes = ["router", "ip", "internet", "wifi", "vpn", "red"]
    palabras_hw = ["pantalla", "teclado", "mouse", "impresora", "hardware", "pc"]
    palabras_sw = ["windows", "office", "error de sistema", "software", "aplicación"]
    palabras_seguridad = ["seguridad", "parche", "firewall", "certificado"]

    for word in palabras_redes:
        if word in desc: scores[1] += 1
    for word in palabras_hw:
        if word in desc: scores[2] += 1
    for word in palabras_sw:
        if word in desc: scores[3] += 1
    for word in palabras_seguridad:
        if word in desc: scores[5] += 1

    id_area_asignada = max(scores, key=lambda x: scores[x])
    if scores[id_area_asignada] == 0:
        id_area_asignada = 4  # Soporte General

    especialista = (
        db.query(models.Usuario)
        .filter(
            models.Usuario.rol == "Tecnico",
            models.Usuario.activo == True,
        )
        .outerjoin(
            models.Ticket,
            (models.Ticket.id_especialista == models.Usuario.id) &
            (models.Ticket.estado.in_(["Pendiente", "En Proceso"]))
        )
        .group_by(models.Usuario.id)
        .order_by(sql_func.count(models.Ticket.id))
        .first()
    )

    id_especialista = especialista.id if especialista else None

    return id_area_asignada, id_especialista

async def monitor_sla_escalation(ticket_id: int):
    """
    Simula un Engine de SLAs en Background.
    Espera 8 horas y escala el ticket a Crítica si sigue sin atención.
    """
    try:
        await asyncio.sleep(8 * 3600)
    except asyncio.CancelledError:
        return

    db = database.SessionLocal()
    try:
        ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
        if ticket and ticket.estado == "Pendiente":
            criticidad_anterior = ticket.criticidad

            ticket.criticidad = "Critica"
            ticket.fecha_actualizacion = datetime.now(timezone.utc)
            db.commit()

            registrar_auditoria(db, None, "SLA_ESCALADO", f"Ticket #{ticket_id}",
                               f"Criticidad escalada de {criticidad_anterior} a Critica por SLA")

            registrar_historial_ticket(
                db, ticket_id, None,
                ticket.estado, ticket.estado,
                "Escalado automático por vencimiento de SLA (8 horas sin atención)"
            )
    except Exception:
        db.rollback()
    finally:
        db.close()
