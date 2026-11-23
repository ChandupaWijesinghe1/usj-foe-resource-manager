import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application Metadata
    PROJECT_NAME: str = "USJ FOE Resource Booking & Management System"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = (
        "Enterprise Resource Booking and Management System for the University of Sri Jayewardenepura, "
        "Faculty of Engineering. Centralizes lecture halls, academic consultations, laboratory inventory, "
        "and rapid prototyping services."
    )
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # PostgreSQL Database Connection
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "usj_resource_db"
    DATABASE_URL: str = ""

    # JWT Authentication & RBAC
    JWT_SECRET_KEY: str = "dev_secret_key_change_in_production_usj_foe_2026_super_secure"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 60

    # University Domain Enforcement
    ALLOWED_EMAIL_DOMAINS: List[str] = ["eng.sjp.ac.lk", "sjp.ac.lk"]
    ENFORCE_EMAIL_DOMAIN: bool = True

    # CORS Settings
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    # Rate Limiting & Security
    RATE_LIMITING_ENABLED: bool = True


    @field_validator("DATABASE_URL", mode="before")
    def assemble_db_connection(cls, v: str, info) -> str:
        if v and isinstance(v, str) and len(v.strip()) > 0:
            return v
        values = info.data
        user = values.get("POSTGRES_USER", "postgres")
        password = values.get("POSTGRES_PASSWORD", "postgres")
        server = values.get("POSTGRES_SERVER", "localhost")
        port = values.get("POSTGRES_PORT", 5432)
        db = values.get("POSTGRES_DB", "usj_resource_db")
        return f"postgresql+asyncpg://{user}:{password}@{server}:{port}/{db}"

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return [i.strip() for i in v.split(",") if i.strip()]
        return v

    @field_validator("ALLOWED_EMAIL_DOMAINS", mode="before")
    def assemble_email_domains(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return [i.strip().lower() for i in v.split(",") if i.strip()]
        return [i.lower() for i in v]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
