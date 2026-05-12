# 🎟️ Helpdesk - Sistema de Gestión de Tickets Corporativo

Sistema integral de gestión de tickets (helpdesk) desarrollado con un stack tecnológico moderno, permitiendo la creación, seguimiento y resolución de incidentes en entornos corporativos.

## 📋 Tabla de Contenidos

- [Stack Tecnológico](#stack-tecnológico)
- [Requisitos Previos](#requisitos-previos)
- [Instalación y Configuración](#instalación-y-configuración)
- [Levantar Localmente](#levantar-localmente)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [APIs Disponibles](#apis-disponibles)
- [Gitflow](#gitflow)

---

## 🛠️ Stack Tecnológico

### Backend
- **Python 3.11+**: Lenguaje de programación principal
- **FastAPI**: Framework web asincrónico de alto rendimiento
- **Uvicorn**: Servidor ASGI para ejecutar FastAPI
- **Pydantic**: Validación de datos y esquemas
- **Motor**: Driver asincrónico para MongoDB
- **PyMongo**: Interacción con MongoDB

### Base de Datos
- **MongoDB 5.0+**: Base de datos NoSQL
  - URL local: `mongodb://localhost:27017/helpdesk_db`

### Frontend
- **Angular 19+**: Framework SPA moderno
- **TypeScript**: Tipado estático para JavaScript
- **Componentes Standalone**: Nueva arquitectura Angular
- **Angular Routing**: Sistema de ruteo integrado
- **HttpClient**: Cliente HTTP para consumir APIs

---

## 📦 Requisitos Previos

Asegúrate de tener instalado lo siguiente:

### Backend
```bash
# Python 3.11 o superior
python --version

# pip (gestor de paquetes de Python)
pip --version
```

### Base de Datos
```bash
# MongoDB debe estar corriendo en tu máquina
# Instalar desde: https://www.mongodb.com/try/download/community
# Verificar que MongoDB se ejecuta en el puerto 27017
```

### Frontend
```bash
# Node.js 18+ y npm
node --version
npm --version

# Angular CLI (opcional, pero recomendado)
npm install -g @angular/cli
```

---

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio

```bash
git clone https://github.com/GJG16/Helpdesk-nexacorp.git
cd Helpdesk-nexacorp
```

### 2. Configurar Backend

```bash
# Navegar a la carpeta del backend
cd backend

# Crear un entorno virtual
python -m venv venv

# Activar el entorno virtual
# En Windows:
venv\Scripts\activate
# En macOS/Linux:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Crear archivo .env (opcional)
cp .env.example .env
```

### 3. Configurar Frontend

```bash
# Navegar a la carpeta del frontend (desde la raíz del proyecto)
cd frontend

# Instalar dependencias
npm install
```

---

## 🏃 Levantar Localmente

### Prerequisitos de Ejecución

1. **MongoDB debe estar corriendo:**
   ```bash
   # En Windows (si está instalado como servicio, ya está corriendo)
   # En macOS/Linux:
   mongod
   ```

2. **Verificar conexión a MongoDB:**
   ```bash
   mongosh mongodb://localhost:27017
   ```

### Terminal 1: Ejecutar Backend

```bash
cd backend

# Activar entorno virtual
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

# Ejecutar FastAPI con Uvicorn
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# El servidor estará disponible en:
# http://localhost:8000
# Documentación interactiva (Swagger): http://localhost:8000/docs
# Documentación alternativa (ReDoc): http://localhost:8000/redoc
```

### Terminal 2: Ejecutar Frontend

```bash
cd frontend

# Ejecutar servidor de desarrollo Angular
ng serve --open

# O usando npm:
npm start

# El servidor estará disponible en:
# http://localhost:4200
```

### Terminal 3: Verificar MongoDB

```bash
# Conectarse a MongoDB para verificar que está funcionando
mongosh mongodb://localhost:27017

# Cambiar a la base de datos del proyecto
use helpdesk_db

# Verificar colecciones
show collections
```

---

## 📂 Estructura del Proyecto

```
helpdesk-nexacorp/
├── backend/
│   ├── config/
│   │   ├── __init__.py
│   │   └── settings.py           # Configuración de la aplicación
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py            # Esquemas Pydantic (User, Ticket)
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── status.py             # Rutas de estado
│   │   └── [otras rutas]         # Futuras rutas CRUD
│   ├── main.py                   # Punto de entrada de FastAPI
│   ├── database.py               # Configuración de MongoDB
│   ├── requirements.txt          # Dependencias de Python
│   ├── .env.example              # Plantilla de variables de entorno
│   └── __init__.py
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/       # Componentes Angular reutilizables
│   │   │   ├── services/
│   │   │   │   ├── ticket.service.ts  # Servicio para consumir API
│   │   │   │   └── index.ts
│   │   │   ├── models/
│   │   │   │   └── index.ts      # Interfaces TypeScript (User, Ticket)
│   │   │   ├── app.ts            # Componente raíz
│   │   │   ├── app.routes.ts     # Configuración de ruteo
│   │   │   └── app.config.ts     # Configuración de la app
│   │   ├── main.ts               # Punto de entrada
│   │   └── index.html
│   ├── package.json
│   ├── angular.json              # Configuración de Angular
│   └── README.md
│
├── .gitignore                    # Archivos ignorados por Git
├── README.md                     # Este archivo
└── LICENSE
```

---

## 🔌 APIs Disponibles

### Status Endpoints

#### GET `/api/status`
Verificar que el servidor está operativo.

**Response:**
```json
{
  "status": "online",
  "service": "Helpdesk API",
  "version": "1.0.0",
  "timestamp": "2024-05-11T10:30:00",
  "message": "Sistema de Gestión de Tickets operativo"
}
```

#### GET `/api/health`
Health check del servidor.

**Response:**
```json
{
  "status": "healthy",
  "service": "Helpdesk API"
}
```

### Tickets Endpoints (Próximos)
- `GET /api/tickets` - Obtener todos los tickets
- `GET /api/tickets/{id}` - Obtener ticket por ID
- `POST /api/tickets` - Crear nuevo ticket
- `PUT /api/tickets/{id}` - Actualizar ticket
- `DELETE /api/tickets/{id}` - Eliminar ticket
- `POST /api/tickets/filter` - Filtrar tickets

---

## 🌿 Gitflow

Este proyecto sigue el flujo **Gitflow**:

```
main (producción)
├── develop (integración)
│   ├── feature/sprint1-setup (desarrollo)
│   ├── feature/user-crud
│   ├── feature/ticket-crud
│   └── [otras features]
└── hotfix/* (parches de emergencia)
```

### Ramas Principales

- **main**: Código en producción, siempre estable
- **develop**: Integración de features, rama de pre-producción
- **feature/***: Ramas temporales para desarrollar nuevas funcionalidades

### Flujo de Trabajo

1. Crear rama de feature desde `develop`:
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```

2. Realizar cambios y commits:
   ```bash
   git add .
   git commit -m "feat: descripción de cambios"
   ```

3. Mergear a `develop`:
   ```bash
   git checkout develop
   git merge feature/nueva-funcionalidad
   git push origin develop
   ```

4. Para release a producción:
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

---

## 📝 Esquemas de Datos

### User
```typescript
{
  id?: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'agent' | 'user';
  fecha_creacion?: Date;
}
```

### Ticket
```typescript
{
  id?: string;
  titulo: string;
  descripcion: string;
  estado: 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado';
  usuario_id: string;
  fecha_creacion?: Date;
  fecha_actualizacion?: Date;
}
```

---

## 🔐 Variables de Entorno

Backend (`.env`):
```env
# MongoDB Configuration
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=helpdesk_db

# Server Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
DEBUG=False

# CORS Origins
CORS_ORIGINS=["http://localhost:4200", "http://localhost:3000"]
```

---

## 🧪 Pruebas

### Backend - Probar API con cURL
```bash
# Verificar status
curl http://localhost:8000/api/status

# Acceder a documentación interactiva
# Abre en navegador: http://localhost:8000/docs
```

### Frontend - Pruebas Unitarias
```bash
cd frontend
ng test
```

---

## 🐛 Troubleshooting

### MongoDB no se conecta
- Verificar que MongoDB está corriendo: `mongosh mongodb://localhost:27017`
- Confirmar la URL en `.env`: `mongodb://localhost:27017`

### CORS Error en Frontend
- Verificar que CORS está configurado correctamente en `backend/config/settings.py`
- Asegurar que la URL del frontend esté en `CORS_ORIGINS`

### Angular no se compila
```bash
cd frontend
npm install
ng build
```

### Puerto 8000 o 4200 en uso
```bash
# Cambiar puerto en backend (main.py):
uvicorn.run("main:app", host="0.0.0.0", port=8001)

# Cambiar puerto en frontend (angular.json):
"serve": {
  "options": {
    "port": 4201
  }
}
```

---

## 📞 Contacto y Contribución

- **Repositorio**: https://github.com/GJG16/Helpdesk-nexacorp
- **Issues**: Reportar problemas en la sección de Issues de GitHub

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo `LICENSE` para más detalles.

---

**Última actualización**: 11 de mayo de 2026
**Versión**: 1.0.0-alpha
