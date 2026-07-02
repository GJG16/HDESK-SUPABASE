# Modelado de Clases — Paradigma Orientado a Objetos (POO)

## Sistema Helpdesk Multiparadigma v2.1

---

## 1. Diagrama de Clases — Entidades Principales del Dominio

```mermaid
classDiagram
    direction TB

    class Base {
        <<SQLAlchemy DeclarativeBase>>
    }

    class DepartamentoNegocio {
        <<Entity>>
        +int id
        +String nombre
        +Text descripcion
        +Boolean activo
        ──────────────────
        +List~Usuario~ usuarios
        +List~Ticket~ tickets_origen
    }

    class AreaTecnica {
        <<Entity>>
        +int id
        +String nombre_area
        +Text descripcion
        +Boolean activa
        ──────────────────
        +List~Ticket~ tickets
        +List~Usuario~ tecnicos
        +List~PalabraClaveTriaje~ palabras_clave
    }

    class PalabraClaveTriaje {
        <<Entity>>
        +int id
        +String palabra
        +int id_area_tecnica
        ──────────────────
        +AreaTecnica area_tecnica
    }

    class Usuario {
        <<Entity>>
        +int id
        +String nombre
        +String email
        +String password_hash
        +String rol
        +String especialidad
        +int id_departamento
        +int id_area_tecnica
        +Boolean activo
        +Timestamp ultimo_acceso
        ──────────────────
        +DepartamentoNegocio departamento
        +AreaTecnica area_tecnica
        +List~Ticket~ tickets_creados
        +List~Ticket~ tickets_asignados
    }

    class Ticket {
        <<Entity>>
        +int id
        +String titulo
        +Text descripcion
        +String estado
        +String criticidad
        +String tipo_solicitud
        +int id_area
        +int id_operador_creador
        +int id_especialista
        +int id_departamento_origen
        +Text comentario_resolucion
        +Timestamp fecha_creacion
        +Timestamp fecha_actualizacion
        +Timestamp fecha_resolucion
        +Numeric tiempo_resolucion_horas
        +int version
        ──────────────────
        +AreaTecnica area
        +Usuario operador
        +Usuario especialista
        +DepartamentoNegocio departamento_origen
        +List~HistorialTicket~ historial
        +List~ComentarioTicket~ comentarios
    }

    class Auditoria {
        <<Entity>>
        +int id
        +int id_usuario
        +String accion
        +String entidad
        +Text detalle
        +Timestamp fecha
        ──────────────────
        +Usuario usuario
    }

    Base <|-- DepartamentoNegocio
    Base <|-- AreaTecnica
    Base <|-- PalabraClaveTriaje
    Base <|-- Usuario
    Base <|-- Ticket
    Base <|-- Auditoria

    DepartamentoNegocio "1" --> "0..*" Usuario : pertenece
    DepartamentoNegocio "1" --> "0..*" Ticket : origina
    AreaTecnica "1" --> "0..*" Usuario : asignado
    AreaTecnica "1" --> "0..*" Ticket : atiende
    AreaTecnica "1" *-- "0..*" PalabraClaveTriaje : contiene
    Usuario "1" --> "0..*" Ticket : crea (operador)
    Usuario "1" --> "0..*" Ticket : resuelve (especialista)
    Usuario "1" --> "0..*" Auditoria : genera
```

### Descripción de las Clases Principales

| Clase | Tabla | Descripción |
|-------|-------|-------------|
| **DepartamentoNegocio** | `tb_departamentos_negocio` | Departamento de negocio que origina el problema (Marketing, Ventas, ATC, Operaciones, RRHH). Cada departamento tiene usuarios y tickets asociados. |
| **AreaTecnica** | `areas_tecnicas` | Área técnica destino del soporte (Redes, Hardware, Software, Soporte General, Seguridad). Contiene técnicos especializados y palabras clave para el triaje automático. |
| **PalabraClaveTriaje** | `tb_palabras_clave_triaje` | Palabras clave dinámicas utilizadas por el motor de triaje inteligente para clasificar tickets automáticamente según su descripción. Relación de composición con `AreaTecnica` (cascade delete). |
| **Usuario** | `usuarios` | Usuario del sistema con tres roles posibles: **Administrador** (gestión total), **Operador** (crea tickets, requiere departamento) y **Técnico** (resuelve tickets, requiere área técnica). Incluye autenticación con contraseña encriptada (bcrypt). |
| **Ticket** | `tickets` | Ticket de soporte técnico. Entidad central del sistema con trazabilidad completa: estados (Pendiente → En Proceso → Resuelto), criticidad (Baja/Media/Alta/Critica), control de concurrencia optimista mediante campo `version`, y cálculo automático del tiempo de resolución. |
| **Auditoria** | `auditoria` | Registro inmutable de todas las acciones realizadas en el sistema (creación de tickets, cambios de estado, gestión de usuarios), garantizando la trazabilidad completa. |

---

## 2. Diagrama de Clases — Entidades de Soporte y Trazabilidad

```mermaid
classDiagram
    direction TB

    class Ticket {
        <<Entity - Referencia>>
        +int id
        +String titulo
        +String estado
        +String criticidad
    }

    class HistorialTicket {
        <<Entity>>
        +int id
        +int id_ticket
        +int id_usuario
        +String estado_anterior
        +String estado_nuevo
        +Text comentario
        +Timestamp fecha
        ──────────────────
        +Ticket ticket
        +Usuario usuario
    }

    class ComentarioTicket {
        <<Entity>>
        +int id
        +int id_ticket
        +int id_usuario
        +Text contenido
        +Boolean es_nota_interna
        +Timestamp fecha
        ──────────────────
        +Ticket ticket
        +Usuario usuario
    }

    class CalificacionCSAT {
        <<Entity>>
        +int id
        +int id_ticket
        +int id_usuario
        +int calificacion
        +Text comentario
        +Timestamp fecha
        ──────────────────
        +Ticket ticket
        +Usuario usuario
    }

    class Adjunto {
        <<Entity>>
        +int id
        +int id_ticket
        +int id_comentario
        +int id_usuario
        +String nombre_archivo
        +String ruta_archivo
        +String tipo_mime
        +int tamano_bytes
        +Timestamp fecha_subida
        ──────────────────
        +Ticket ticket
        +ComentarioTicket comentario
        +Usuario usuario
    }

    class Macro {
        <<Entity>>
        +int id
        +String titulo
        +Text contenido
        +int id_area_tecnica
        +Boolean activo
        ──────────────────
        +AreaTecnica area_tecnica
    }

    class ArticuloKB {
        <<Entity>>
        +int id
        +String titulo
        +Text contenido
        +int id_area_tecnica
        +int vistas
        +int util
        +int no_util
        +Timestamp fecha_creacion
        +Timestamp fecha_actualizacion
        ──────────────────
        +AreaTecnica area_tecnica
    }

    Ticket "1" *-- "0..*" HistorialTicket : timeline
    Ticket "1" *-- "0..*" ComentarioTicket : conversación
    Ticket "1" *-- "0..1" CalificacionCSAT : satisfacción
    Ticket "1" *-- "0..*" Adjunto : archivos
    ComentarioTicket "1" --> "0..*" Adjunto : adjuntos
```

### Descripción de las Clases de Soporte

| Clase | Tabla | Descripción |
|-------|-------|-------------|
| **HistorialTicket** | `tb_historial_tickets` | Línea de tiempo (timeline) que registra cada transición de estado de un ticket. Permite auditar quién cambió qué y cuándo, incluyendo comentarios opcionales en cada transición. |
| **ComentarioTicket** | `tb_comentarios_tickets` | Hilo de conversación del ticket (estilo Zendesk). Soporta comentarios públicos y notas internas visibles solo para el equipo técnico. |
| **CalificacionCSAT** | `tb_csat` | Customer Satisfaction Score. Calificación del 1 al 5 que el usuario asigna a un ticket resuelto. Relación 1:1 con Ticket (un ticket solo puede ser calificado una vez). |
| **Adjunto** | `tb_adjuntos` | Archivos adjuntos (imágenes, PDFs, logs) asociados a tickets o comentarios específicos. Soporta almacenamiento en Supabase Storage con fallback local. Validación de tipo MIME y tamaño máximo de 10 MB. |
| **Macro** | `tb_macros` | Respuestas predefinidas para técnicos. Pueden ser globales (sin área) o específicas de un área técnica, agilizando la resolución de tickets recurrentes. |
| **ArticuloKB** | `tb_articulos_kb` | Base de Conocimientos (Knowledge Base) para autoservicio. Artículos categorizados por área técnica con métricas de utilidad (vistas, útil/no útil). |

---

## 3. Diagrama de Clases — Capa de Servicios y Core

```mermaid
classDiagram
    direction LR

    class TicketService {
        <<Service>>
        +enriquecer_ticket(ticket, db) dict
        +registrar_auditoria(db, id_usuario, accion, entidad, detalle) void
        +registrar_historial_ticket(db, id_ticket, id_usuario, estado_ant, estado_nuevo, comentario) void
        +motor_de_triaje(descripcion, db) tuple
        +revisar_escalamientos_sla() void
    }

    class UserService {
        <<Service>>
        +enriquecer_usuario(usuario) dict
    }

    class AnalyticsService {
        <<Service>>
        +generar_mapa_calor_departamentos(db) dict
        +generar_forecasting_picos(db) dict
        +generar_reporte_rendimiento(db) dict
        +generar_reporte_dashboard(db) dict
    }

    class Security {
        <<Core>>
        -str SECRET_KEY
        -str ALGORITHM
        +OAuth2PasswordBearer oauth2_scheme
        +hash_password(password) str
        +verify_password(plain, hashed) bool
        +create_access_token(data, expires) str
        +get_current_user(token, db) Usuario
        +get_current_admin(usuario) Usuario
        +require_role(*roles) Callable
    }

    class ConnectionManager {
        <<WebSocket>>
        +Dict active_connections
        +connect(websocket, ticket_id) void
        +disconnect(websocket, ticket_id) void
        +send_message_to_ticket(ticket_id, message) void
    }

    class SupabaseClient {
        <<Core>>
        +str SUPABASE_URL
        +str SUPABASE_KEY
        +Client supabase
    }

    TicketService ..> Ticket : opera sobre
    TicketService ..> Auditoria : registra
    TicketService ..> HistorialTicket : registra
    TicketService ..> PalabraClaveTriaje : consulta
    TicketService ..> Usuario : busca especialista
    UserService ..> Usuario : enriquece
    AnalyticsService ..> Ticket : analiza
    AnalyticsService ..> DepartamentoNegocio : agrupa
    Security ..> Usuario : autentica
    ConnectionManager ..> Ticket : notifica cambios

    class Ticket {
        <<Entity>>
    }
    class Usuario {
        <<Entity>>
    }
    class Auditoria {
        <<Entity>>
    }
    class HistorialTicket {
        <<Entity>>
    }
    class PalabraClaveTriaje {
        <<Entity>>
    }
    class DepartamentoNegocio {
        <<Entity>>
    }
```

### Descripción de Servicios y Core

| Clase | Módulo | Responsabilidad |
|-------|--------|-----------------|
| **TicketService** | `services/ticket_service.py` | Lógica de negocio central: enriquecimiento de tickets con datos de relaciones, motor de triaje inteligente basado en palabras clave, registro de auditoría y historial, y escalamiento automático de SLA (cron cada 15 min). |
| **UserService** | `services/user_service.py` | Enriquecimiento de objetos Usuario con nombres de departamento y área técnica para las respuestas de la API. |
| **AnalyticsService** | `services/analytics_service.py` | Generación de reportes analíticos: mapa de calor por departamentos, forecasting de picos horarios, métricas de rendimiento por área (promedio, mediana, desviación estándar), y dashboard general. |
| **Security** | `core/security.py` | Autenticación y autorización: encriptación de contraseñas con bcrypt, generación y validación de tokens JWT (HS256), middleware de roles (Admin, Operador, Técnico). |
| **ConnectionManager** | `routers/ws.py` | Gestor de conexiones WebSocket en tiempo real. Mantiene un mapa de ticket_id → lista de WebSockets conectados para notificaciones instantáneas de cambios y nuevos comentarios. |
| **SupabaseClient** | `core/supabase_client.py` | Cliente de Supabase para almacenamiento de archivos adjuntos en la nube (Storage). Inicialización condicional basada en variables de entorno. |

---

## 4. Diagrama de Arquitectura por Capas

```mermaid
classDiagram
    direction TB

    class CapaPresentacion {
        <<Routers API REST>>
        AuthRouter: POST /auth/login
        TicketsRouter: CRUD /tickets/
        UsuariosRouter: GET /usuarios/
        AdminUsuariosRouter: POST-PATCH /admin/usuarios/
        ReportesRouter: GET /reportes/
        ConfiguracionRouter: GET-POST /config/
        WSRouter: WS /ws/ticket/
    }

    class CapaLogicaNegocio {
        <<Services>>
        TicketService: triaje, auditoría, SLA
        UserService: enriquecimiento
        AnalyticsService: reportes y métricas
    }

    class CapaTransversal {
        <<Core>>
        Security: JWT + bcrypt + roles
        ConnectionManager: WebSocket real-time
        SupabaseClient: Storage en la nube
    }

    class CapaDatos {
        <<Models + Database>>
        12 Entidades SQLAlchemy ORM
        22 Esquemas Pydantic
        Database: Engine + SessionLocal
    }

    CapaPresentacion --> CapaLogicaNegocio : usa servicios
    CapaPresentacion --> CapaTransversal : seguridad y WS
    CapaLogicaNegocio --> CapaDatos : accede a datos
    CapaTransversal --> CapaDatos : consulta usuarios
```

### Flujo de Dependencias

| Capa | Componentes | Dirección |
|------|-------------|-----------|
| **Presentación** | 7 Routers (auth, tickets, usuarios, admin, reportes, config, ws) | → Servicios, Core |
| **Lógica de Negocio** | TicketService, UserService, AnalyticsService | → Datos |
| **Transversal (Core)** | Security, ConnectionManager, SupabaseClient | → Datos |
| **Datos** | 12 Entidades ORM, 22 Schemas Pydantic, Database config | Base |

---

## 5. Principios POO Aplicados

| Principio | Implementación en el Sistema |
|-----------|------------------------------|
| **Encapsulamiento** | Cada clase ORM encapsula sus atributos y relaciones. Los servicios encapsulan la lógica de negocio separándola de los routers. La clave JWT `SECRET_KEY` es privada en `Security`. |
| **Herencia** | Las 12 entidades heredan de `Base` (SQLAlchemy DeclarativeBase). Los 22 esquemas Pydantic heredan de `BaseModel`. |
| **Polimorfismo** | El campo `rol` en `Usuario` determina el comportamiento: Operador (crea tickets), Técnico (resuelve tickets), Administrador (gestión total). El método `require_role(*roles)` genera dependencias polimórficas. |
| **Abstracción** | La capa de servicios abstrae la complejidad del triaje, auditoría y analytics. Los routers solo invocan métodos de servicio sin conocer la implementación interna. |
| **Composición** | `Ticket` se compone de `HistorialTicket`, `ComentarioTicket`, `Adjunto` y `CalificacionCSAT` (cascade delete). `AreaTecnica` se compone de `PalabraClaveTriaje`. |
| **Asociación** | `Usuario` se asocia con `DepartamentoNegocio` y `AreaTecnica`. `Ticket` se asocia con `Usuario` (operador y especialista) y `AreaTecnica`. |

---

## 6. Patrones de Diseño Utilizados

| Patrón | Dónde se aplica |
|--------|-----------------|
| **Repository** | SQLAlchemy ORM actúa como repositorio, abstrayendo el acceso a la BD PostgreSQL/Supabase. |
| **Dependency Injection** | FastAPI inyecta dependencias (`Depends(get_db)`, `Depends(get_current_user)`) en cada endpoint. |
| **Factory** | `require_role(*roles)` es una función factory que genera dependencias de autorización parametrizadas. |
| **Observer** | `ConnectionManager` implementa el patrón Observer para WebSockets: cuando un ticket cambia, notifica a todos los clientes suscritos. |
| **Strategy** | El motor de triaje aplica diferentes estrategias de asignación según las palabras clave detectadas en la descripción del ticket. |
| **Optimistic Locking** | El campo `version` en `Ticket` implementa control de concurrencia optimista para evitar conflictos de escritura simultánea. |
