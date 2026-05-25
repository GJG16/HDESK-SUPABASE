from typing import List, Optional

from bson.objectid import ObjectId
from fastapi import APIRouter, Depends, Header, HTTPException, status

from database import get_database
from models.schemas import User, UserUpdate
from audit import log_deletion
from security import decode_token, hash_password

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])


def _extract_token(authorization: Optional[str], token: Optional[str]) -> Optional[str]:
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ", 1)[1]
    return token


def _serialize_user(user: dict) -> dict:
    user["id"] = str(user.pop("_id"))
    user.pop("password_hash", None)
    return user


async def get_current_user(
    authorization: Optional[str] = Header(default=None),
    token: Optional[str] = None,
    db=Depends(get_database),
):
    """Obtener usuario actual del token"""
    raw_token = _extract_token(authorization, token)
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autorizado",
        )

    token_data = decode_token(raw_token, expected_type="access")
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )

    user = await db.usuarios.find_one({"_id": ObjectId(token_data.user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    return _serialize_user(user)


@router.get("/", response_model=List[User])
async def get_usuarios(db=Depends(get_database), current_user=Depends(get_current_user)):
    """Obtener todos los usuarios"""
    if current_user.get("rol") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden ver todos los usuarios",
        )

    usuarios = await db.usuarios.find().to_list(None)
    return [_serialize_user(user) for user in usuarios]


@router.get("/{usuario_id}", response_model=User)
async def get_usuario(usuario_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    """Obtener usuario por ID"""
    try:
        if current_user.get("rol") != "admin" and current_user.get("id") != usuario_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para ver este usuario",
            )

        user = await db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )

        return _serialize_user(user)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de usuario inválido",
        )


@router.put("/{usuario_id}", response_model=User)
async def update_usuario(usuario_id: str, user_update: UserUpdate, db=Depends(get_database), current_user=Depends(get_current_user)):
    """Actualizar usuario"""
    if current_user.get("rol") != "admin" and current_user.get("id") != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para actualizar este usuario",
        )

    try:
        update_data = {k: v for k, v in user_update.dict().items() if v is not None}

        if current_user.get("rol") != "admin":
            update_data.pop("rol", None)

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No hay datos para actualizar",
            )

        result = await db.usuarios.update_one(
            {"_id": ObjectId(usuario_id)},
            {"$set": update_data},
        )

        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )

        updated_user = await db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        return _serialize_user(updated_user)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_usuario(usuario_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    """Eliminar usuario (solo admin)"""
    if current_user.get("rol") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden eliminar usuarios",
        )

    try:
        user_to_delete = await db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        if not user_to_delete:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )

        await log_deletion(
            db,
            action="delete_user",
            resource_type="user",
            resource_id=usuario_id,
            actor_admin_id=current_user.get("id"),
        )

        result = await db.usuarios.delete_one({"_id": ObjectId(usuario_id)})

        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/perfil/me", response_model=User)
async def get_perfil(current_user=Depends(get_current_user)):
    """Obtener perfil del usuario actual"""
    return current_user
