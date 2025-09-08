import os
from typing import List

class Settings:
    APP_VERSION: str = "2.0.0"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./mft.db")
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", "./storage")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:5000"]

settings = Settings()

# Ensure storage directory exists
os.makedirs(settings.STORAGE_DIR, exist_ok=True)
for subdir in ["vcdb", "customer", "exports"]:
    os.makedirs(os.path.join(settings.STORAGE_DIR, subdir), exist_ok=True)