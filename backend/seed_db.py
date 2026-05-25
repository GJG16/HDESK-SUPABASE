import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

async def seed():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["helpdesk_db"]

    print("Eliminando datos anteriores...")
    await db.usuarios.delete_many({})
    await db.tickets.delete_many({})
    await db.comments.delete_many({})
    await db.audit_logs.delete_many({})

    admin = {
        "nombre": "Administrador",
        "email": "admin@example.com",
        "rol": "admin",
        "password_hash": hash_password("admin123"),
        "activo": True,
        "fecha_creacion": datetime.utcnow()
    }

    agent = {
        "nombre": "Agente Soporte",
        "email": "agente@example.com",
        "rol": "agent",
        "password_hash": hash_password("agente123"),
        "activo": True,
        "fecha_creacion": datetime.utcnow()
    }

    user = {
        "nombre": "Usuario Final",
        "email": "usuario@example.com",
        "rol": "user",
        "password_hash": hash_password("usuario123"),
        "activo": True,
        "fecha_creacion": datetime.utcnow()
    }

    res_admin = await db.usuarios.insert_one(admin)
    res_agent = await db.usuarios.insert_one(agent)
    res_user = await db.usuarios.insert_one(user)

    print("Usuarios de prueba creados.")

    tickets = [
        {
            "titulo": "No puedo acceder al sistema CRM",
            "descripcion": "Intento ingresar pero la pantalla se queda en blanco. He borrado caché pero sigue igual.",
            "estado": "abierto",
            "prioridad": "media",
            "usuario_id": str(res_user.inserted_id),
            "asignado_a": None,
            "fecha_creacion": datetime.utcnow(),
            "fecha_actualizacion": datetime.utcnow()
        },
        {
            "titulo": "Actualizar licencia de software Adobe",
            "descripcion": "Mi licencia expira mañana y necesito usar el programa para el proyecto urgente.",
            "estado": "en_progreso",
            "prioridad": "alta",
            "usuario_id": str(res_user.inserted_id),
            "asignado_a": str(res_agent.inserted_id),
            "fecha_creacion": datetime.utcnow(),
            "fecha_actualizacion": datetime.utcnow()
        }
    ]

    await db.tickets.insert_many(tickets)
    print("Tickets de prueba creados.")

    client.close()

if __name__ == "__main__":
    asyncio.run(seed())
