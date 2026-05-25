from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from config.settings import settings

class Database:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db = Database()

async def connect_db():
    """Conectar a MongoDB"""
    db.client = AsyncIOMotorClient(settings.mongodb_url)
    db.db = db.client[settings.mongodb_db]
    
    # Crear índices
    await db.db.usuarios.create_index("email", unique=True)
    await db.db.tickets.create_index("usuario_id")
    await db.db.tickets.create_index("asignado_a")
    await db.db.tickets.create_index("estado")
    await db.db.audit_logs.create_index("created_at")
    await db.db.audit_logs.create_index("actor_admin_id")
    
    print(f"[OK] Conectado a MongoDB: {settings.mongodb_url}/{settings.mongodb_db}")

async def close_db():
    """Cerrar conexión a MongoDB"""
    if db.client:
        db.client.close()
        print("[OK] Desconectado de MongoDB")

def get_database() -> AsyncIOMotorDatabase:
    """Obtener instancia de base de datos"""
    return db.db
