import os
from typing import List
from dotenv import load_dotenv


def _build_database_url() -> str:
    # Allow full URL override first
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        return env_url

    # Build from discrete POSTGRES_* envs if present
    pg_db = os.getenv("POSTGRES_DB")
    pg_user = os.getenv("POSTGRES_USER")
    pg_password = os.getenv("POSTGRES_PASSWORD")
    pg_host = os.getenv("POSTGRES_HOST")
    pg_port = os.getenv("POSTGRES_PORT", "5432")
    if all([pg_db, pg_user, pg_password, pg_host]):
        return f"postgresql+psycopg2://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_db}"

    # Fallback to local sqlite
    return "sqlite:///./mft.db"

class Settings:
    APP_VERSION: str = "2.0.0"
    # Load .env once when settings is instantiated
    _loaded: bool = load_dotenv() or True
    DATABASE_URL: str = _build_database_url()
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", "./storage")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:5000"]

settings = Settings()

# Ensure storage directory exists
os.makedirs(settings.STORAGE_DIR, exist_ok=True)
for subdir in ["vcdb", "customer", "exports"]:
    os.makedirs(os.path.join(settings.STORAGE_DIR, subdir), exist_ok=True)