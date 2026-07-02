import os
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy import create_engine, text

engine = create_engine(os.environ['DATABASE_URL'])
with engine.connect() as conn:
    # Crear policy para permitir INSERT (subir archivos) con anon key
    try:
        conn.execute(text("""
            CREATE POLICY "allow_public_insert" ON storage.objects
            FOR INSERT TO anon
            WITH CHECK (bucket_id = 'adjuntos');
        """))
        conn.commit()
        print('INSERT policy created.')
    except Exception as e:
        print(f'INSERT policy: {e}')
    
    # Crear policy para permitir SELECT (descargar) con anon key  
    try:
        conn.execute(text("""
            CREATE POLICY "allow_public_select" ON storage.objects
            FOR SELECT TO anon
            USING (bucket_id = 'adjuntos');
        """))
        conn.commit()
        print('SELECT policy created.')
    except Exception as e:
        print(f'SELECT policy: {e}')
    
    print('Done.')
