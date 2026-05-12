from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    AGENT = "agent"
    USER = "user"

class UserBase(BaseModel):
    nombre: str
    email: EmailStr
    rol: UserRole = UserRole.USER

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: Optional[str] = None
    fecha_creacion: Optional[datetime] = None

    class Config:
        from_attributes = True

class TicketStatus(str, Enum):
    ABIERTO = "abierto"
    EN_PROGRESO = "en_progreso"
    RESUELTO = "resuelto"
    CERRADO = "cerrado"

class TicketBase(BaseModel):
    titulo: str
    descripcion: str
    estado: TicketStatus = TicketStatus.ABIERTO

class TicketCreate(TicketBase):
    usuario_id: str

class Ticket(TicketBase):
    id: Optional[str] = None
    usuario_id: str
    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None
    
    class Config:
        from_attributes = True
