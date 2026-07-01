from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from typing import Optional
import html
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
    Utiliza palabras clave dinámicas de la base de datos.
    """
    desc = html.escape(descripcion.lower())

    # Inicializar puntajes para todas las áreas técnicas activas
    areas = db.query(models.AreaTecnica).filter(models.AreaTecnica.activa == True).all()
    scores = {area.id: 0 for area in areas}
    
    # Obtener todas las palabras clave
    palabras_bd = db.query(models.PalabraClaveTriaje).all()
    
    # Calcular puntajes
    for p in palabras_bd:
        if p.palabra.lower() in desc and p.id_area_tecnica in scores:
            scores[p.id_area_tecnica] += 1

    # Obtener el área con mayor puntaje (si no hay puntaje, por defecto el ID menor o soporte general)
    if not scores or max(scores.values()) == 0:
        # Fallback: Soporte General o la primera área
        fallback_area = db.query(models.AreaTecnica).filter(models.AreaTecnica.nombre_area.ilike("%Soporte%")).first()
        if fallback_area:
            id_area_asignada = fallback_area.id
        else:
            id_area_asignada = min(scores.keys()) if scores else 4
    else:
        id_area_asignada = max(scores, key=lambda x: scores[x])

    # Encontrar al especialista con menos carga de trabajo DENTRO de esa área
    especialista = (
        db.query(models.Usuario)
        .filter(
            models.Usuario.rol == "Tecnico",
            models.Usuario.activo == True,
            models.Usuario.id_area_tecnica == id_area_asignada
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

def revisar_escalamientos_sla():
    """
    Busca todos los tickets 'Pendientes' creados hace más de 8 horas
    que aún no sean 'Critica' y los escala masivamente.
    Se ejecuta periódicamente vía cron.
    """
    db = database.SessionLocal()
    try:
        from datetime import timedelta
        # Límite de 8 horas atrás
        limite_sla = datetime.now(timezone.utc) - timedelta(hours=8)
        
        tickets_a_escalar = db.query(models.Ticket).filter(
            models.Ticket.estado == "Pendiente",
            models.Ticket.criticidad != "Critica",
            models.Ticket.fecha_creacion <= limite_sla
        ).all()

        for ticket in tickets_a_escalar:
            criticidad_anterior = ticket.criticidad
            ticket.criticidad = "Critica"
            ticket.fecha_actualizacion = datetime.now(timezone.utc)

            registrar_auditoria(db, None, "SLA_ESCALADO", f"Ticket #{ticket.id}",
                               f"Criticidad escalada de {criticidad_anterior} a Critica por SLA")

            registrar_historial_ticket(
                db, ticket.id, None,
                ticket.estado, ticket.estado,
                "Escalado automático por vencimiento de SLA (8 horas sin atención)"
            )
        
        if tickets_a_escalar:
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error en revisar_escalamientos_sla: {e}")
    finally:
        db.close()
