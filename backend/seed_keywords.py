from database import SessionLocal, engine
import models

# Asegurar que las tablas existan
models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # Solo poblar si está vacía
    if db.query(models.PalabraClaveTriaje).count() == 0:
        palabras = [
            # Redes (id=1)
            ("router", 1), ("ip", 1), ("internet", 1), ("wifi", 1), ("vpn", 1), ("red", 1),
            # Hardware (id=2)
            ("pantalla", 2), ("teclado", 2), ("mouse", 2), ("impresora", 2), ("hardware", 2), ("pc", 2),
            # Software (id=3)
            ("windows", 3), ("office", 3), ("error de sistema", 3), ("software", 3), ("aplicación", 3),
            # Seguridad (id=5)
            ("seguridad", 5), ("parche", 5), ("firewall", 5), ("certificado", 5)
        ]
        
        for palabra, id_area in palabras:
            db.add(models.PalabraClaveTriaje(palabra=palabra, id_area_tecnica=id_area))
            
        db.commit()
        print("Palabras clave insertadas correctamente.")
    else:
        print("La tabla ya contiene datos.")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
