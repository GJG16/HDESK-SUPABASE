from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt

import models
from database import get_db

SECRET_KEY = "super_secret_key_para_pruebas_en_qa"
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def hash_password(password: str) -> str:
    """Encripta una contraseña con bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contraseña contra su hash bcrypt."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

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
