from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..db.models import Tenant


router = APIRouter(prefix="/api/tenants", tags=["Tenants"])


class TenantCreate(BaseModel):
    name: str
    slug: str


class TenantOut(BaseModel):
    id: str
    name: str
    slug: str
    isActive: bool

    class Config:
        from_attributes = True


@router.get("/", response_model=list[TenantOut])
def list_tenants(
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    tenants = (
        db.query(Tenant)
        .order_by(Tenant.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [TenantOut.model_validate(t) for t in tenants]


@router.post("/", response_model=TenantOut)
def create_tenant(payload: TenantCreate, db: Session = Depends(get_db)):
    exists = (
        db.query(Tenant)
        .filter((Tenant.slug == payload.slug) | (Tenant.name == payload.name))
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="Tenant with same name or slug exists")

    tenant = Tenant(name=payload.name, slug=payload.slug)
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return TenantOut.model_validate(tenant)


