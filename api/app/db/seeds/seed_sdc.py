from sqlalchemy.orm import Session
from .. import SessionLocal
from ..models import Tenant, Role, User, UserRole


def seed_default() -> None:
    db: Session = SessionLocal()
    try:
        # Roles
        for role_name in ["SDC Admin", "Customer Admin", "Customer Contributor"]:
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                db.add(Role(name=role_name, description=None))
        db.commit()

        # Default tenant and admin user
        tenant = db.query(Tenant).filter(Tenant.slug == "default").first()
        if not tenant:
            tenant = Tenant(name="Default Tenant", slug="default")
            db.add(tenant)
            db.commit()
            db.refresh(tenant)

        admin_email = "admin@localhost"
        user = (
            db.query(User)
            .filter(User.tenant_id == tenant.id, User.email == admin_email)
            .first()
        )
        if not user:
            user = User(tenant_id=tenant.id, email=admin_email, display_name="Admin")
            db.add(user)
            db.commit()
            db.refresh(user)

        admin_role = db.query(Role).filter(Role.name == "SDC Admin").first()
        if admin_role:
            link = (
                db.query(UserRole)
                .filter(UserRole.user_id == user.id, UserRole.role_id == admin_role.id)
                .first()
            )
            if not link:
                db.add(UserRole(user_id=user.id, role_id=admin_role.id))
                db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed_default()


