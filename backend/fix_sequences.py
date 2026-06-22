import sys
import io
from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Tablas que fueron pobladas con IDs explícitos en seed.py
tablas = [
    "usuarios",
    "tb_departamentos_negocio",
    "tb_areas_tecnicas",
    "tickets",
    "historial_tickets"
]

with engine.connect() as conn:
    for table in tablas:
        try:
            # setval y pg_get_serial_sequence para asegurar que usamos el nombre correcto de la secuencia
            query = f"""
            SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT MAX(id)+1 FROM {table}), 1), false);
            """
            conn.execute(text(query))
            print(f"✅ Secuencia para la tabla '{table}' sincronizada.")
        except Exception as e:
            print(f"⚠️ No se pudo sincronizar la tabla '{table}': {e}")
            
    conn.commit()

print("\n🚀 ¡Todas las secuencias de PostgreSQL han sido actualizadas!")
