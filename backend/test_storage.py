import os
from dotenv import load_dotenv
load_dotenv()

from core.supabase_client import supabase

# Crear un archivo de prueba
test_content = b"Este es un archivo de prueba para verificar Supabase Storage."
test_path = "test/prueba_upload.txt"

try:
    result = supabase.storage.from_("adjuntos").upload(
        path=test_path,
        file=test_content,
        file_options={"content-type": "text/plain"}
    )
    print(f"Upload exitoso: {result}")
    
    # Construir URL publica
    url = f"{os.environ['SUPABASE_URL']}/storage/v1/object/public/adjuntos/{test_path}"
    print(f"URL publica: {url}")
    
    # Limpiar: eliminar el archivo de prueba
    supabase.storage.from_("adjuntos").remove([test_path])
    print("Archivo de prueba eliminado.")
    
except Exception as e:
    print(f"Error: {e}")
