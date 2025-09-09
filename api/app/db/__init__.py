from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from ..config import settings


class Base(DeclarativeBase):
    pass


# Determine engine from settings.DATABASE_URL
engine = create_engine(settings.DATABASE_URL, echo=settings.DEBUG, future=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


