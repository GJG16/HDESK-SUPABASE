from datetime import datetime
from typing import List, Optional

from bson.objectid import ObjectId
from fastapi import APIRouter, Depends, Header, HTTPException, status

from backend.database import get_database
from backend.models.schemas import (
    Ticket,
    TicketCreate,
    TicketComment,
    TicketCommentCreate,
    TicketFilter,
    TicketStatus,
    TicketUpdate,
    Priority,
)
from backend.audit import log_deletion
from backend.security import decode_token
from jose import jwt as jose_jwt
import time

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


def _extract_token(authorization: Optional[str], token: Optional[str]) -> Optional[str]:
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ", 1)[1]
    return token


def _serialize_ticket(ticket_doc: dict) -> dict:
    ticket_doc["id"] = str(ticket_doc.pop("_id"))
    return ticket_doc


def _is_admin(user: dict) -> bool:
    return user.get("rol") == "admin"


def _is_agent(user: dict) -> bool:
    return user.get("rol") == "agent"


def _ticket_scope_query(current_user: dict) -> dict:
    if _is_admin(current_user) or _is_agent(current_user):
        return {}
    return {"usuario_id": current_user.get("id")}


def _is_ticket_owner(ticket: dict, current_user: dict) -> bool:
    return ticket.get("usuario_id") == current_user.get("id")


async def get_current_user(
    authorization: Optional[str] = Header(default=None),
    token: Optional[str] = None,
    db=Depends(get_database),
):
    """Obtener usuario actual del token"""
    raw_token = _extract_token(authorization, token)
    if not raw_token:
        print(f"[AUTH LOG {time.time()}] No raw_token provided. authorization header: {authorization}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autorizado",
        )
    # Logs para diagnosticar cabeceras y claims del token (temporal)
    try:
        print(f"[AUTH LOG {time.time()}] Authorization header: {authorization}")
        try:
            unverified = jose_jwt.get_unverified_claims(raw_token)
            masked = {k: unverified.get(k) for k in ("user_id", "email", "rol", "exp")}
            print(f"[AUTH LOG {time.time()}] Unverified claims: {masked}")
        except Exception as e:
            print(f"[AUTH LOG {time.time()}] get_unverified_claims error: {e}")
    except Exception:
        pass

    token_data = decode_token(raw_token, expected_type="access")
    print(f"[AUTH LOG {time.time()}] decode_token result: {token_data}")
    if not token_data:
        print(f"[AUTH LOG {time.time()}] decode_token returned None for token: (len={len(raw_token) if raw_token else 0})")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )

    user = await db.usuarios.find_one({"_id": ObjectId(token_data.user_id)})
    if not user:
        print(f"[AUTH LOG {time.time()}] No user found for id: {token_data.user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    user["id"] = str(user.pop("_id"))
    user.pop("password_hash", None)
    print(f"[AUTH LOG {time.time()}] Auth successful for user id: {user.get('id')} rol: {user.get('rol')}")
    return user


@router.get("/", response_model=List[Ticket])
async def get_tickets(db=Depends(get_database), current_user=Depends(get_current_user)):
    """Obtener todos los tickets"""
    tickets = await db.tickets.find(_ticket_scope_query(current_user)).sort("fecha_creacion", -1).to_list(None)
    return [_serialize_ticket(ticket) for ticket in tickets]


@router.get("/{ticket_id}", response_model=Ticket)
async def get_ticket(ticket_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    """Obtener ticket por ID"""
    try:
        ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket no encontrado",
            )

        if not (_is_admin(current_user) or _is_agent(current_user) or _is_ticket_owner(ticket, current_user)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para ver este ticket",
            )

        return _serialize_ticket(ticket)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de ticket inválido",
        )


@router.post("/", response_model=Ticket)
async def create_ticket(ticket_data: TicketCreate, db=Depends(get_database), current_user=Depends(get_current_user)):
    """Crear nuevo ticket"""
    # Los administradores no deben crear tickets desde la UI
    if _is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los administradores no pueden crear tickets",
        )

    ticket_dict = ticket_data.model_dump()
    # El ticket siempre se asocia al usuario que lo crea
    ticket_dict["usuario_id"] = current_user.get("id")

    # Forzar prioridad media para usuarios finales independientemente de lo que envíen
    if current_user.get("rol") == "user":
        ticket_dict["prioridad"] = Priority.MEDIA.value

    ticket_dict["fecha_creacion"] = datetime.utcnow()
    ticket_dict["fecha_actualizacion"] = datetime.utcnow()

    result = await db.tickets.insert_one(ticket_dict)

    created_ticket = await db.tickets.find_one({"_id": result.inserted_id})
    created_ticket = _serialize_ticket(created_ticket)

    return created_ticket



@router.get("/{ticket_id}/comments", response_model=List[TicketComment])
async def get_ticket_comments(ticket_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    """Obtener comentarios de un ticket"""
    try:
        ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")
        
        if not (_is_admin(current_user) or _is_agent(current_user) or _is_ticket_owner(ticket, current_user)):
            raise HTTPException(status_code=403, detail="No tienes permiso para ver estos comentarios")

        comments = await db.comments.find({"ticket_id": ticket_id}).sort("fecha_creacion", 1).to_list(None)
        
        # Serialize _id to id
        for c in comments:
            c["id"] = str(c.pop("_id"))
            
        return comments
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{ticket_id}/comments", response_model=TicketComment)
async def create_ticket_comment(ticket_id: str, comment_data: TicketCommentCreate, db=Depends(get_database), current_user=Depends(get_current_user)):
    """Crear un comentario en un ticket"""
    try:
        ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")
        
        if not (_is_admin(current_user) or _is_agent(current_user) or _is_ticket_owner(ticket, current_user)):
            raise HTTPException(status_code=403, detail="No tienes permiso para comentar en este ticket")

        comment_dict = comment_data.model_dump()
        comment_dict["ticket_id"] = ticket_id
        comment_dict["usuario_id"] = current_user.get("id")
        comment_dict["nombre_autor"] = current_user.get("nombre")
        comment_dict["rol_autor"] = current_user.get("rol")
        comment_dict["fecha_creacion"] = datetime.utcnow()

        result = await db.comments.insert_one(comment_dict)
        
        # Actualizar fecha del ticket
        await db.tickets.update_one({"_id": ObjectId(ticket_id)}, {"$set": {"fecha_actualizacion": datetime.utcnow()}})

        created_comment = await db.comments.find_one({"_id": result.inserted_id})
        created_comment["id"] = str(created_comment.pop("_id"))
        return created_comment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{ticket_id}", response_model=Ticket)
async def update_ticket(ticket_id: str, ticket_update: TicketUpdate, db=Depends(get_database), current_user=Depends(get_current_user)):
    """Actualizar ticket"""
    try:
        existing_ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
        if not existing_ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket no encontrado",
            )

        update_data = {k: v for k, v in ticket_update.model_dump().items() if v is not None}

        if _is_admin(current_user):
            pass
        elif _is_agent(current_user):
            allowed_fields = {"estado", "prioridad", "asignado_a"}
            if any(field not in allowed_fields for field in update_data.keys()):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="El agente solo puede actualizar estado, prioridad o asignación propia",
                )

            if "asignado_a" in update_data and update_data["asignado_a"] != current_user.get("id"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="El agente solo puede asignarse a sí mismo",
                )

            already_assigned_to_agent = existing_ticket.get("asignado_a") == current_user.get("id")
            self_assigning_now = update_data.get("asignado_a") == current_user.get("id")

            if not already_assigned_to_agent and not self_assigning_now:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="El agente debe asignarse el ticket antes de modificarlo",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo administradores o agentes pueden actualizar tickets",
            )

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No hay datos para actualizar",
            )

        update_data["fecha_actualizacion"] = datetime.utcnow()

        if ticket_update.estado in (TicketStatus.RESUELTO, TicketStatus.CERRADO):
            if ticket_update.estado == TicketStatus.RESUELTO and _is_agent(current_user):
                comentarios = await db.comments.find({"ticket_id": ticket_id, "usuario_id": current_user.get("id")}).to_list(None)
                if not comentarios:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Debes añadir un comentario o nota de resolución antes de marcar el ticket como resuelto."
                    )
            update_data["fecha_resolucion"] = datetime.utcnow()

        await db.tickets.update_one({"_id": ObjectId(ticket_id)}, {"$set": update_data})

        updated_ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
        updated_ticket = _serialize_ticket(updated_ticket)

        return updated_ticket
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ticket(ticket_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    """Eliminar ticket"""
    try:
        ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket no encontrado",
            )

        if not _is_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo administradores pueden eliminar tickets",
            )

        await log_deletion(
            db,
            action="delete_ticket",
            resource_type="ticket",
            resource_id=ticket_id,
            actor_admin_id=current_user.get("id"),
        )

        result = await db.tickets.delete_one({"_id": ObjectId(ticket_id)})

        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket no encontrado",
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/filter", response_model=List[Ticket])
async def filter_tickets(filter_data: TicketFilter, db=Depends(get_database), current_user=Depends(get_current_user)):
    """Filtrar tickets"""
    query = _ticket_scope_query(current_user)

    if filter_data.estado:
        query["estado"] = filter_data.estado
    if filter_data.usuario_id and _is_admin(current_user):
        query["usuario_id"] = filter_data.usuario_id
    if filter_data.asignado_a and (_is_admin(current_user) or _is_agent(current_user)):
        query["asignado_a"] = filter_data.asignado_a
    if filter_data.prioridad:
        query["prioridad"] = filter_data.prioridad

    if filter_data.fecha_desde or filter_data.fecha_hasta:
        query["fecha_creacion"] = {}
        if filter_data.fecha_desde:
            query["fecha_creacion"]["$gte"] = filter_data.fecha_desde
        if filter_data.fecha_hasta:
            query["fecha_creacion"]["$lte"] = filter_data.fecha_hasta

    tickets = await db.tickets.find(query).to_list(None)
    return [_serialize_ticket(ticket) for ticket in tickets]
