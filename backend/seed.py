import sys
import io
import bcrypt
import models
import database

# Fix Windows console encoding for unicode characters
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Asegurar que las tablas existan
models.Base.metadata.create_all(bind=database.engine)

db = database.SessionLocal()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

try:
    # ─── Departamentos de Negocio (Mejora 1) ───────────────
    if not db.query(models.DepartamentoNegocio).first():
        departamentos = [
            models.DepartamentoNegocio(id=1, nombre='Marketing', descripcion='Departamento de Marketing y Publicidad'),
            models.DepartamentoNegocio(id=2, nombre='Ventas', descripcion='Departamento de Ventas Comerciales'),
            models.DepartamentoNegocio(id=3, nombre='ATC', descripcion='Atención al Cliente'),
            models.DepartamentoNegocio(id=4, nombre='Operaciones', descripcion='Departamento de Operaciones'),
            models.DepartamentoNegocio(id=5, nombre='Recursos Humanos', descripcion='Departamento de RRHH'),
        ]
        db.add_all(departamentos)
        db.commit()
        print("✓ Departamentos de negocio insertados.")

    # ─── Áreas Técnicas ────────────────────────────────────
    if not db.query(models.AreaTecnica).first():
        areas = [
            models.AreaTecnica(id=1, nombre_area='Redes y Conectividad', descripcion='Problemas de red, internet, VPN, WiFi'),
            models.AreaTecnica(id=2, nombre_area='Hardware y Periféricos', descripcion='Equipos, pantallas, teclados, impresoras'),
            models.AreaTecnica(id=3, nombre_area='Software y SO', descripcion='Sistemas operativos, aplicaciones, errores de software'),
            models.AreaTecnica(id=4, nombre_area='Soporte General', descripcion='Consultas generales y solicitudes diversas'),
            models.AreaTecnica(id=5, nombre_area='Seguridad', descripcion='Parches de seguridad, accesos, certificados'),
        ]
        db.add_all(areas)
        db.commit()
        print("✓ Áreas técnicas insertadas.")

    # ─── Usuarios con contraseñas encriptadas (Mejora 1 + 2) ─
    if not db.query(models.Usuario).first():
        usuarios = [
            # Administrador
            models.Usuario(
                id=1,
                nombre='Admin García',
                email='admin@conectabpo.co',
                password_hash=hash_password('admin123'),
                rol='Administrador',
            ),
            # Operadores (con departamento asignado)
            models.Usuario(
                id=2,
                nombre='Laura Pérez',
                email='operador@conectabpo.co',
                password_hash=hash_password('oper123'),
                rol='Operador',
                id_departamento=2,  # Ventas
            ),
            models.Usuario(
                id=3,
                nombre='Sofía Ramírez',
                email='sramirez@conectabpo.co',
                password_hash=hash_password('oper123'),
                rol='Operador',
                id_departamento=1,  # Marketing
            ),
            models.Usuario(
                id=4,
                nombre='Pedro Operador',
                email='pedro.op@conectabpo.co',
                password_hash=hash_password('oper123'),
                rol='Operador',
                id_departamento=3,  # ATC
            ),
            # Técnicos (con área técnica asignada)
            models.Usuario(
                id=5,
                nombre='Andrés Molina',
                email='tecnico@conectabpo.co',
                password_hash=hash_password('tech123'),
                rol='Tecnico',
                especialidad='Redes',
                id_area_tecnica=1,  # Redes y Conectividad
            ),
            models.Usuario(
                id=6,
                nombre='María López',
                email='maria.hw@conectabpo.co',
                password_hash=hash_password('tech123'),
                rol='Tecnico',
                especialidad='Hardware',
                id_area_tecnica=2,  # Hardware y Periféricos
            ),
            models.Usuario(
                id=7,
                nombre='Carlos Ruiz',
                email='carlos.sw@conectabpo.co',
                password_hash=hash_password('tech123'),
                rol='Tecnico',
                especialidad='Software',
                id_area_tecnica=3,  # Software y SO
            ),
            models.Usuario(
                id=8,
                nombre='Diana Torres',
                email='diana.seg@conectabpo.co',
                password_hash=hash_password('tech123'),
                rol='Tecnico',
                especialidad='Seguridad',
                id_area_tecnica=5,  # Seguridad
            ),
        ]
        db.add_all(usuarios)
        db.commit()
        print("✓ Usuarios insertados con contraseñas encriptadas.")
        print("  ├─ admin@conectabpo.co / admin123 (Administrador)")
        print("  ├─ operador@conectabpo.co / oper123 (Operador - Ventas)")
        print("  ├─ sramirez@conectabpo.co / oper123 (Operador - Marketing)")
        print("  ├─ pedro.op@conectabpo.co / oper123 (Operador - ATC)")
        print("  ├─ tecnico@conectabpo.co / tech123 (Técnico - Redes)")
        print("  ├─ maria.hw@conectabpo.co / tech123 (Técnico - Hardware)")
        print("  ├─ carlos.sw@conectabpo.co / tech123 (Técnico - Software)")
        print("  └─ diana.seg@conectabpo.co / tech123 (Técnico - Seguridad)")

    # ─── Tickets de prueba (con departamento origen) ───────
    if not db.query(models.Ticket).first():
        tickets = [
            models.Ticket(
                titulo='Caída de enlace dedicado',
                descripcion='El enlace principal de la oficina central se cayó, no hay internet',
                criticidad='Alta', estado='En Proceso',
                id_area=1, id_operador_creador=2, id_especialista=5,
                id_departamento_origen=2,  # Ventas
            ),
            models.Ticket(
                titulo='PC no enciende',
                descripcion='La PC de la estación 14B no enciende desde hoy en la mañana',
                criticidad='Media', estado='Pendiente',
                id_area=2, id_operador_creador=3,
                id_departamento_origen=1,  # Marketing
            ),
            models.Ticket(
                titulo='Error en Office 365',
                descripcion='Windows muestra error al abrir Excel, código 0x80070005',
                criticidad='Baja', estado='Resuelto',
                id_area=3, id_operador_creador=4, id_especialista=7,
                id_departamento_origen=3,  # ATC
                comentario_resolucion='Se reinstalaron las licencias de Office',
                tiempo_resolucion_horas=2.5,
            ),
            models.Ticket(
                titulo='Impresora sin conexión',
                descripcion='La impresora de sala de juntas no responde, se necesita revisar hardware',
                criticidad='Media', estado='Pendiente',
                id_area=2, id_operador_creador=2,
                id_departamento_origen=2,  # Ventas
            ),
            models.Ticket(
                titulo='VPN no conecta en teletrabajo',
                descripcion='5 usuarios del equipo de ventas no pueden conectar a la VPN corporativa',
                criticidad='Alta', estado='Pendiente',
                id_area=1, id_operador_creador=2,
                id_departamento_origen=2,  # Ventas
            ),
            models.Ticket(
                titulo='Actualización de parches de seguridad',
                descripcion='Se requiere aplicar parches de seguridad críticos en servidores',
                criticidad='Critica', estado='Pendiente',
                id_area=5, id_operador_creador=4,
                id_departamento_origen=3,  # ATC
            ),
        ]
        db.add_all(tickets)
        db.commit()
        print("✓ Tickets de prueba insertados (con departamento de origen).")

    # ─── Historial de tickets para los existentes ──────────
    if not db.query(models.HistorialTicket).first():
        historial = [
            # Ticket 1: Creado → En Proceso
            models.HistorialTicket(
                id_ticket=1, id_usuario=2,
                estado_anterior=None, estado_nuevo='Pendiente',
                comentario='Ticket creado por triaje automático',
            ),
            models.HistorialTicket(
                id_ticket=1, id_usuario=5,
                estado_anterior='Pendiente', estado_nuevo='En Proceso',
                comentario='Técnico Andrés Molina tomó el ticket',
            ),
            # Ticket 3: Creado → Resuelto
            models.HistorialTicket(
                id_ticket=3, id_usuario=4,
                estado_anterior=None, estado_nuevo='Pendiente',
                comentario='Ticket creado por triaje automático',
            ),
            models.HistorialTicket(
                id_ticket=3, id_usuario=7,
                estado_anterior='Pendiente', estado_nuevo='Resuelto',
                comentario='Se reinstalaron las licencias de Office',
            ),
        ]
        db.add_all(historial)
        db.commit()
        print("✓ Historial de tickets insertado.")

    print("\n🎉 Base de datos inicializada correctamente con las 5 mejoras.")
except Exception as e:
    db.rollback()
    print(f"✗ Error al inicializar la base de datos: {e}")
finally:
    db.close()
