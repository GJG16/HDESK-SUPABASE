-- ============================================================
-- Schema de la Base de Datos — Helpdesk Multiparadigma v2.0
-- Conecta Soluciones BPO
-- 5 Mejoras Estructurales
-- ============================================================

-- ─── Tabla de Departamentos de Negocio (Mejora 1) ───────────
-- Origen del problema: el departamento del operador que reporta la falla
CREATE TABLE tb_departamentos_negocio (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- ─── Tabla de Áreas Técnicas ────────────────────────────────
-- Destino del soporte: el área técnica que resuelve el problema
CREATE TABLE areas_tecnicas (
    id SERIAL PRIMARY KEY,
    nombre_area VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

-- ─── Tabla de Usuarios (Mejora 1 + 2 + 4) ──────────────────
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL CHECK (rol IN ('Operador', 'Tecnico', 'Administrador')),
    especialidad VARCHAR(100),
    extension VARCHAR(20),
    -- Relaciones condicionales por rol
    id_departamento INTEGER REFERENCES tb_departamentos_negocio(id) ON DELETE SET NULL,
    id_area_tecnica INTEGER REFERENCES areas_tecnicas(id) ON DELETE SET NULL,
    -- Estado y auditoría
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso TIMESTAMP WITH TIME ZONE
);

-- ─── Tabla de Tickets (Mejora 1 + 5) ───────────────────────
CREATE TABLE tickets (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'En Proceso', 'Resuelto', 'Cancelado')),
    criticidad VARCHAR(50) NOT NULL CHECK (criticidad IN ('Baja', 'Media', 'Alta', 'Critica')),
    tipo_solicitud VARCHAR(50) NOT NULL DEFAULT 'Incidente' CHECK (tipo_solicitud IN ('Incidente', 'Peticion')),
    id_area INTEGER REFERENCES areas_tecnicas(id) ON DELETE SET NULL,
    id_operador_creador INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    id_especialista INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    -- Trazabilidad de origen (Mejora 1)
    id_departamento_origen INTEGER REFERENCES tb_departamentos_negocio(id) ON DELETE SET NULL,
    comentario_resolucion TEXT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE,
    fecha_resolucion TIMESTAMP WITH TIME ZONE,
    tiempo_resolucion_horas NUMERIC(5, 2),
    version INTEGER NOT NULL DEFAULT 1
);

-- ─── Tabla de Auditoría General ─────────────────────────────
CREATE TABLE auditoria (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    accion VARCHAR(100) NOT NULL,
    entidad VARCHAR(100) NOT NULL,
    detalle TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── Tabla de Historial de Tickets (Mejora 5) ──────────────
-- Registra cada cambio de estado para trazabilidad y timeline
CREATE TABLE tb_historial_tickets (
    id SERIAL PRIMARY KEY,
    id_ticket INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    id_usuario INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50),
    comentario TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Índices para rendimiento
-- ============================================================

CREATE INDEX idx_tickets_estado ON tickets(estado);
CREATE INDEX idx_tickets_criticidad ON tickets(criticidad);
CREATE INDEX idx_tickets_id_area ON tickets(id_area);
CREATE INDEX idx_tickets_id_especialista ON tickets(id_especialista);
CREATE INDEX idx_tickets_fecha_creacion ON tickets(fecha_creacion);
CREATE INDEX idx_tickets_depto_origen ON tickets(id_departamento_origen);
CREATE INDEX idx_auditoria_fecha ON auditoria(fecha);
CREATE INDEX idx_historial_ticket ON tb_historial_tickets(id_ticket);
CREATE INDEX idx_historial_fecha ON tb_historial_tickets(fecha);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_usuarios_activo ON usuarios(activo);

-- ============================================================
-- Datos iniciales (seed)
-- ============================================================

-- Departamentos de Negocio (origen de los problemas)
INSERT INTO tb_departamentos_negocio (nombre, descripcion) VALUES
('Marketing', 'Departamento de Marketing y Publicidad'),
('Ventas', 'Departamento de Ventas Comerciales'),
('ATC', 'Atención al Cliente'),
('Operaciones', 'Departamento de Operaciones'),
('Recursos Humanos', 'Departamento de RRHH');

-- Áreas Técnicas (destino del soporte)
INSERT INTO areas_tecnicas (nombre_area, descripcion) VALUES
('Redes y Conectividad', 'Problemas de red, internet, VPN, WiFi'),
('Hardware y Periféricos', 'Equipos, pantallas, teclados, impresoras'),
('Software y SO', 'Sistemas operativos, aplicaciones, errores de software'),
('Soporte General', 'Consultas generales y solicitudes diversas'),
('Seguridad', 'Parches de seguridad, accesos, certificados');

-- Usuarios (passwords se insertan desde seed.py con bcrypt)
-- Ver seed.py para la inserción real con hash
