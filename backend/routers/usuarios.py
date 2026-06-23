from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

import models
from database import get_db
from core.security import get_current_admin, hash_password
from services.user_service import enriquecer_usuario
from services.ticket_service import registrar_auditoria

router = APIRouter(
    prefix="/usuarios",
    tags=["Usuarios"],
)

admin_router = APIRouter(
    prefix="/admin/usuarios",
    tags=["Admin Usuarios"],
)

@router.get("/", response_model=List[models.UsuarioResponse])
def listar_usuarios(rol: Optional[str] = None, activo: Optional[bool] = None, db: Session = Depends(get_db)):
    """Lista todos los usuarios con filtro opcional por rol y estado activo."""
    query = db.query(models.Usuario)
    if rol:
        query = query.filter(models.Usuario.rol == rol)
    if activo is not None:
        query = query.filter(models.Usuario.activo == activo)
    usuarios = query.all()
    return [enriquecer_usuario(u) for u in usuarios]

@router.get("/{usuario_id}", response_model=models.UsuarioResponse)
def obtener_usuario(usuario_id: int, db: Session = Depends(get_db)):
    """Obtiene un usuario por su ID."""
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail=f"Usuario #{usuario_id} no encontrado")
    return enriquecer_usuario(usuario)

@admin_router.post("/", response_model=models.UsuarioResponse)
def crear_usuario(data: models.UsuarioCreate, db: Session = Depends(get_db),
                  admin: models.Usuario = Depends(get_current_admin)):
    """Crea un usuario con contraseña encriptada."""
    existente = db.query(models.Usuario).filter(models.Usuario.email == data.email).first()
    if existente:
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese email")

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


@admin_router.patch("/{usuario_id}/desactivar", response_model=models.UsuarioResponse)
def desactivar_usuario(usuario_id: int, db: Session = Depends(get_db),
                       admin: models.Usuario = Depends(get_current_admin)):
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


@admin_router.patch("/{usuario_id}/activar", response_model=models.UsuarioResponse)
def activar_usuario(usuario_id: int, db: Session = Depends(get_db),
                    admin: models.Usuario = Depends(get_current_admin)):
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
