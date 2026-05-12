from fastapi import APIRouter, Depends, HTTPException, status
from models.schemas import User, UserCreate, UserUpdate
from database import get_database
from security import decode_token, hash_password
from typing import List
from bson.objectid import ObjectId

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])

async def get_current_user(token: str = None, db=Depends(get_database)):
    """Obtener usuario actual del token"""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autorizado"
        )
    
    token_data = decode_token(token)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado"
        )
    
    user = await db.usuarios.find_one({"_id": ObjectId(token_data.user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    user["id"] = str(user.pop("_id"))
    user.pop("password_hash", None)
    return user

@router.get("/", response_model=List[User])
async def get_usuarios(db=Depends(get_database), current_user=Depends(get_current_user)):
    """Obtener todos los usuarios"""
    usuarios = await db.usuarios.find().to_list(None)
    
    result = []
    for user in usuarios:
        user["id"] = str(user.pop("_id"))
        user.pop("password_hash", None)
        result.append(user)
    
    return result

@router.get("/{usuario_id}", response_model=User)
async def get_usuario(usuario_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    """Obtener usuario por ID"""
    try:
        user = await db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        user["id"] = str(user.pop("_id"))
        user.pop("password_hash", None)
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de usuario inválido"
        )

@router.put("/{usuario_id}", response_model=User)
async def update_usuario(usuario_id: str, user_update: UserUpdate, db=Depends(get_database), current_user=Depends(get_current_user)):
    """Actualizar usuario"""
    # Solo admin o el usuario a sí mismo pueden actualizar
    if current_user.get("rol") != "admin" and current_user.get("id") != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para actualizar este usuario"
        )
    
    try:
        update_data = {k: v for k, v in user_update.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No hay datos para actualizar"
            )
        
        result = await db.usuarios.update_one(
            {"_id": ObjectId(usuario_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        updated_user = await db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        updated_user["id"] = str(updated_user.pop("_id"))
        updated_user.pop("password_hash", None)
        
        return updated_user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_usuario(usuario_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    """Eliminar usuario (solo admin)"""
    if current_user.get("rol") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden eliminar usuarios"
        )
    
    try:
        result = await db.usuarios.delete_one({"_id": ObjectId(usuario_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/perfil/me", response_model=User)
async def get_perfil(current_user=Depends(get_current_user)):
    """Obtener perfil del usuario actual"""
    return current_user
