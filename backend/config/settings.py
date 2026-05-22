from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Application
    app_name: str = "Helpdesk API"
    app_version: str = "1.0.0"
    app_description: str = "Sistema de Gestión de Tickets (Helpdesk) corporativo"
    
    # Server
    server_host: str = "0.0.0.0"
    server_port: int = 8000
    debug: bool = False
    
    # MongoDB
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "helpdesk_db"
    
    # CORS
    cors_origins: list = [
        "http://localhost:4200",
        "http://localhost:3000",
        "http://127.0.0.1:4200",
    ]
    cors_credentials: bool = True
    cors_methods: list = ["*"]
    cors_headers: list = ["*"]
    
    # Security
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"

settings = Settings()
