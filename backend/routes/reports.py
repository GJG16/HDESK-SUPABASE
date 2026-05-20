from bson.objectid import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from database import get_database
from models.schemas import TicketReport
from routes.usuarios import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/tickets", response_model=TicketReport)
async def get_ticket_reports(db=Depends(get_database), current_user=Depends(get_current_user)):
    """Resumen administrativo de tickets por estado y por agente."""
    if current_user.get("rol") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden ver reportes",
        )

    total_tickets = await db.tickets.count_documents({})

    by_state_cursor = db.tickets.aggregate(
        [
            {"$group": {"_id": "$estado", "total": {"$sum": 1}}},
            {"$sort": {"total": -1}},
        ]
    )
    by_agent_cursor = db.tickets.aggregate(
        [
            {"$match": {"asignado_a": {"$ne": None}}},
            {"$group": {"_id": "$asignado_a", "total": {"$sum": 1}}},
            {"$sort": {"total": -1}},
        ]
    )

    by_state = [
        {"estado": item["_id"], "total": item["total"]}
        for item in await by_state_cursor.to_list(length=None)
    ]
    raw_by_agent = await by_agent_cursor.to_list(length=None)
    agent_ids = [item["_id"] for item in raw_by_agent]
    agents = await db.usuarios.find(
        {"_id": {"$in": [ObjectId(agent_id) for agent_id in agent_ids if ObjectId.is_valid(agent_id)]}}
    ).to_list(length=None)
    agent_names = {str(agent["_id"]): agent.get("nombre", str(agent["_id"])) for agent in agents}

    by_agent = [
        {"asignado_a": agent_names.get(item["_id"], item["_id"]), "total": item["total"]}
        for item in raw_by_agent
    ]

    return {
        "total_tickets": total_tickets,
        "by_state": by_state,
        "by_agent": by_agent,
    }
