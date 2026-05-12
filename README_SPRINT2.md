# 🎫 Helpdesk - Sistema de Gestión de Tickets Corporativo

> **Plataforma de gestión de tickets de soporte técnico construida con FastAPI, Angular, MongoDB y Docker.**

## 📋 Tabla de Contenidos

1. [Descripción del Proyecto](#-descripción-del-proyecto)
2. [Características Principales](#-características-principales)
3. [Stack Tecnológico](#-stack-tecnológico)
4. [Estructura del Proyecto](#-estructura-del-proyecto)
5. [Instalación y Configuración](#-instalación-y-configuración)
6. [Uso](#-uso)
7. [API Documentation](#-api-documentation)
8. [Testing](#-testing)
9. [Gitflow Workflow](#-gitflow-workflow)
10. [Contribución](#-contribución)

---

## 💡 Descripción del Proyecto

Sistema integral de gestión de tickets de helpdesk diseñado para empresas corporativas. Permite a usuarios reportar problemas técnicos, a agentes gestionarlos, y a administradores supervisar el sistema completo.

**Objetivos:**
- 🎯 Automatizar la gestión de tickets de soporte
- 👥 Control de acceso basado en roles (Admin, Agent, User)
- 📊 Seguimiento de tickets en tiempo real
- 🔒 Autenticación segura con JWT
- 📱 Interfaz responsive y moderna

---

## ✨ Características Principales

### Backend ✅
- **Autenticación Segura**: JWT con access y refresh tokens
- **Base de Datos Async**: Motor con MongoDB
- **CRUD Completo**: Usuarios, tickets con validación Pydantic
- **Filtrado Avanzado**: Por estado, prioridad, fecha, etc.
- **Tests**: Cobertura con pytest
- **API RESTful**: Swagger docs integrada

### Frontend ✅
- **Componentes Standalone**: Angular 19+ sin módulos
- **Autenticación**: Login, logout, token refresh automático
- **Protección de Rutas**: Guards por rol
- **Interceptor HTTP**: Inyección automática de tokens
- **UI Responsiva**: Diseño mobile-first
- **Validación**: Formularios reactivos con errores en tiempo real
- **Dashboard**: Estadísticas y resumen de tickets

---

## 🛠 Stack Tecnológico

### Backend
```
FastAPI 0.104.1          # Framework web async
Python 3.11+             # Lenguaje
MongoDB 5.0+             # Base de datos NoSQL
Motor 3.3.2              # Driver async para MongoDB
PyJWT 2.8.1              # Autenticación JWT
bcrypt 4.1.1             # Hashing de contraseñas
Pydantic 2.0+            # Validación de datos
pytest 7.4.3             # Testing
Uvicorn 0.24.0           # Servidor ASGI
```

### Frontend
```
Angular 19+              # Framework web
TypeScript 5.x           # Lenguaje
RxJS 7.x                 # Programación reactiva
Reactive Forms           # Validación de formularios
HTTP Client              # Comunicación con API
```

---

## 📁 Estructura del Proyecto

```
Helpdesk-nexacorp/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── security.py
│   ├── models/schemas.py
│   ├── routes/
│   │   ├── status.py
│   │   ├── auth.py
│   │   ├── usuarios.py
│   │   └── tickets.py
│   ├── tests.py
│   └── requirements.txt
├── frontend/
│   ├── src/app/
│   │   ├── app.ts
│   │   ├── app.routes.ts
│   │   ├── app.config.ts
│   │   ├── models/
│   │   ├── services/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   └── components/
│   └── package.json
└── README.md
```

---

## 🚀 Instalación y Configuración

### 1️⃣ Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### 2️⃣ Frontend Setup

```bash
cd frontend
npm install
ng serve --open
```

### 3️⃣ MongoDB

MongoDB se conecta automáticamente a `mongodb://localhost:27017/helpdesk_db`

---

## 📖 Uso

1. Abrir http://localhost:4200
2. Login (o registrarse)
3. Crear/gestionar tickets

---

## 📡 API Endpoints

- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/refresh` - Refrescar token
- `GET /api/usuarios` - Obtener usuarios
- `GET /api/tickets` - Obtener tickets
- `POST /api/tickets` - Crear ticket
- `PUT /api/tickets/{id}` - Actualizar ticket
- `DELETE /api/tickets/{id}` - Eliminar ticket

---

## 🧪 Testing

```bash
# Backend
cd backend
pytest tests.py -v

# Frontend
cd frontend
ng test
```

---

## 🔄 Gitflow Workflow

Rama principal: `feature/sprint2-full-implementation`

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nueva-funcionalidad
# Hacer cambios
git add .
git commit -m "feat: descripción"
git push origin feature/nueva-funcionalidad
```

---

## 📝 Sprints

- ✅ [Sprint 1](./SPRINT1.md) - Base Architecture
- ✅ [Sprint 2](./SPRINT2.md) - Full Implementation
- ⏳ Sprint 3 - WebSockets & Analytics

---

**Versión**: 2.0.0-beta  
**Última actualización**: Mayo 11, 2024
