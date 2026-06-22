# 🎧 Helpdesk Multiparadigma — Conecta Soluciones BPO

Sistema de gestión de tickets de soporte técnico construido con una arquitectura **multiparadigma**, combinando Programación Orientada a Objetos, Lógica, Funcional y Ciencia de Datos.

---

## 📐 Arquitectura del Proyecto

```
PROYECTO HELPDESK/
├── database/          # Esquema SQL (PostgreSQL)
│   └── schema.sql
├── backend/           # API REST (Python + FastAPI)
│   ├── main.py        # Endpoints y motor de triaje
│   ├── models.py      # Modelos SQLAlchemy + Pydantic
│   ├── database.py    # Conexión a BD
│   ├── seed.py        # Datos iniciales
│   └── .env           # Variables de entorno (NO subir al repo)
└── frontend/          # SPA (Angular 17 + TailwindCSS)
    └── src/app/
        ├── core/      # Guards, Interceptors, Auth
        ├── features/  # Módulos por rol (Admin, Operador, Especialista)
        ├── models/    # Interfaces TypeScript
        ├── services/  # Servicios de datos
        └── shared/    # Pipes, componentes y utilidades compartidas
```

## 🧠 Paradigmas Implementados

| Paradigma | Ubicación | Implementación |
|---|---|---|
| **Orientado a Objetos** | `models.py` | Clases SQLAlchemy con herencia, relaciones y encapsulamiento |
| **Lógico / Deductivo** | `main.py` → `motor_de_triaje()` | Reglas condicionales que infieren área y técnico |
| **Funcional** | `main.py` → `GET /tickets/pendientes/criticos` | `filter()`, `map()`, `lambda` sobre colecciones |
| **Ciencia de Datos** | `main.py` → `GET /reportes/rendimiento` | Pandas DataFrames + Numpy para métricas estadísticas |

## 🔧 Tecnologías

### Backend
- **Python 3.11+**
- **FastAPI** — Framework async para APIs REST
- **SQLAlchemy 2.0** — ORM con patrón declarativo
- **Pandas / Numpy** — Análisis de datos y métricas
- **PostgreSQL** (Supabase)

### Frontend
- **Angular 17** — Framework SPA con Signals
- **TailwindCSS 3** — Framework de utilidades CSS
- **Chart.js** — Gráficos interactivos en reportes
- **TypeScript 5.4** — Tipado estático

## 🚀 Cómo Ejecutar

### Requisitos Previos
- Python 3.11+
- Node.js 18+
- PostgreSQL (o cuenta en Supabase)

### Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
venv\Scripts\activate    # Windows
# source venv/bin/activate  # Linux/Mac

# Instalar dependencias
pip install -r requirements.txt

# Configurar la base de datos
# Crear archivo .env con: DATABASE_URL="postgresql://..."

# Inicializar datos
python seed.py

# Ejecutar servidor
uvicorn main:app --reload --port 8000
```

La API estará en: `http://localhost:8000`  
Documentación Swagger: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo
ng serve
# o: npm start
```

La app estará en: `http://localhost:4200`

## 👥 Roles del Sistema

| Rol | Acceso | Funciones principales |
|---|---|---|
| **Administrador** | `/admin/*` | Dashboard global, gestión de tickets/usuarios, reportes, auditoría, configuración |
| **Operador** | `/operador/*` | Crear tickets, ver mis tickets, dashboard personal |
| **Especialista** | `/especialista/*` | Cola de trabajo, tomar/resolver tickets, dashboard técnico |

### Credenciales de Demo (Frontend)

| Rol | Email | Contraseña |
|---|---|---|
| Admin | `admin@conectabpo.co` | `admin123` |
| Operador | `operador@conectabpo.co` | `oper123` |
| Especialista | `tecnico@conectabpo.co` | `tech123` |

## 📡 Endpoints de la API

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/` | Health check + lista de endpoints |
| `POST` | `/auth/login` | Login por email |
| `GET` | `/tickets/` | Listar tickets (filtros: estado, criticidad, id_area) |
| `GET` | `/tickets/{id}` | Obtener ticket por ID |
| `POST` | `/tickets/triaje/` | Crear ticket con triaje automático |
| `PATCH` | `/tickets/{id}` | Actualizar estado/resolución |
| `DELETE` | `/tickets/{id}` | Eliminar ticket |
| `GET` | `/tickets/pendientes/criticos` | Filtrado funcional de urgentes |
| `GET` | `/areas/` | Listar áreas técnicas |
| `GET` | `/usuarios/` | Listar usuarios (filtro: rol) |
| `GET` | `/usuarios/{id}` | Obtener usuario por ID |
| `GET` | `/auditoria/` | Log de auditoría del sistema |
| `GET` | `/reportes/rendimiento` | Métricas por área (Pandas) |
| `GET` | `/reportes/dashboard` | Métricas generales del dashboard |

## 📄 Licencia

Proyecto académico — Conecta Soluciones BPO © 2026
