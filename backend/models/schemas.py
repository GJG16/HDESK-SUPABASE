from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    AGENT = "agent"
    USER = "user"

class UserBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    rol: UserRole = UserRole.USER

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    rol: Optional[UserRole] = None
    password: Optional[str] = Field(default=None, min_length=8)

class User(UserBase):
    id: Optional[str] = None
    activo: bool = True
    fecha_creacion: Optional[datetime] = None

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: User

class TicketStatus(str, Enum):
    ABIERTO = "abierto"
    EN_PROGRESO = "en_progreso"
    RESUELTO = "resuelto"
    CERRADO = "cerrado"


class Priority(str, Enum):
    BAJA = "baja"
    MEDIA = "media"
    ALTA = "alta"
    CRITICA = "critica"

class TicketBase(BaseModel):
    titulo: str = Field(..., min_length=5, max_length=200)
    descripcion: str = Field(..., min_length=10)
    estado: TicketStatus = TicketStatus.ABIERTO
    prioridad: Priority = Priority.MEDIA
    asignado_a: Optional[str] = None

class TicketCreate(TicketBase):
    usuario_id: Optional[str] = None


class TicketUpdate(BaseModel):
    titulo: Optional[str] = Field(default=None, min_length=5, max_length=200)
    descripcion: Optional[str] = Field(default=None, min_length=10)
    estado: Optional[TicketStatus] = None
    prioridad: Optional[Priority] = None
    asignado_a: Optional[str] = None


class TicketFilter(BaseModel):
    estado: Optional[TicketStatus] = None
    prioridad: Optional[Priority] = None
    usuario_id: Optional[str] = None
    asignado_a: Optional[str] = None
    fecha_desde: Optional[datetime] = None
    fecha_hasta: Optional[datetime] = None

class Ticket(TicketBase):
    id: Optional[str] = None
    usuario_id: str
    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None
    fecha_resolucion: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TicketCommentBase(BaseModel):
    texto: str = Field(..., min_length=1, max_length=1000)

class TicketCommentCreate(TicketCommentBase):
    pass

class TicketComment(TicketCommentBase):
    id: Optional[str] = None
    ticket_id: str
    usuario_id: str
    nombre_autor: Optional[str] = None
    rol_autor: Optional[UserRole] = None
    fecha_creacion: Optional[datetime] = None

    class Config:
        from_attributes = True


class AuditAction(str, Enum):
    DELETE_USER = "delete_user"
    DELETE_TICKET = "delete_ticket"


class AuditLog(BaseModel):
    id: Optional[str] = None
    action: AuditAction
    resource_type: str
    resource_id: str
    actor_admin_id: str
    actor_admin_nombre: Optional[str] = None
    resource_label: Optional[str] = None
    created_at: Optional[datetime] = None


class TicketReportByState(BaseModel):
    estado: str
    total: int


class TicketReportByAgent(BaseModel):
    asignado_a: str
    total: int


class TicketReport(BaseModel):
    total_tickets: int
    by_state: List[TicketReportByState]
    by_agent: List[TicketReportByAgent]
