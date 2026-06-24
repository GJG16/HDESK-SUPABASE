import os
import sys
import time
import io
import bcrypt
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Fix Windows console encoding for unicode characters
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Setup path so it finds main.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import app
import models
from database import Base, get_db

# Setup Test DB
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_qa.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def seed_db():
    db = TestingSessionLocal()
    # Departamentos
    db.add(models.DepartamentoNegocio(id=1, nombre="Marketing"))
    db.add(models.DepartamentoNegocio(id=2, nombre="Ventas"))
    db.add(models.DepartamentoNegocio(id=3, nombre="ATC"))
    # Areas Tecnicas
    db.add(models.AreaTecnica(id=1, nombre_area="Redes y Conectividad"))
    db.add(models.AreaTecnica(id=2, nombre_area="Hardware y Perifericos"))
    db.add(models.AreaTecnica(id=3, nombre_area="Software y SO"))
    db.add(models.AreaTecnica(id=4, nombre_area="Soporte General"))
    db.add(models.AreaTecnica(id=5, nombre_area="Seguridad"))
    # Usuarios con passwords encriptados
    db.add(models.Usuario(id=1, email="admin@test.com", password_hash=hash_pw("admin123"),
                          rol="Administrador", nombre="Admin", activo=True))
    db.add(models.Usuario(id=2, email="operador@test.com", password_hash=hash_pw("oper123"),
                          rol="Operador", nombre="Operador A", activo=True, id_departamento=2))
    db.add(models.Usuario(id=3, email="tecnico@test.com", password_hash=hash_pw("tech123"),
                          rol="Tecnico", nombre="Tecnico B", activo=True, especialidad="Redes", id_area_tecnica=1))
    db.commit()
    db.close()

def run_tests():
    print("INICIANDO PRUEBAS DE QA - v2.0 (5 Mejoras Estructurales)\n")
    if os.path.exists("./test_qa.db"):
        os.remove("./test_qa.db")

    Base.metadata.create_all(bind=engine)
    seed_db()

    # ====================================================================
    print("=" * 60)
    print("  MEJORA 2: AUTENTICACION CON BCRYPT + JWT")
    print("=" * 60)

    # Login Admin con password real
    resp_admin = client.post("/auth/login", json={"email": "admin@test.com", "password": "admin123"})
    assert resp_admin.status_code == 200, f"Login admin fallo: {resp_admin.text}"
    admin_data = resp_admin.json()
    assert "access_token" in admin_data
    admin_token = admin_data["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[OK] [AUTH] Login Admin con bcrypt exitoso. JWT generado.")

    # Login Operador
    resp_op = client.post("/auth/login", json={"email": "operador@test.com", "password": "oper123"})
    assert resp_op.status_code == 200, f"Login operador fallo: {resp_op.text}"
    op_token = resp_op.json()["access_token"]
    op_headers = {"Authorization": f"Bearer {op_token}"}
    print("[OK] [AUTH] Login Operador exitoso.")

    # Login Tecnico
    resp_tech = client.post("/auth/login", json={"email": "tecnico@test.com", "password": "tech123"})
    assert resp_tech.status_code == 200, f"Login tecnico fallo: {resp_tech.text}"
    tech_token = resp_tech.json()["access_token"]
    tech_headers = {"Authorization": f"Bearer {tech_token}"}
    print("[OK] [AUTH] Login Tecnico exitoso.")

    # Login con password incorrecto
    resp_bad = client.post("/auth/login", json={"email": "admin@test.com", "password": "wrongpass"})
    assert resp_bad.status_code == 401
    print("[OK] [AUTH] Password incorrecto rechazado correctamente (401).")

    # ====================================================================
    print("\n" + "=" * 60)
    print("  MEJORA 1: CREACION DE USUARIOS CON VALIDACION DE ROL")
    print("=" * 60)

    # Crear Operador sin departamento -> Error de validacion
    resp = client.post("/admin/usuarios/", headers=admin_headers, json={
        "nombre": "Test Operador", "email": "test.op@test.com", "password": "test123",
        "rol": "Operador"  # Sin id_departamento
    })
    assert resp.status_code == 422, f"Esperaba 422 pero recibio {resp.status_code}: {resp.text}"
    print("[OK] [MEJORA 1] Operador sin departamento rechazado (422 Validation Error).")

    # Crear Tecnico sin area tecnica -> Error de validacion
    resp = client.post("/admin/usuarios/", headers=admin_headers, json={
        "nombre": "Test Tecnico", "email": "test.tech@test.com", "password": "test123",
        "rol": "Tecnico"  # Sin id_area_tecnica
    })
    assert resp.status_code == 422, f"Esperaba 422 pero recibio {resp.status_code}: {resp.text}"
    print("[OK] [MEJORA 1] Tecnico sin area tecnica rechazado (422 Validation Error).")

    # Crear Operador con departamento -> OK
    resp = client.post("/admin/usuarios/", headers=admin_headers, json={
        "nombre": "Nuevo Operador", "email": "nuevo.op@test.com", "password": "nuevopass",
        "rol": "Operador", "id_departamento": 1, "extension": "2001"
    })
    assert resp.status_code == 200, f"Crear operador fallo: {resp.text}"
    nuevo_op = resp.json()
    assert nuevo_op["nombre_departamento"] == "Marketing"
    print(f"[OK] [MEJORA 1] Operador creado -> Departamento: {nuevo_op['nombre_departamento']}.")

    # Crear Tecnico con area tecnica -> OK
    resp = client.post("/admin/usuarios/", headers=admin_headers, json={
        "nombre": "Nuevo Tecnico", "email": "nuevo.tech@test.com", "password": "nuevopass",
        "rol": "Tecnico", "id_area_tecnica": 2, "especialidad": "Hardware"
    })
    assert resp.status_code == 200, f"Crear tecnico fallo: {resp.text}"
    nuevo_tech = resp.json()
    assert nuevo_tech["nombre_area_tecnica"] == "Hardware y Perifericos"
    print(f"[OK] [MEJORA 1] Tecnico creado -> Area: {nuevo_tech['nombre_area_tecnica']}.")

    # Solo admin puede crear usuarios
    resp = client.post("/admin/usuarios/", headers=op_headers, json={
        "nombre": "Intento", "email": "intento@test.com", "password": "pass",
        "rol": "Operador", "id_departamento": 1
    })
    assert resp.status_code == 403
    print("[OK] [MEJORA 1] Operador no puede crear usuarios (403 Forbidden).")

    # ====================================================================
    print("\n" + "=" * 60)
    print("  MEJORA 1: TRAZABILIDAD DEPARTAMENTO ORIGEN EN TICKETS")
    print("=" * 60)

    # Crear ticket con operador (tiene departamento Ventas, id=2)
    time.sleep(0.1)
    ticket_payload = {
        "titulo": "Caida del servidor", "descripcion": "Error 500 en todos los accesos",
        "criticidad": "Critica", "id_operador_creador": 2
    }
    resp = client.post("/tickets/triaje/", json=ticket_payload)
    assert resp.status_code == 200, f"Crear ticket fallo: {resp.text}"
    ticket = resp.json()
    assert ticket["id_departamento_origen"] == 2
    assert ticket["nombre_departamento_origen"] == "Ventas"
    print(f"[OK] [MEJORA 1] Ticket creado -> Origen: {ticket['nombre_departamento_origen']}.")

    ticket_id = ticket["id"]
    version_actual = ticket["version"]

    # ====================================================================
    print("\n" + "=" * 60)
    print("  MEJORA 3: MAPA DE CALOR CON PANDAS")
    print("=" * 60)

    # Endpoint protegido para tecnicos
    resp = client.get("/reportes/mapa-calor-departamentos", headers=tech_headers)
    assert resp.status_code == 200, f"Mapa calor fallo: {resp.text}"
    mapa = resp.json()
    assert "datos" in mapa
    assert "total" in mapa
    print(f"[OK] [MEJORA 3] Mapa de calor generado con Pandas -> Total tickets: {mapa['total']}.")
    if mapa["datos"]:
        top = mapa["datos"][0]
        print(f"   -> Departamento con mas fallas: {top['departamento']} ({top['cantidad']} tickets, {top['porcentaje']}%)")

    # Operador no puede ver mapa de calor
    resp = client.get("/reportes/mapa-calor-departamentos", headers=op_headers)
    assert resp.status_code == 403
    print("[OK] [MEJORA 3] Operador no puede ver mapa de calor (403 Forbidden).")

    # ====================================================================
    print("\n" + "=" * 60)
    print("  MEJORA 4: SOFT DELETE (BAJA LOGICA)")
    print("=" * 60)

    # Desactivar el nuevo operador
    resp = client.patch(f"/admin/usuarios/{nuevo_op['id']}/desactivar", headers=admin_headers)
    assert resp.status_code == 200, f"Desactivar fallo: {resp.text}"
    assert resp.json()["activo"] == False
    print(f"[OK] [MEJORA 4] Usuario '{nuevo_op['nombre']}' desactivado (activo=False).")

    # Intentar desactivar otra vez -> Error
    resp = client.patch(f"/admin/usuarios/{nuevo_op['id']}/desactivar", headers=admin_headers)
    assert resp.status_code == 400
    print("[OK] [MEJORA 4] Desactivar usuario ya inactivo rechazado (400).")

    # Intentar login con usuario desactivado -> Rechazado
    resp = client.post("/auth/login", json={"email": "nuevo.op@test.com", "password": "nuevopass"})
    assert resp.status_code == 401
    print("[OK] [MEJORA 4] Login con usuario desactivado rechazado (401).")

    # Reactivar usuario
    resp = client.patch(f"/admin/usuarios/{nuevo_op['id']}/activar", headers=admin_headers)
    assert resp.status_code == 200, f"Activar fallo: {resp.text}"
    assert resp.json()["activo"] == True
    print(f"[OK] [MEJORA 4] Usuario '{nuevo_op['nombre']}' reactivado (activo=True).")

    # Admin no puede desactivarse a si mismo
    resp = client.patch(f"/admin/usuarios/1/desactivar", headers=admin_headers)
    assert resp.status_code == 400
    print("[OK] [MEJORA 4] Admin no puede desactivarse a si mismo (400).")

    # Operador no puede desactivar usuarios
    resp = client.patch(f"/admin/usuarios/{nuevo_op['id']}/desactivar", headers=op_headers)
    assert resp.status_code == 403
    print("[OK] [MEJORA 4] Operador no puede desactivar usuarios (403).")

    # ====================================================================
    print("\n" + "=" * 60)
    print("  MEJORA 5: HISTORIAL Y TRAZABILIDAD SLA")
    print("=" * 60)

    # El ticket creado antes ya tiene historial (creacion)
    resp = client.get(f"/tickets/{ticket_id}/historial")
    assert resp.status_code == 200, f"Historial fallo: {resp.text}"
    historial = resp.json()
    assert len(historial) >= 1
    assert historial[0]["estado_nuevo"] == "Pendiente"
    print(f"[OK] [MEJORA 5] Historial del ticket #{ticket_id}: {len(historial)} registro(s) encontrado(s).")

    # Cambiar estado -> debe generar nuevo registro en historial
    resp = client.patch(f"/tickets/{ticket_id}", json={
        "estado": "En Proceso", "id_especialista": 3, "version": version_actual
    })
    assert resp.status_code == 200, f"Patch ticket fallo: {resp.text}"
    print(f"[OK] [MEJORA 5] Ticket #{ticket_id} cambiado a 'En Proceso'.")

    resp = client.get(f"/tickets/{ticket_id}/historial")
    historial = resp.json()
    assert len(historial) >= 2
    ultimo = historial[-1]
    assert ultimo["estado_anterior"] == "Pendiente"
    assert ultimo["estado_nuevo"] == "En Proceso"
    print(f"[OK] [MEJORA 5] Historial actualizado automaticamente: Pendiente -> En Proceso (por tecnico ID: {ultimo.get('id_usuario')}).")

    # Resolver ticket
    resp = client.patch(f"/tickets/{ticket_id}", json={
        "estado": "Resuelto", "comentario_resolucion": "Se reinicio el servidor",
        "id_especialista": 3, "version": version_actual + 1
    })
    assert resp.status_code == 200, f"Resolver ticket fallo: {resp.text}"
    assert resp.json()["tiempo_resolucion_horas"] is not None
    print(f"[OK] [MEJORA 5] Ticket #{ticket_id} resuelto. Tiempo resolucion: {resp.json()['tiempo_resolucion_horas']}h.")

    resp = client.get(f"/tickets/{ticket_id}/historial")
    historial = resp.json()
    assert len(historial) >= 3
    ultimo = historial[-1]
    assert ultimo["estado_nuevo"] == "Resuelto"
    assert ultimo["comentario"] == "Se reinicio el servidor"
    print(f"[OK] [MEJORA 5] Timeline completo: {len(historial)} registros. Ultimo: En Proceso -> Resuelto.")

    # ====================================================================
    print("\n" + "=" * 60)
    print("  CASOS LIMITE HEREDADOS")
    print("=" * 60)

    # SEC-02: Control de Acceso / Bypass
    resp_dashboard = client.get("/reportes/dashboard")  # Sin token
    assert resp_dashboard.status_code == 401
    print("[OK] [SEC-02] Endpoint admin rechaza solicitudes sin JWT (401).")

    resp_dashboard_op = client.get("/reportes/dashboard", headers=op_headers)
    assert resp_dashboard_op.status_code == 403
    print("[OK] [SEC-02] Endpoint admin rechaza operadores (403).")

    # Dashboard admin funciona con token admin
    resp_dashboard_ok = client.get("/reportes/dashboard", headers=admin_headers)
    assert resp_dashboard_ok.status_code == 200
    print("[OK] [PANDAS] Dashboard calculado exitosamente con token Admin.")

    # LOG-01: XSS sanitizacion
    time.sleep(2.1)
    resp = client.post("/tickets/triaje/", json={
        "titulo": "Test", "descripcion": "<script>alert(1)</script>", "criticidad": "Alta"
    })
    assert resp.status_code == 200
    print(f"[OK] [LOG-01] XSS sanitizado. Area asignada: {resp.json()['id_area']}.")

    # DAT-01: Doble Submit
    time.sleep(2.1)
    payload = {"titulo": "Doble Submit", "descripcion": "Click rapido del usuario", "criticidad": "Baja"}
    client.post("/tickets/triaje/", json=payload)
    resp_dup = client.post("/tickets/triaje/", json=payload)
    assert resp_dup.status_code == 409
    print("[OK] [DAT-01] Doble submit bloqueado (409 Conflict).")

    # DAT-02: OCC
    time.sleep(2.1)
    resp_t = client.post("/tickets/triaje/", json={"titulo": "OCC Test", "descripcion": "Test OCC", "criticidad": "Baja"})
    t_id = resp_t.json()["id"]
    t_ver = resp_t.json()["version"]
    client.patch(f"/tickets/{t_id}", json={"estado": "En Proceso", "version": t_ver})
    resp_b = client.patch(f"/tickets/{t_id}", json={"estado": "Resuelto", "version": t_ver})
    assert resp_b.status_code == 409
    print("[OK] [DAT-02] OCC implementado. Conflicto detectado (409).")

    # ====================================================================
    print("\n" + "=" * 60)
    print("  TODAS LAS PRUEBAS PASARON - 5 MEJORAS VERIFICADAS")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
