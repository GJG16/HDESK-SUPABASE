from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

import models
from database import get_db
from core.security import verify_password, create_access_token
from services.user_service import enriquecer_usuario

router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)

@router.post("/login")
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
