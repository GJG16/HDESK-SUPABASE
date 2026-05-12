from motor.motor_asyncio import AsyncClient, AsyncDatabase
from config.settings import settings

class Database:
    client: AsyncClient = None
    db: AsyncDatabase = None

db = Database()

async def connect_db():
    """Conectar a MongoDB"""
    db.client = AsyncClient(settings.mongodb_url)
    db.db = db.client[settings.mongodb_db]
    
    # Crear índices
    await db.db.usuarios.create_index("email", unique=True)
    await db.db.tickets.create_index("usuario_id")
    await db.db.tickets.create_index("asignado_a")
    await db.db.tickets.create_index("estado")
    
    print(f"✓ Conectado a MongoDB: {settings.mongodb_url}/{settings.mongodb_db}")

async def close_db():
    """Cerrar conexión a MongoDB"""
    if db.client:
        db.client.close()
        print("✓ Desconectado de MongoDB")

def get_database() -> AsyncDatabase:
    """Obtener instancia de base de datos"""
    return db.db
