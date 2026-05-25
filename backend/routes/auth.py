from fastapi import APIRouter, Depends, HTTPException, status
from datetime import timedelta
from models.schemas import LoginRequest, TokenResponse, User, UserCreate
from database import get_database
from security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from bson.objectid import ObjectId

router = APIRouter(prefix="/api/auth", tags=["authentication"])

@router.post("/register", response_model=User)
async def register(user_data: UserCreate, db=Depends(get_database)):
    """Registrar nuevo usuario"""
    
    # Verificar si el email ya existe
    existing_user = await db.usuarios.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    # Crear nuevo usuario
    user_dict = user_data.dict()
    user_dict["rol"] = "user"
    user_dict["password_hash"] = hash_password(user_dict.pop("password"))
    user_dict["activo"] = True
    
    result = await db.usuarios.insert_one(user_dict)
    
    created_user = await db.usuarios.find_one({"_id": result.inserted_id})
    created_user["id"] = str(created_user.pop("_id"))
    created_user.pop("password_hash", None)
    
    return created_user

@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, db=Depends(get_database)):
    """Login de usuario"""
    
    # Buscar usuario por email
    user = await db.usuarios.find_one({"email": credentials.email})
    
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )
    
    if not user.get("activo"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    
    # Crear tokens
    access_token_expires = timedelta(minutes=30)
    token_data = {
        "user_id": str(user["_id"]),
        "email": user["email"],
        "rol": user.get("rol", "user")
    }
    
    access_token = create_access_token(data=token_data, expires_delta=access_token_expires)
    refresh_token = create_refresh_token(data=token_data)
    
    # Preparar respuesta
    user["id"] = str(user.pop("_id"))
    user.pop("password_hash", None)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/refresh")
async def refresh_token(token: dict):
    """Refrescar access token"""
    from security import decode_token
    
    token_data = decode_token(token.get("refresh_token", ""), expected_type="refresh")
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado"
        )
    
    token_dict = {
        "user_id": token_data.user_id,
        "email": token_data.email,
        "rol": token_data.rol
    }
    
    new_access_token = create_access_token(data=token_dict)
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }
