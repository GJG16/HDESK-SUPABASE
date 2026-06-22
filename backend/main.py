from fastapi import FastAPI, Depends, HTTPException, Request, UploadFile, File
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func, String
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import pandas as pd
import numpy as np
import jwt
import bcrypt
import hashlib
import time
import html

import models
import database
from database import get_db

# Crear las tablas en la BD (para propósitos de prueba, en producción usar Alembic)
models.Base.metadata.create_all(bind=database.engine)

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Helpdesk Multiparadigma", version="2.0.0")

# Configuración CORS para permitir peticiones desde Angular
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# UTILIDADES
# ==========================================

def hash_password(password: str) -> str:
    """Encripta una contraseña con bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contraseña contra su hash bcrypt."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def enriquecer_ticket(ticket: models.Ticket, db: Session) -> dict:
    """Convierte un objeto Ticket SQLAlchemy a dict enriquecido con nombres de relaciones."""
    data = {
        "id": ticket.id,
        "titulo": ticket.titulo,
        "descripcion": ticket.descripcion,
        "estado": ticket.estado,
        "criticidad": ticket.criticidad,
        "id_area": ticket.id_area,
        "id_operador_creador": ticket.id_operador_creador,
        "id_especialista": ticket.id_especialista,
        "id_departamento_origen": ticket.id_departamento_origen,
        "comentario_resolucion": ticket.comentario_resolucion,
        "fecha_creacion": ticket.fecha_creacion,
        "fecha_actualizacion": ticket.fecha_actualizacion,
        "fecha_resolucion": ticket.fecha_resolucion,
        "tiempo_resolucion_horas": float(ticket.tiempo_resolucion_horas) if ticket.tiempo_resolucion_horas is not None else None,
        "nombre_area": ticket.area.nombre_area if ticket.area else None,
        "nombre_operador": ticket.operador.nombre if ticket.operador else None,
        "nombre_especialista": ticket.especialista.nombre if ticket.especialista else None,
        "nombre_departamento_origen": ticket.departamento_origen.nombre if ticket.departamento_origen else None,
        "version": ticket.version,
    }
    return data


def enriquecer_usuario(usuario: models.Usuario) -> dict:
    """Convierte un objeto Usuario SQLAlchemy a dict enriquecido."""
    return {
        "id": usuario.id,
        "nombre": usuario.nombre,
        "email": usuario.email,
        "rol": usuario.rol,
        "especialidad": usuario.especialidad,
        "extension": usuario.extension,
        "id_departamento": usuario.id_departamento,
        "id_area_tecnica": usuario.id_area_tecnica,
        "nombre_departamento": usuario.departamento.nombre if usuario.departamento else None,
        "nombre_area_tecnica": usuario.area_tecnica.nombre_area if usuario.area_tecnica else None,
        "activo": usuario.activo,
        "ultimo_acceso": usuario.ultimo_acceso,
    }


def registrar_auditoria(db: Session, id_usuario: Optional[int], accion: str, entidad: str, detalle: Optional[str] = None):
    """Registra una acción en la tabla de auditoría."""
    log = models.Auditoria(
        id_usuario=id_usuario,
        accion=accion,
        entidad=entidad,
        detalle=detalle
    )
    db.add(log)
    db.commit()


def registrar_historial_ticket(db: Session, id_ticket: int, id_usuario: Optional[int],
                                estado_anterior: Optional[str], estado_nuevo: str, comentario: Optional[str] = None):
    """Registra un cambio de estado en el historial del ticket (Mejora 5)."""
    historial = models.HistorialTicket(
        id_ticket=id_ticket,
        id_usuario=id_usuario,
        estado_anterior=estado_anterior,
        estado_nuevo=estado_nuevo,
        comentario=comentario
    )
    db.add(historial)
    db.commit()


# ==========================================
# PARADIGMA LÓGICO (Motor de Triaje Deductivo)
# ==========================================
def motor_de_triaje(descripcion: str, db: Session) -> tuple[int, Optional[int]]:
    """
    Evalúa reglas condicionales deductivas para determinar el área y el especialista.
    Ahora busca especialistas dinámicamente en la BD en vez de usar IDs hardcodeados.
    """
    desc = html.escape(descripcion.lower())

    # Reglas base para determinar Área con sistema de puntuación
    scores = {1: 0, 2: 0, 3: 0, 5: 0}

    palabras_redes = ["router", "ip", "internet", "wifi", "vpn", "red"]
    palabras_hw = ["pantalla", "teclado", "mouse", "impresora", "hardware", "pc"]
    palabras_sw = ["windows", "office", "error de sistema", "software", "aplicación"]
    palabras_seguridad = ["seguridad", "parche", "firewall", "certificado"]

    for word in palabras_redes:
        if word in desc: scores[1] += 1
    for word in palabras_hw:
        if word in desc: scores[2] += 1
    for word in palabras_sw:
        if word in desc: scores[3] += 1
    for word in palabras_seguridad:
        if word in desc: scores[5] += 1

    id_area_asignada = max(scores, key=lambda x: scores[x])
    if scores[id_area_asignada] == 0:
        id_area_asignada = 4  # Soporte General

    # Buscar especialista dinámicamente: el técnico activo con menos tickets asignados
    especialista = (
        db.query(models.Usuario)
        .filter(
            models.Usuario.rol == "Tecnico",
            models.Usuario.activo == True,
        )
        .outerjoin(
            models.Ticket,
            (models.Ticket.id_especialista == models.Usuario.id) &
            (models.Ticket.estado.in_(["Pendiente", "En Proceso"]))
        )
        .group_by(models.Usuario.id)
        .order_by(sql_func.count(models.Ticket.id))
        .first()
    )

    id_especialista = especialista.id if especialista else None

    return id_area_asignada, id_especialista


# ==========================================
# AUTENTICACIÓN Y SEGURIDAD (Mejora 2)
# ==========================================

SECRET_KEY = "super_secret_key_para_pruebas_en_qa"
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta if expires_delta else timedelta(hours=24))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Token inválido")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    usuario = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if not usuario or not usuario.activo:
        raise HTTPException(status_code=401, detail="Usuario no encontrado o inactivo")
    return usuario

def get_current_admin(usuario: models.Usuario = Depends(get_current_user)):
    if usuario.rol != "Administrador":
        raise HTTPException(status_code=403, detail="No tienes permisos de Administrador")
    return usuario

def require_role(*roles):
    """Factory de dependencias para requerir uno o más roles."""
    def role_checker(usuario: models.Usuario = Depends(get_current_user)):
        if usuario.rol not in roles:
            raise HTTPException(status_code=403, detail=f"Se requiere rol: {', '.join(roles)}")
        return usuario
    return role_checker


# ==========================================
# ENDPOINT: LOGIN (Mejora 2)
# ==========================================

@app.post("/auth/login")
def login(data: models.LoginModel, db: Session = Depends(get_db)):
    """
    Login seguro que valida credenciales con bcrypt y devuelve un JWT.
    """
    usuario = db.query(models.Usuario).filter(
        models.Usuario.email == data.email,
        models.Usuario.activo == True
    ).first()

    if not usuario:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    # Verificar contraseña con bcrypt
    if not verify_password(data.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    usuario.ultimo_acceso = datetime.now(timezone.utc)
    db.commit()
    db.refresh(usuario)

    access_token = create_access_token(data={
        "sub": usuario.email,
        "rol": usuario.rol,
        "id": usuario.id
    })

    return {
        "mensaje": "Login exitoso",
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": enriquecer_usuario(usuario)
    }


# ==========================================
# ENDPOINTS CRUD — USUARIOS (Mejora 1 + 4)
# ==========================================

@app.get("/usuarios/", response_model=List[models.UsuarioResponse])
def listar_usuarios(rol: Optional[str] = None, activo: Optional[bool] = None, db: Session = Depends(get_db)):
    """Lista todos los usuarios con filtro opcional por rol y estado activo."""
    query = db.query(models.Usuario)
    if rol:
        query = query.filter(models.Usuario.rol == rol)
    if activo is not None:
        query = query.filter(models.Usuario.activo == activo)
    usuarios = query.all()
    return [enriquecer_usuario(u) for u in usuarios]


@app.get("/usuarios/{usuario_id}", response_model=models.UsuarioResponse)
def obtener_usuario(usuario_id: int, db: Session = Depends(get_db)):
    """Obtiene un usuario por su ID."""
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail=f"Usuario #{usuario_id} no encontrado")
    return enriquecer_usuario(usuario)


@app.post("/admin/usuarios/", response_model=models.UsuarioResponse)
def crear_usuario(data: models.UsuarioCreate, db: Session = Depends(get_db),
                  admin: models.Usuario = Depends(get_current_admin)):
    """
    Crea un usuario con contraseña encriptada (Mejora 1).
    - Si rol es OPERADOR → id_departamento obligatorio
    - Si rol es TECNICO → id_area_tecnica obligatorio
    """
    # Verificar email duplicado
    existente = db.query(models.Usuario).filter(models.Usuario.email == data.email).first()
    if existente:
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese email")

    # Validar que el departamento/área existan
    if data.id_departamento:
        depto = db.query(models.DepartamentoNegocio).filter(
            models.DepartamentoNegocio.id == data.id_departamento
        ).first()
        if not depto:
            raise HTTPException(status_code=404, detail="Departamento no encontrado")

    if data.id_area_tecnica:
        area = db.query(models.AreaTecnica).filter(
            models.AreaTecnica.id == data.id_area_tecnica
        ).first()
        if not area:
            raise HTTPException(status_code=404, detail="Área técnica no encontrada")

    try:
        nuevo_usuario = models.Usuario(
            nombre=data.nombre,
            email=data.email,
            password_hash=hash_password(data.password),
            rol=data.rol,
            especialidad=data.especialidad,
            extension=data.extension,
            id_departamento=data.id_departamento,
            id_area_tecnica=data.id_area_tecnica,
        )
        db.add(nuevo_usuario)
        db.commit()
        db.refresh(nuevo_usuario)

        registrar_auditoria(db, admin.id, "USUARIO_CREADO", f"Usuario #{nuevo_usuario.id}",
                           f"Rol: {data.rol}, Email: {data.email}")

        return enriquecer_usuario(nuevo_usuario)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear usuario: {str(e)}")


# ==========================================
# SOFT DELETE — Desactivar/Activar Usuarios (Mejora 4)
# ==========================================

@app.patch("/admin/usuarios/{usuario_id}/desactivar", response_model=models.UsuarioResponse)
def desactivar_usuario(usuario_id: int, db: Session = Depends(get_db),
                       admin: models.Usuario = Depends(get_current_admin)):
    """
    Desactiva un usuario (soft delete). El usuario no puede loguearse pero su historial se conserva.
    """
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail=f"Usuario #{usuario_id} no encontrado")

    if usuario.id == admin.id:
        raise HTTPException(status_code=400, detail="No puedes desactivarte a ti mismo")

    if not usuario.activo:
        raise HTTPException(status_code=400, detail="El usuario ya está desactivado")

    usuario.activo = False
    db.commit()
    db.refresh(usuario)

    registrar_auditoria(db, admin.id, "USUARIO_DESACTIVADO", f"Usuario #{usuario_id}",
                       f"Nombre: {usuario.nombre}, Rol: {usuario.rol}")

    return enriquecer_usuario(usuario)


@app.patch("/admin/usuarios/{usuario_id}/activar", response_model=models.UsuarioResponse)
def activar_usuario(usuario_id: int, db: Session = Depends(get_db),
                    admin: models.Usuario = Depends(get_current_admin)):
    """
    Reactiva un usuario previamente desactivado.
    """
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail=f"Usuario #{usuario_id} no encontrado")

    if usuario.activo:
        raise HTTPException(status_code=400, detail="El usuario ya está activo")

    usuario.activo = True
    db.commit()
    db.refresh(usuario)

    registrar_auditoria(db, admin.id, "USUARIO_ACTIVADO", f"Usuario #{usuario_id}",
                       f"Nombre: {usuario.nombre}, Rol: {usuario.rol}")

    return enriquecer_usuario(usuario)


# ==========================================
# ENDPOINTS CRUD — TICKETS
# ==========================================

@app.get("/tickets/", response_model=List[models.TicketResponse])
def listar_tickets(
    estado: Optional[str] = None,
    criticidad: Optional[str] = None,
    id_area: Optional[int] = None,
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    sort_by: Optional[str] = None,
    sort_order: str = "desc",
    db: Session = Depends(get_db)
):
    """Lista todos los tickets con filtros, búsqueda, paginación y ordenamiento."""
    query = db.query(models.Ticket)

    if estado:
        query = query.filter(models.Ticket.estado == estado)
    if criticidad:
        query = query.filter(models.Ticket.criticidad == criticidad)
    if id_area:
        query = query.filter(models.Ticket.id_area == id_area)
    if q:
        search_term = f"%{q.lower()}%"
        query = query.filter(
            (models.Ticket.titulo.ilike(search_term)) |
            (models.Ticket.descripcion.ilike(search_term)) |
            (models.Ticket.id.cast(String).like(search_term))
        )

    # Ordenamiento dinámico
    sort_column = getattr(models.Ticket, sort_by, None) if sort_by else models.Ticket.fecha_creacion
    if sort_column is None:
        sort_column = models.Ticket.fecha_creacion
    query = query.order_by(sort_column.desc() if sort_order == "desc" else sort_column.asc())

    total = query.count()
    tickets = query.offset(skip).limit(limit).all()
    return [enriquecer_ticket(t, db) for t in tickets]


@app.get("/tickets/{ticket_id}", response_model=models.TicketResponse)
def obtener_ticket(ticket_id: int, db: Session = Depends(get_db)):
    """Obtiene un ticket por su ID."""
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket #{ticket_id} no encontrado")
    return enriquecer_ticket(ticket, db)


# Caché en memoria para idempotencia
idempotency_cache = {}

@app.post("/tickets/triaje/", response_model=models.TicketResponse)
def crear_ticket_con_triaje(ticket_in: models.TicketCreate, db: Session = Depends(get_db)):
    """
    Endpoint que recibe un ticket y utiliza el Motor de Triaje (Prog. Lógica) para clasificarlo.
    Ahora incluye trazabilidad de departamento origen (Mejora 1).
    """
    payload_hash = hashlib.md5(f"{ticket_in.titulo}-{ticket_in.descripcion}".encode()).hexdigest()
    now = time.time()
    if payload_hash in idempotency_cache and (now - idempotency_cache[payload_hash]) < 2:
        raise HTTPException(status_code=409, detail="Petición duplicada (Doble Submit detectado).")
    idempotency_cache[payload_hash] = now

    try:
        id_area, id_especialista = motor_de_triaje(ticket_in.descripcion, db)

        # Determinar departamento de origen si se envía el operador creador
        id_departamento_origen = None
        if ticket_in.id_operador_creador:
            operador = db.query(models.Usuario).filter(
                models.Usuario.id == ticket_in.id_operador_creador
            ).first()
            if operador and operador.id_departamento:
                id_departamento_origen = operador.id_departamento

        nuevo_ticket = models.Ticket(
            titulo=ticket_in.titulo,
            descripcion=ticket_in.descripcion,
            criticidad=ticket_in.criticidad,
            id_area=id_area,
            id_especialista=id_especialista,
            id_operador_creador=ticket_in.id_operador_creador,
            id_departamento_origen=id_departamento_origen,
            estado="Pendiente"
        )

        db.add(nuevo_ticket)
        db.commit()
        db.refresh(nuevo_ticket)

        # Registrar en auditoría
        registrar_auditoria(db, ticket_in.id_operador_creador, "TICKET_CREADO", f"Ticket #{nuevo_ticket.id}",
                           f"Criticidad: {ticket_in.criticidad} — Área: {id_area}")

        # Registrar en historial (Mejora 5)
        registrar_historial_ticket(
            db, nuevo_ticket.id, ticket_in.id_operador_creador,
            None, "Pendiente", "Ticket creado por triaje automático"
        )

        return enriquecer_ticket(nuevo_ticket, db)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear ticket: {str(e)}")


@app.patch("/tickets/{ticket_id}", response_model=models.TicketResponse)
def actualizar_ticket(ticket_id: int, patch: models.TicketPatch, db: Session = Depends(get_db)):
    """
    Actualiza parcialmente un ticket (estado, resolución, asignación).
    Registra automáticamente el historial de cambios (Mejora 5).
    """
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket #{ticket_id} no encontrado")

    if patch.version is not None and patch.version != ticket.version:
        raise HTTPException(status_code=409, detail="El ticket ha sido modificado por otro usuario. Recarga la página.")

    try:
        estado_anterior = ticket.estado
        ticket.version += 1

        if patch.estado is not None:
            ticket.estado = patch.estado

            # Si se marca como Resuelto, calcular tiempo de resolución
            if patch.estado == "Resuelto" and ticket.fecha_creacion:
                ticket.fecha_resolucion = datetime.now(timezone.utc)
                fc = ticket.fecha_creacion.replace(tzinfo=timezone.utc) if ticket.fecha_creacion.tzinfo is None else ticket.fecha_creacion
                delta = ticket.fecha_resolucion - fc
                ticket.tiempo_resolucion_horas = round(delta.total_seconds() / 3600, 2)

        if patch.comentario_resolucion is not None:
            ticket.comentario_resolucion = patch.comentario_resolucion

        if patch.id_especialista is not None:
            ticket.id_especialista = patch.id_especialista

        if patch.tiempo_resolucion_horas is not None:
            ticket.tiempo_resolucion_horas = patch.tiempo_resolucion_horas

        ticket.fecha_actualizacion = datetime.now(timezone.utc)
        db.commit()
        db.refresh(ticket)

        # Registrar en auditoría y historial si hubo cambio de estado
        if patch.estado and patch.estado != estado_anterior:
            registrar_auditoria(db, patch.id_especialista, "ESTADO_CAMBIADO", f"Ticket #{ticket_id}",
                               f"{estado_anterior} → {patch.estado}")

            # Mejora 5: Historial de Tickets con trazabilidad del técnico
            registrar_historial_ticket(
                db, ticket_id, patch.id_especialista,
                estado_anterior, patch.estado,
                patch.comentario_resolucion
            )

        return enriquecer_ticket(ticket, db)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al actualizar ticket: {str(e)}")


@app.delete("/tickets/{ticket_id}")
def eliminar_ticket(ticket_id: int, db: Session = Depends(get_db)):
    """Elimina un ticket del sistema."""
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket #{ticket_id} no encontrado")

    try:
        titulo = ticket.titulo
        db.delete(ticket)
        db.commit()

        registrar_auditoria(db, None, "TICKET_ELIMINADO", f"Ticket #{ticket_id}",
                           f"Título: {titulo}")

        return {"mensaje": f"Ticket #{ticket_id} eliminado correctamente"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar ticket: {str(e)}")


# ==========================================
# HISTORIAL DE TICKETS (Mejora 5)
# ==========================================

@app.get("/tickets/{ticket_id}/historial", response_model=List[models.HistorialTicketResponse])
def obtener_historial_ticket(ticket_id: int, db: Session = Depends(get_db)):
    """
    Retorna la línea de tiempo (timeline) de cambios de estado de un ticket.
    Ordenado cronológicamente para visualización en el frontend.
    """
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket #{ticket_id} no encontrado")

    historial = (
        db.query(models.HistorialTicket)
        .filter(models.HistorialTicket.id_ticket == ticket_id)
        .order_by(models.HistorialTicket.fecha.asc())
        .all()
    )

    result = []
    for h in historial:
        result.append({
            "id": h.id,
            "id_ticket": h.id_ticket,
            "id_usuario": h.id_usuario,
            "nombre_usuario": h.usuario.nombre if h.usuario else None,
            "estado_anterior": h.estado_anterior,
            "estado_nuevo": h.estado_nuevo,
            "comentario": h.comentario,
            "fecha": h.fecha,
        })
    return result


# ==========================================
# COMENTARIOS DE TICKETS (Sistema de conversación)
# ==========================================

@app.get("/tickets/{ticket_id}/comentarios", response_model=List[models.ComentarioResponse])
def listar_comentarios(ticket_id: int, db: Session = Depends(get_db)):
    """Lista todos los comentarios de un ticket ordenados cronológicamente."""
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket #{ticket_id} no encontrado")

    comentarios = (
        db.query(models.ComentarioTicket)
        .filter(models.ComentarioTicket.id_ticket == ticket_id)
        .order_by(models.ComentarioTicket.fecha.asc())
        .all()
    )

    return [{
        "id": c.id,
        "id_ticket": c.id_ticket,
        "id_usuario": c.id_usuario,
        "nombre_usuario": c.usuario.nombre if c.usuario else None,
        "contenido": c.contenido,
        "es_nota_interna": c.es_nota_interna,
        "fecha": c.fecha,
    } for c in comentarios]


@app.post("/tickets/{ticket_id}/comentarios", response_model=models.ComentarioResponse)
def crear_comentario(ticket_id: int, data: models.ComentarioCreate, db: Session = Depends(get_db)):
    """Agrega un comentario a un ticket (nota interna o comentario público)."""
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket #{ticket_id} no encontrado")

    try:
        comentario = models.ComentarioTicket(
            id_ticket=ticket_id,
            id_usuario=data.id_usuario,
            contenido=data.contenido,
            es_nota_interna=data.es_nota_interna,
        )
        db.add(comentario)

        # Actualizar fecha de actualización del ticket
        ticket.fecha_actualizacion = datetime.now(timezone.utc)
        db.commit()
        db.refresh(comentario)

        # Registrar en auditoría
        registrar_auditoria(
            db, data.id_usuario, "COMENTARIO_AGREGADO", f"Ticket #{ticket_id}",
            f"{'Nota interna' if data.es_nota_interna else 'Comentario público'}"
        )

        return {
            "id": comentario.id,
            "id_ticket": comentario.id_ticket,
            "id_usuario": comentario.id_usuario,
            "nombre_usuario": comentario.usuario.nombre if comentario.usuario else None,
            "contenido": comentario.contenido,
            "es_nota_interna": comentario.es_nota_interna,
            "fecha": comentario.fecha,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear comentario: {str(e)}")


# ==========================================
# PARADIGMA FUNCIONAL (Filtrado y Mapeo en Memoria)
# ==========================================
@app.get("/tickets/pendientes/criticos", response_model=List[models.TicketResponse])
def obtener_tickets_criticos_pendientes(db: Session = Depends(get_db)):
    """
    Endpoint que extrae tickets y usa Prog. Funcional (filter, map, lambda)
    para procesar los datos en memoria.
    """
    # Obtenemos todos los tickets de la BD
    todos_los_tickets = db.query(models.Ticket).all()

    # Uso de filter() y lambda para dejar solo los pendientes y críticos
    es_critico_pendiente = lambda t: t.estado == "Pendiente" and t.criticidad in ["Alta", "Critica"]
    tickets_filtrados = list(filter(es_critico_pendiente, todos_los_tickets))

    # Uso de map() para aplicar alguna transformación si fuera necesario
    # Por ejemplo, poner el titulo en mayúsculas para enfatizar la criticidad
    def destacar_titulo(t):
        t.titulo = f"[URGENTE] {t.titulo.upper()}"
        return t

    tickets_transformados = list(map(destacar_titulo, tickets_filtrados))

    return [enriquecer_ticket(t, db) for t in tickets_transformados]


# ==========================================
# ENDPOINTS CRUD — ÁREAS TÉCNICAS
# ==========================================

@app.get("/areas/", response_model=List[models.AreaResponse])
def listar_areas(db: Session = Depends(get_db)):
    """Lista todas las áreas técnicas."""
    return db.query(models.AreaTecnica).all()


# ==========================================
# ENDPOINTS CRUD — DEPARTAMENTOS DE NEGOCIO (Mejora 1)
# ==========================================

@app.get("/departamentos/", response_model=List[models.DepartamentoResponse])
def listar_departamentos(db: Session = Depends(get_db)):
    """Lista todos los departamentos de negocio."""
    return db.query(models.DepartamentoNegocio).filter(
        models.DepartamentoNegocio.activo == True
    ).all()


# ==========================================
# AUDITORÍA
# ==========================================

@app.get("/auditoria/", response_model=List[models.AuditoriaResponse])
def listar_auditoria(limit: int = 50, db: Session = Depends(get_db)):
    """Lista los últimos registros de auditoría."""
    logs = (
        db.query(models.Auditoria)
        .order_by(models.Auditoria.fecha.desc())
        .limit(limit)
        .all()
    )
    result = []
    for log in logs:
        data = {
            "id": log.id,
            "id_usuario": log.id_usuario,
            "accion": log.accion,
            "entidad": log.entidad,
            "detalle": log.detalle,
            "fecha": log.fecha,
            "nombre_usuario": log.usuario.nombre if log.usuario else None,
        }
        result.append(data)
    return result


# ==========================================
# CIENCIA DE DATOS — MAPA DE CALOR (Mejora 3)
# ==========================================

@app.get("/reportes/mapa-calor-departamentos")
def mapa_calor_departamentos(db: Session = Depends(get_db),
                              usuario: models.Usuario = Depends(get_current_user)):
    """
    Endpoint protegido para el TÉCNICO (y ADMIN).
    Usa Pandas groupby() para identificar qué departamento reporta más fallas hoy.
    """
    if usuario.rol not in ("Tecnico", "Administrador"):
        raise HTTPException(status_code=403, detail="Solo técnicos y administradores pueden ver este reporte")

    # Extraer tickets activos (Pendiente o En Proceso)
    tickets_activos = db.query(models.Ticket).filter(
        models.Ticket.estado.in_(["Pendiente", "En Proceso"])
    ).all()

    if not tickets_activos:
        return {"mensaje": "No hay tickets activos", "datos": [], "total": 0}

    # Convertir a DataFrame de Pandas
    data = [{
        "id": t.id,
        "titulo": t.titulo,
        "estado": t.estado,
        "criticidad": t.criticidad,
        "id_departamento_origen": t.id_departamento_origen,
        "fecha_creacion": t.fecha_creacion,
    } for t in tickets_activos]

    df = pd.DataFrame(data)

    # Cruzar con departamentos para obtener nombres
    departamentos = db.query(models.DepartamentoNegocio).all()
    depto_map = {d.id: d.nombre for d in departamentos}

    df["departamento"] = df["id_departamento_origen"].map(depto_map).fillna("Sin Departamento")

    # Groupby: qué departamento reporta más fallas
    resumen = (
        df.groupby("departamento")
        .agg(
            cantidad=("id", "count"),
            criticos=("criticidad", lambda x: (x.isin(["Alta", "Critica"])).sum()),
        )
        .reset_index()
        .sort_values("cantidad", ascending=False)
    )

    total = int(resumen["cantidad"].sum())
    resumen["porcentaje"] = np.round((resumen["cantidad"] / total) * 100, 1)

    # Convertir NaN y tipos numpy a compatibles con JSON
    resumen_limpio = resumen.replace({np.nan: 0}).to_dict(orient="records")
    for item in resumen_limpio:
        item["cantidad"] = int(item["cantidad"])
        item["criticos"] = int(item["criticos"])
        item["porcentaje"] = float(item["porcentaje"])

    return {
        "datos": resumen_limpio,
        "total": total,
    }


# ==========================================
# CIENCIA DE DATOS — RENDIMIENTO (Pandas y Numpy)
# ==========================================
@app.get("/reportes/rendimiento")
def reporte_rendimiento_areas(db: Session = Depends(get_db), admin: models.Usuario = Depends(get_current_admin)):
    """
    Endpoint que usa Pandas y Numpy para calcular métricas avanzadas (tiempo promedio).
    """
    # Consulta a BD (Traemos solo los resueltos)
    tickets_resueltos = db.query(models.Ticket).filter(models.Ticket.estado == "Resuelto").all()

    if not tickets_resueltos:
        return {"mensaje": "No hay suficientes datos de tickets resueltos para calcular métricas."}

    # Convertimos los objetos SQLAlchemy a diccionarios
    data = [{
        "id": t.id,
        "id_area": t.id_area,
        "tiempo_resolucion_horas": float(t.tiempo_resolucion_horas) if t.tiempo_resolucion_horas else 0.0
    } for t in tickets_resueltos]

    # Creamos un DataFrame de Pandas
    df = pd.DataFrame(data)

    # Reemplazamos los ceros o nulos con NaN y luego calculamos la media
    df["tiempo_resolucion_horas"] = df["tiempo_resolucion_horas"].replace(0.0, np.nan)

    # Usamos groupby para agrupar por área y calcular el promedio
    resumen = df.groupby("id_area")["tiempo_resolucion_horas"].mean().reset_index()

    # Convertir el resultado a formato JSON/diccionario
    # Reemplazar NaN por nulos para que sea compatible con JSON
    resumen_limpio = resumen.replace({np.nan: None}).to_dict(orient="records")

    # Métricas globales con Numpy
    tiempos_validos = df["tiempo_resolucion_horas"].dropna().values
    metricas_globales = {}
    if len(tiempos_validos) > 0:
        metricas_globales = {
            "promedio_global_horas": round(float(np.mean(tiempos_validos)), 2),
            "mediana_horas": round(float(np.median(tiempos_validos)), 2),
            "desviacion_estandar": round(float(np.std(tiempos_validos)), 2),
            "total_resueltos": len(tickets_resueltos),
        }

    return {
        "metricas_por_area": resumen_limpio,
        "metricas_globales": metricas_globales
    }


@app.get("/reportes/dashboard")
def reporte_dashboard(db: Session = Depends(get_db)):
    """
    Métricas generales del dashboard con Pandas.
    """
    todos = db.query(models.Ticket).all()

    if not todos:
        return {"total_tickets": 0, "por_estado": {}, "por_criticidad": {}}

    df = pd.DataFrame([{
        "id": t.id,
        "estado": t.estado,
        "criticidad": t.criticidad,
        "id_area": t.id_area,
    } for t in todos])

    por_estado = df["estado"].value_counts().to_dict()
    por_criticidad = df["criticidad"].value_counts().to_dict()
    por_area = df["id_area"].value_counts().to_dict()

    return {
        "total_tickets": len(todos),
        "por_estado": por_estado,
        "por_criticidad": por_criticidad,
        "por_area": por_area,
    }

# ==========================================
# FASE 3: HELPDESK ENTERPRISE ENDPOINTS
# ==========================================

import os
import shutil

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# ─── Macros ─────────────────────────────────

@app.get("/macros/", response_model=List[models.MacroResponse])
def listar_macros(id_area: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.Macro).filter(models.Macro.activo == True)
    if id_area:
        query = query.filter((models.Macro.id_area_tecnica == id_area) | (models.Macro.id_area_tecnica == None))
    return query.all()

@app.post("/macros/", response_model=models.MacroResponse)
def crear_macro(data: models.MacroCreate, db: Session = Depends(get_db), admin: models.Usuario = Depends(get_current_admin)):
    macro = models.Macro(**data.dict())
    db.add(macro)
    db.commit()
    db.refresh(macro)
    return macro

# ─── Base de Conocimientos (KB) ─────────────

@app.get("/kb/", response_model=List[models.ArticuloKBResponse])
def listar_kb(q: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.ArticuloKB)
    if q:
        search = f"%{q.lower()}%"
        query = query.filter(models.ArticuloKB.titulo.ilike(search) | models.ArticuloKB.contenido.ilike(search))
    return query.all()

@app.post("/kb/", response_model=models.ArticuloKBResponse)
def crear_articulo_kb(data: models.ArticuloKBCreate, db: Session = Depends(get_db), admin: models.Usuario = Depends(get_current_admin)):
    articulo = models.ArticuloKB(**data.dict())
    db.add(articulo)
    db.commit()
    db.refresh(articulo)
    return articulo

# ─── CSAT (Satisfacción del Cliente) ────────

@app.post("/csat/", response_model=models.CSATResponse)
def crear_csat(id_ticket: int, data: models.CSATCreate, db: Session = Depends(get_db)):
    # Validar ticket resuelto
    ticket = db.query(models.Ticket).filter(models.Ticket.id == id_ticket).first()
    if not ticket or ticket.estado != "Resuelto":
        raise HTTPException(400, "Solo se pueden calificar tickets resueltos")
    
    # Verificar si ya tiene
    existente = db.query(models.CalificacionCSAT).filter(models.CalificacionCSAT.id_ticket == id_ticket).first()
    if existente:
        raise HTTPException(400, "El ticket ya ha sido calificado")

    csat = models.CalificacionCSAT(id_ticket=id_ticket, **data.dict())
    db.add(csat)
    db.commit()
    db.refresh(csat)
    return csat

@app.get("/csat/{id_ticket}", response_model=models.CSATResponse)
def obtener_csat(id_ticket: int, db: Session = Depends(get_db)):
    csat = db.query(models.CalificacionCSAT).filter(models.CalificacionCSAT.id_ticket == id_ticket).first()
    if not csat:
        raise HTTPException(404, "Calificación no encontrada")
    return csat

# ─── Adjuntos (Uploads) ─────────────────────

@app.post("/upload/", response_model=models.AdjuntoResponse)
def subir_adjunto(
    id_ticket: int, 
    file: UploadFile = File(...), 
    id_comentario: Optional[int] = None, 
    id_usuario: Optional[int] = None, 
    db: Session = Depends(get_db)
):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == id_ticket).first()
    if not ticket:
        raise HTTPException(404, "Ticket no encontrado")
        
    file_location = os.path.join(UPLOAD_DIR, f"{int(time.time())}_{file.filename}")
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)

    size = os.path.getsize(file_location)

    adjunto = models.Adjunto(
        id_ticket=id_ticket,
        id_comentario=id_comentario,
        id_usuario=id_usuario,
        nombre_archivo=file.filename,
        ruta_archivo=file_location,
        tipo_mime=file.content_type,
        tamano_bytes=size
    )
    db.add(adjunto)
    db.commit()
    db.refresh(adjunto)
    return adjunto

@app.get("/tickets/{ticket_id}/adjuntos", response_model=List[models.AdjuntoResponse])
def listar_adjuntos(ticket_id: int, db: Session = Depends(get_db)):
    return db.query(models.Adjunto).filter(models.Adjunto.id_ticket == ticket_id).all()

@app.get("/")
def raiz():
    return {
        "mensaje": "API de Helpdesk Multiparadigma corriendo correctamente",
        "version": "2.0.0",
        "mejoras": "5 Mejoras Estructurales Implementadas",
        "endpoints": [
            "POST /auth/login",
            "GET  /tickets/",
            "GET  /tickets/{id}",
            "POST /tickets/triaje/",
            "PATCH /tickets/{id}",
            "DELETE /tickets/{id}",
            "GET  /tickets/{id}/historial",
            "GET  /tickets/pendientes/criticos",
            "GET  /areas/",
            "GET  /departamentos/",
            "GET  /usuarios/",
            "GET  /usuarios/{id}",
            "POST /admin/usuarios/",
            "PATCH /admin/usuarios/{id}/desactivar",
            "PATCH /admin/usuarios/{id}/activar",
            "GET  /auditoria/",
            "GET  /reportes/rendimiento",
            "GET  /reportes/dashboard",
            "GET  /reportes/mapa-calor-departamentos",
        ]
    }
