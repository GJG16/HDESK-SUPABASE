import pytest
from fastapi.testclient import TestClient
from main import app
from security import hash_password

client = TestClient(app)

@pytest.fixture
def test_user():
    """Fixture para usuario de prueba"""
    return {
        "nombre": "Test User",
        "email": "test@example.com",
        "password": "testpassword123",
        "rol": "user"
    }

class TestAuth:
    def test_register_user(self, test_user):
        """Prueba registro de usuario"""
        response = client.post("/api/auth/register", json=test_user)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user["email"]
        assert "id" in data

    def test_register_duplicate_email(self, test_user):
        """Prueba registro con email duplicado"""
        client.post("/api/auth/register", json=test_user)
        response = client.post("/api/auth/register", json=test_user)
        assert response.status_code == 400

    def test_login_success(self, test_user):
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

    def test_login_invalid_password(self, test_user):
        """Prueba login con contraseña inválida"""
        client.post("/api/auth/register", json=test_user)
        login_data = {
            "email": test_user["email"],
            "password": "wrongpassword"
        }
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401

    def test_login_nonexistent_user(self):
        """Prueba login con usuario inexistente"""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "password123"
        }
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401

class TestStatus:
    def test_status_endpoint(self):
        """Prueba endpoint de status"""
        response = client.get("/api/status")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        assert "timestamp" in data

    def test_health_endpoint(self):
        """Prueba endpoint de health check"""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
