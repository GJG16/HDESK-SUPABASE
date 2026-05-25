import pytest
from fastapi.testclient import TestClient
from main import app
from security import hash_password
from database import db as database_instance
import asyncio
from uuid import uuid4


@pytest.fixture(scope="module")
def client():
    """TestClient que ejecuta los eventos de startup/shutdown"""
    c = TestClient(app)
    # entrar manualmente al contexto para controlar orden de teardown
    c.__enter__()
    try:
        yield c

        # Cleanup: eliminar usuarios de prueba y tickets creados durante los tests
        async def _cleanup():
            if database_instance.db is not None:
                try:
                    await database_instance.db.usuarios.delete_many({"email": {"$regex": r"^test\+"}})
                except Exception:
                    pass
                try:
                    await database_instance.db.tickets.delete_many({"titulo": {"$regex": r"Fallo critico"}})
                except Exception:
                    pass

        # Ejecutar cleanup en el event loop adecuado
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.run(_cleanup())
            else:
                loop.run_until_complete(_cleanup())
        except RuntimeError:
            asyncio.run(_cleanup())
    finally:
        c.__exit__(None, None, None)

@pytest.fixture
def test_user():
    """Fixture para usuario de prueba"""
    return {
        "nombre": "Test User",
        "email": f"test+{uuid4().hex}@example.com",
        "password": "testpassword123",
        "rol": "user"
    }

class TestAuth:
    def test_register_user(self, test_user, client):
        """Prueba registro de usuario"""
        response = client.post("/api/auth/register", json=test_user)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user["email"]
        assert "id" in data

    def test_register_duplicate_email(self, test_user, client):
        """Prueba registro con email duplicado"""
        client.post("/api/auth/register", json=test_user)
        response = client.post("/api/auth/register", json=test_user)
        assert response.status_code == 400

    def test_login_success(self, test_user, client):
        """Prueba login exitoso"""
        client.post("/api/auth/register", json=test_user)
        login_data = {
            "email": test_user["email"],
            "password": test_user["password"]
        }
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["email"] == test_user["email"]

    def test_login_invalid_password(self, test_user, client):
        """Prueba login con contraseña inválida"""
        client.post("/api/auth/register", json=test_user)
        login_data = {
            "email": test_user["email"],
            "password": "wrongpassword"
        }
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        """Prueba login con usuario inexistente"""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "password123"
        }
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401

class TestStatus:
    def test_status_endpoint(self, client):
        """Prueba endpoint de status"""
        response = client.get("/api/status")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        assert "timestamp" in data

    def test_health_endpoint(self, client):
        """Prueba endpoint de health check"""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
