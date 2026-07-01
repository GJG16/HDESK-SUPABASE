
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Numeric, TIMESTAMP, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pydantic import BaseModel, ConfigDict, model_validator
from typing import Optional
from datetime import datetime
from database import Base

# ==========================================
# PARADIGMA ORIENTADO A OBJETOS (SQLAlchemy)
# ==========================================

class DepartamentoNegocio(Base):
    """Departamento de negocio (origen del problema): Marketing, Ventas, ATC, etc."""
    __tablename__ = "tb_departamentos_negocio"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    descripcion = Column(Text, nullable=True)
    activo = Column(Boolean, default=True, nullable=False)

    usuarios = relationship("Usuario", back_populates="departamento")
    tickets_origen = relationship("Ticket", back_populates="departamento_origen")


class AreaTecnica(Base):
    """Área técnica (destino del soporte): Redes, Hardware, Software, etc."""
    __tablename__ = "areas_tecnicas"

    id = Column(Integer, primary_key=True, index=True)
    nombre_area = Column(String(100), unique=True, nullable=False)
    descripcion = Column(Text, nullable=True)
    activa = Column(Boolean, default=True, nullable=False)

    tickets = relationship("Ticket", back_populates="area")
    tecnicos = relationship("Usuario", back_populates="area_tecnica")
    palabras_clave = relationship("PalabraClaveTriaje", back_populates="area_tecnica", cascade="all, delete-orphan")


class PalabraClaveTriaje(Base):
    """Palabras clave dinámicas para el motor de triaje inteligente."""
    __tablename__ = "tb_palabras_clave_triaje"

    id = Column(Integer, primary_key=True, index=True)
    palabra = Column(String(50), unique=True, nullable=False)
    id_area_tecnica = Column(Integer, ForeignKey("areas_tecnicas.id", ondelete="CASCADE"), nullable=False)

    area_tecnica = relationship("AreaTecnica", back_populates="palabras_clave")


class Usuario(Base):
    """Usuario del sistema con roles: Administrador, Operador, Tecnico."""
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(String(50), nullable=False)
    especialidad = Column(String(100), nullable=True)

    # Relaciones condicionales por rol
    id_departamento = Column(Integer, ForeignKey("tb_departamentos_negocio.id"), nullable=True)
    id_area_tecnica = Column(Integer, ForeignKey("areas_tecnicas.id"), nullable=True)

    # Estado
    activo = Column(Boolean, default=True, nullable=False)
    ultimo_acceso = Column(TIMESTAMP(timezone=True), nullable=True)

    # Relationships
    departamento = relationship("DepartamentoNegocio", back_populates="usuarios")
    area_tecnica = relationship("AreaTecnica", back_populates="tecnicos")
    tickets_creados = relationship("Ticket", back_populates="operador", foreign_keys='Ticket.id_operador_creador')
    tickets_asignados = relationship("Ticket", back_populates="especialista", foreign_keys='Ticket.id_especialista')


class Ticket(Base):
    """Ticket de soporte técnico con trazabilidad de origen."""
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=False)
    estado = Column(String(50), default="Pendiente", nullable=False)
    criticidad = Column(String(50), nullable=False)
    tipo_solicitud = Column(String(50), default="Incidente", nullable=False)

    id_area = Column(Integer, ForeignKey("areas_tecnicas.id"), nullable=True)
    id_operador_creador = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    id_especialista = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    id_departamento_origen = Column(Integer, ForeignKey("tb_departamentos_negocio.id"), nullable=True)

    comentario_resolucion = Column(Text, nullable=True)
    fecha_creacion = Column(TIMESTAMP(timezone=True), server_default=func.now())
    fecha_actualizacion = Column(TIMESTAMP(timezone=True), nullable=True)
    fecha_resolucion = Column(TIMESTAMP(timezone=True), nullable=True)
    tiempo_resolucion_horas = Column(Numeric(5, 2), nullable=True)
    version = Column(Integer, default=1, nullable=False)

    # Relationships
    area = relationship("AreaTecnica", back_populates="tickets")
    operador = relationship("Usuario", back_populates="tickets_creados", foreign_keys=[id_operador_creador])
    especialista = relationship("Usuario", back_populates="tickets_asignados", foreign_keys=[id_especialista])
    departamento_origen = relationship("DepartamentoNegocio", back_populates="tickets_origen")
    historial = relationship("HistorialTicket", back_populates="ticket", order_by="HistorialTicket.fecha")
    comentarios = relationship("ComentarioTicket", back_populates="ticket", order_by="ComentarioTicket.fecha")


class Auditoria(Base):
    """Registro general de auditoría del sistema."""
    __tablename__ = "auditoria"

    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    accion = Column(String(100), nullable=False)
    entidad = Column(String(100), nullable=False)
    detalle = Column(Text, nullable=True)
    fecha = Column(TIMESTAMP(timezone=True), server_default=func.now())

    usuario = relationship("Usuario")


class HistorialTicket(Base):
    """Historial de cambios de estado de un ticket (Mejora 5: Trazabilidad)."""
    __tablename__ = "tb_historial_tickets"

    id = Column(Integer, primary_key=True, index=True)
    id_ticket = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    id_usuario = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    estado_anterior = Column(String(50), nullable=True)
    estado_nuevo = Column(String(50), nullable=True)
    comentario = Column(Text, nullable=True)
    fecha = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    ticket = relationship("Ticket", back_populates="historial")
    usuario = relationship("Usuario")


class ComentarioTicket(Base):
    """Comentario en un ticket (hilo de conversación tipo Zendesk)."""
    __tablename__ = "tb_comentarios_tickets"

    id = Column(Integer, primary_key=True, index=True)
    id_ticket = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    id_usuario = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    contenido = Column(Text, nullable=False)
    es_nota_interna = Column(Boolean, default=False, nullable=False)
    fecha = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    ticket = relationship("Ticket", back_populates="comentarios")
    usuario = relationship("Usuario")


# ─── Fase 3: Helpdesk Enterprise ─────────────────────────────

class Macro(Base):
    """Respuestas predefinidas / Macros para técnicos."""
    __tablename__ = "tb_macros"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(150), nullable=False)
    contenido = Column(Text, nullable=False)
    id_area_tecnica = Column(Integer, ForeignKey("areas_tecnicas.id", ondelete="SET NULL"), nullable=True) # Si es null, es global
    activo = Column(Boolean, default=True, nullable=False)

    area_tecnica = relationship("AreaTecnica")


class ArticuloKB(Base):
    """Base de Conocimientos (Knowledge Base) para autoservicio."""
    __tablename__ = "tb_articulos_kb"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(200), nullable=False)
    contenido = Column(Text, nullable=False)
    id_area_tecnica = Column(Integer, ForeignKey("areas_tecnicas.id", ondelete="SET NULL"), nullable=True)
    vistas = Column(Integer, default=0, nullable=False)
    util = Column(Integer, default=0, nullable=False)
    no_util = Column(Integer, default=0, nullable=False)
    fecha_creacion = Column(TIMESTAMP(timezone=True), server_default=func.now())
    fecha_actualizacion = Column(TIMESTAMP(timezone=True), nullable=True, onupdate=func.now())

    area_tecnica = relationship("AreaTecnica")


class CalificacionCSAT(Base):
    """Customer Satisfaction Score (CSAT)."""
    __tablename__ = "tb_csat"

    id = Column(Integer, primary_key=True, index=True)
    id_ticket = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"), unique=True, nullable=False)
    id_usuario = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True) # Quien califica
    calificacion = Column(Integer, nullable=False) # 1 a 5 estrellas
    comentario = Column(Text, nullable=True)
    fecha = Column(TIMESTAMP(timezone=True), server_default=func.now())

    ticket = relationship("Ticket")
    usuario = relationship("Usuario")


class Adjunto(Base):
    """Archivos adjuntos (imágenes, pdfs, logs)."""
    __tablename__ = "tb_adjuntos"

    id = Column(Integer, primary_key=True, index=True)
    id_ticket = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    id_comentario = Column(Integer, ForeignKey("tb_comentarios_tickets.id", ondelete="CASCADE"), nullable=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    nombre_archivo = Column(String(255), nullable=False)
    ruta_archivo = Column(String(500), nullable=False)
    tipo_mime = Column(String(100), nullable=False)
    tamano_bytes = Column(Integer, nullable=False)
    fecha_subida = Column(TIMESTAMP(timezone=True), server_default=func.now())

    ticket = relationship("Ticket")
    comentario = relationship("ComentarioTicket")
    usuario = relationship("Usuario")


# ==========================================
# ESQUEMAS PYDANTIC (Serialización / Validación)
# ==========================================

# ─── Departamentos ────────────────────────

class DepartamentoResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str]
    activo: bool

    model_config = ConfigDict(from_attributes=True)


# ─── Áreas ────────────────────────────────

class AreaResponse(BaseModel):
    id: int
    nombre_area: str
    descripcion: Optional[str]
    activa: bool

    model_config = ConfigDict(from_attributes=True)


class PalabraClaveCreate(BaseModel):
    palabra: str
    id_area_tecnica: int

class PalabraClaveResponse(BaseModel):
    id: int
    palabra: str
    id_area_tecnica: int
    nombre_area: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ─── Usuarios ─────────────────────────────

class UsuarioCreate(BaseModel):
    """Schema para creación de usuario por el ADMIN."""
    nombre: str
    email: str
    password: str
    rol: str  # 'Operador', 'Tecnico', 'Administrador'
    especialidad: Optional[str] = None
    id_departamento: Optional[int] = None
    id_area_tecnica: Optional[int] = None

    @model_validator(mode='after')
    def validate_rol_fields(self):
        """Valida campos obligatorios según el rol."""
        if self.rol == 'Operador' and not self.id_departamento:
            raise ValueError('El campo id_departamento es obligatorio para el rol Operador')
        if self.rol == 'Tecnico' and not self.id_area_tecnica:
            raise ValueError('El campo id_area_tecnica es obligatorio para el rol Tecnico')
        if self.rol not in ('Operador', 'Tecnico', 'Administrador'):
            raise ValueError('Rol inválido. Debe ser: Operador, Tecnico o Administrador')
        return self


class UsuarioResponse(BaseModel):
    id: int
    nombre: str
    email: str
    rol: str
    especialidad: Optional[str] = None
    id_departamento: Optional[int] = None
    id_area_tecnica: Optional[int] = None
    nombre_departamento: Optional[str] = None
    nombre_area_tecnica: Optional[str] = None
    activo: bool
    ultimo_acceso: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ─── Autenticación ────────────────────────

class LoginModel(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    mensaje: str
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioResponse


# ─── Tickets ──────────────────────────────

class TicketCreate(BaseModel):
    titulo: str
    descripcion: str
    criticidad: str
    tipo_solicitud: str = "Incidente"
    id_operador_creador: Optional[int] = None

class TicketPatch(BaseModel):
    estado: Optional[str] = None
    comentario_resolucion: Optional[str] = None
    id_especialista: Optional[int] = None
    tiempo_resolucion_horas: Optional[float] = None
    version: Optional[int] = None

class TicketResponse(BaseModel):
    id: int
    titulo: str
    descripcion: str
    estado: str
    criticidad: str
    tipo_solicitud: str
    id_area: Optional[int] = None
    id_operador_creador: Optional[int] = None
    id_especialista: Optional[int] = None
    id_departamento_origen: Optional[int] = None
    comentario_resolucion: Optional[str] = None
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None
    fecha_resolucion: Optional[datetime] = None
    tiempo_resolucion_horas: Optional[float] = None
    version: int
    # Nombres de relaciones (se llenan en el endpoint)
    nombre_area: Optional[str] = None
    nombre_operador: Optional[str] = None
    nombre_especialista: Optional[str] = None
    nombre_departamento_origen: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ─── Historial de Tickets (Mejora 5) ─────

class HistorialTicketResponse(BaseModel):
    id: int
    id_ticket: int
    id_usuario: Optional[int] = None
    nombre_usuario: Optional[str] = None
    estado_anterior: Optional[str] = None
    estado_nuevo: Optional[str] = None
    comentario: Optional[str] = None
    fecha: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Comentarios de Tickets ──────────────

class ComentarioCreate(BaseModel):
    contenido: str
    es_nota_interna: bool = False
    id_usuario: Optional[int] = None

class ComentarioResponse(BaseModel):
    id: int
    id_ticket: int
    id_usuario: Optional[int] = None
    nombre_usuario: Optional[str] = None
    contenido: str
    es_nota_interna: bool
    fecha: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Auditoría ────────────────────────────

class AuditoriaResponse(BaseModel):
    id: int
    id_usuario: Optional[int] = None
    accion: str
    entidad: str
    detalle: Optional[str] = None
    fecha: datetime
    nombre_usuario: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ─── Métricas ─────────────────────────────

class MetricasResponse(BaseModel):
    area_id: int
    tiempo_promedio_horas: float

# ─── Fase 3: Pydantic Schemas ────────────────

class MacroCreate(BaseModel):
    titulo: str
    contenido: str
    id_area_tecnica: Optional[int] = None

class MacroResponse(BaseModel):
    id: int
    titulo: str
    contenido: str
    id_area_tecnica: Optional[int] = None
    activo: bool

    model_config = ConfigDict(from_attributes=True)

class ArticuloKBCreate(BaseModel):
    titulo: str
    contenido: str
    id_area_tecnica: Optional[int] = None

class ArticuloKBResponse(BaseModel):
    id: int
    titulo: str
    contenido: str
    id_area_tecnica: Optional[int] = None
    vistas: int
    util: int
    no_util: int
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class CSATCreate(BaseModel):
    calificacion: int # 1-5
    comentario: Optional[str] = None
    id_usuario: Optional[int] = None

class CSATResponse(BaseModel):
    id: int
    id_ticket: int
    id_usuario: Optional[int] = None
    calificacion: int
    comentario: Optional[str] = None
    fecha: datetime

    model_config = ConfigDict(from_attributes=True)

class AdjuntoResponse(BaseModel):
    id: int
    id_ticket: int
    id_comentario: Optional[int] = None
    id_usuario: Optional[int] = None
    nombre_archivo: str
    ruta_archivo: str
    tipo_mime: str
    tamano_bytes: int
    fecha_subida: datetime

    model_config = ConfigDict(from_attributes=True)
