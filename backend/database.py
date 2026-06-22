import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Cargar variables de entorno del archivo .env
load_dotenv()

# En un entorno real, la URL provendría de un .env
# FORMATO: postgresql://[usuario]:[password]@[host]:[puerto]/[base_de_datos]
# Ejemplo para Supabase:
# SQLALCHEMY_DATABASE_URL = "postgresql://postgres.[tu_proyecto]:[tu_password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# URL de ejemplo simulada para propósitos de prueba
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://usuario:password@localhost/helpdesk")

# Crear el motor de SQLAlchemy
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Crear la fábrica de sesiones
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para las clases del modelo declarativo
Base = declarative_base()

# Dependencia para obtener la sesión de la base de datos en FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
