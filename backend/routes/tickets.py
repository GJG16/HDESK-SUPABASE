from fastapi import APIRouter, Depends, HTTPException, status
from models.schemas import Ticket, TicketCreate, TicketUpdate, TicketFilter
from database import get_database
from security import decode_token
from typing import List
from bson.objectid import ObjectId
from datetime import datetime

router = APIRouter(prefix="/api/tickets", tags=["tickets"])

async def get_current_user(token: str = None, db=Depends(get_database)):
    """Obtener usuario actual del token"""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autorizado"
        )
    
    token_data = decode_token(token)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado"
        )
    
    user = await db.usuarios.find_one({"_id": ObjectId(token_data.user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    user["id"] = str(user.pop("_id"))
    user.pop("password_hash", None)
    return user

@router.get("/", response_model=List[Ticket])
async def get_tickets(db=Depends(get_database), current_user=Depends(get_current_user)):
    """Obtener todos los tickets"""
    tickets = await db.tickets.find().to_list(None)
    
    result = []
    for ticket in tickets:
        ticket["id"] = str(ticket.pop("_id"))
        result.append(ticket)
    
    return result

@router.get("/{ticket_id}", response_model=Ticket)
async def get_ticket(ticket_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    """Obtener ticket por ID"""
    try:
        ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket no encontrado"
            )
        
        ticket["id"] = str(ticket.pop("_id"))
        return ticket
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de ticket inválido"
        )

@router.post("/", response_model=Ticket)
async def create_ticket(ticket_data: TicketCreate, db=Depends(get_database), current_user=Depends(get_current_user)):
    """Crear nuevo ticket"""
    ticket_dict = ticket_data.dict()
    ticket_dict["fecha_creacion"] = datetime.utcnow()
    ticket_dict["fecha_actualizacion"] = datetime.utcnow()
    
    result = await db.tickets.insert_one(ticket_dict)
    
    created_ticket = await db.tickets.find_one({"_id": result.inserted_id})
    created_ticket["id"] = str(created_ticket.pop("_id"))
    
    return created_ticket

@router.put("/{ticket_id}", response_model=Ticket)
async def update_ticket(ticket_id: str, ticket_update: TicketUpdate, db=Depends(get_database), current_user=Depends(get_current_user)):
    """Actualizar ticket"""
    try:
        update_data = {k: v for k, v in ticket_update.dict().items() if v is not None}
        update_data["fecha_actualizacion"] = datetime.utcnow()
        
        # Si se cierra, agregar fecha de resolución
        if ticket_update.estado == "resuelto" or ticket_update.estado == "cerrado":
            update_data["fecha_resolucion"] = datetime.utcnow()
        
        result = await db.tickets.update_one(
            {"_id": ObjectId(ticket_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket no encontrado"
            )
        
        updated_ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
        updated_ticket["id"] = str(updated_ticket.pop("_id"))
        
        return updated_ticket
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ticket(ticket_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    """Eliminar ticket"""
    try:
        # Solo admin o quien creó el ticket puede eliminarlo
        ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket no encontrado"
            )
        
        if current_user.get("rol") != "admin" and ticket.get("usuario_id") != current_user.get("id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para eliminar este ticket"
            )
        
        result = await db.tickets.delete_one({"_id": ObjectId(ticket_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket no encontrado"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/filter", response_model=List[Ticket])
async def filter_tickets(filter_data: TicketFilter, db=Depends(get_database), current_user=Depends(get_current_user)):
    """Filtrar tickets"""
    query = {}
    
    if filter_data.estado:
        query["estado"] = filter_data.estado
    if filter_data.usuario_id:
        query["usuario_id"] = filter_data.usuario_id
    if filter_data.asignado_a:
        query["asignado_a"] = filter_data.asignado_a
    if filter_data.prioridad:
        query["prioridad"] = filter_data.prioridad
    
    # Filtro de fechas
    if filter_data.fecha_desde or filter_data.fecha_hasta:
        query["fecha_creacion"] = {}
        if filter_data.fecha_desde:
            query["fecha_creacion"]["$gte"] = filter_data.fecha_desde
        if filter_data.fecha_hasta:
            query["fecha_creacion"]["$lte"] = filter_data.fecha_hasta
    
    tickets = await db.tickets.find(query).to_list(None)
    
    result = []
    for ticket in tickets:
        ticket["id"] = str(ticket.pop("_id"))
        result.append(ticket)
    
    return result
