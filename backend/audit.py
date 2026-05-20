from datetime import datetime


async def log_deletion(db, *, action: str, resource_type: str, resource_id: str, actor_admin_id: str) -> None:
	"""Registrar una eliminación sensible en la colección audit_logs."""
	await db.audit_logs.insert_one(
		{
			"action": action,
			"resource_type": resource_type,
			"resource_id": resource_id,
			"actor_admin_id": actor_admin_id,
			"created_at": datetime.utcnow(),
		}
	)
