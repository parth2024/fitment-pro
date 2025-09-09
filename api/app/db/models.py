from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    String,
    Integer,
    Boolean,
    ForeignKey,
    DateTime,
    JSON,
    UniqueConstraint,
    Index,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    users: Mapped[list[User]] = relationship("User", back_populates="tenant")
    presets: Mapped[list[Preset]] = relationship("Preset", back_populates="tenant")
    uploads: Mapped[list[Upload]] = relationship("Upload", back_populates="tenant")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(200))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    tenant: Mapped[Tenant] = relationship("Tenant", back_populates="users")
    roles: Mapped[list[Role]] = relationship(
        "Role", secondary="user_roles", back_populates="users", lazy="selectin"
    )

    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_user_tenant_email"),
    )


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(200))

    users: Mapped[list[User]] = relationship(
        "User", secondary="user_roles", back_populates="roles", lazy="selectin"
    )


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)


class Preset(Base):
    __tablename__ = "presets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    attribute_priorities: Mapped[Optional[dict]] = mapped_column(JSON)
    created_by_user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    tenant: Mapped[Tenant] = relationship("Tenant", back_populates="presets")

    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_preset_tenant_name"),
    )


class Upload(Base):
    __tablename__ = "uploads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    filename: Mapped[str] = mapped_column(String(400), nullable=False)
    content_type: Mapped[str] = mapped_column(String(120), nullable=False)
    storage_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="received")
    preset_id: Mapped[Optional[str]] = mapped_column(ForeignKey("presets.id"))
    created_by_user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    tenant: Mapped[Tenant] = relationship("Tenant", back_populates="uploads")
    jobs: Mapped[list[Job]] = relationship("Job", back_populates="upload")

    __table_args__ = (
        Index("ix_upload_tenant_status", "tenant_id", "status"),
    )


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    upload_id: Mapped[str] = mapped_column(ForeignKey("uploads.id", ondelete="CASCADE"), nullable=False)
    job_type: Mapped[str] = mapped_column(String(60), nullable=False)  # pre-validate, ai-map, vcdb-validate, review, publish
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="queued")
    params: Mapped[Optional[dict]] = mapped_column(JSON)
    result: Mapped[Optional[dict]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    upload: Mapped[Upload] = relationship("Upload", back_populates="jobs")

    __table_args__ = (
        Index("ix_job_tenant_type_status", "tenant_id", "job_type", "status"),
    )


class NormalizationResult(Base):
    __tablename__ = "normalization_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    upload_id: Mapped[str] = mapped_column(ForeignKey("uploads.id", ondelete="CASCADE"), nullable=False)
    row_index: Mapped[int] = mapped_column(Integer, nullable=False)
    mapped_entities: Mapped[dict] = mapped_column(JSON, nullable=False)
    confidence: Mapped[float] = mapped_column()
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="pending")  # pending|approved|rejected
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_by_user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    __table_args__ = (
        Index("ix_norm_tenant_upload_status", "tenant_id", "upload_id", "status"),
        UniqueConstraint("upload_id", "row_index", name="uq_norm_upload_row"),
    )


class Lineage(Base):
    __tablename__ = "lineage"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(60), nullable=False)  # upload|job|normalization_result
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False)
    parent_entity_type: Mapped[Optional[str]] = mapped_column(String(60))
    parent_entity_id: Mapped[Optional[str]] = mapped_column(String(36))
    meta: Mapped[Optional[dict]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_lineage_tenant_entity", "tenant_id", "entity_type", "entity_id"),
    )


