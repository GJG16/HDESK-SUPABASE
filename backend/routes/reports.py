from bson.objectid import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from database import get_database
from models.schemas import AuditAction, AuditLog, TicketReport
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


@router.get("/audit", response_model=list[AuditLog])
async def get_audit_logs(
    limit: int = Query(default=10, ge=1, le=50),
    db=Depends(get_database),
    current_user=Depends(get_current_user),
):
    """Devuelve el feed reciente de auditoría para administradores."""
    if current_user.get("rol") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden ver auditoría",
        )

    raw_logs = await db.audit_logs.find().sort("created_at", -1).limit(limit).to_list(length=limit)
    actor_ids = [log.get("actor_admin_id") for log in raw_logs if log.get("actor_admin_id")]
    resource_ids = [log.get("resource_id") for log in raw_logs if log.get("resource_id")]

    users = await db.usuarios.find({"_id": {"$in": [ObjectId(user_id) for user_id in actor_ids if ObjectId.is_valid(user_id)]}}).to_list(length=None)
    user_names = {str(user["_id"]): user.get("nombre", str(user["_id"])) for user in users}

    tickets = await db.tickets.find({"_id": {"$in": [ObjectId(ticket_id) for ticket_id in resource_ids if ObjectId.is_valid(ticket_id)]}}).to_list(length=None)
    ticket_titles = {str(ticket["_id"]): ticket.get("titulo", str(ticket["_id"])) for ticket in tickets}

    return [
        {
            "id": str(log["_id"]),
            "action": AuditAction(log["action"]),
            "resource_type": log.get("resource_type", ""),
            "resource_id": log.get("resource_id", ""),
            "actor_admin_id": log.get("actor_admin_id", ""),
            "actor_admin_nombre": user_names.get(log.get("actor_admin_id", "")),
            "resource_label": ticket_titles.get(log.get("resource_id", ""), log.get("resource_id", "")),
            "created_at": log.get("created_at"),
        }
        for log in raw_logs
    ]
