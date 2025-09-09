"""init sdc schema

Revision ID: 20250908_0001
Revises: 
Create Date: 2025-09-08
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20250908_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("name", name="uq_tenant_name"),
        sa.UniqueConstraint("slug", name="uq_tenant_slug"),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("tenant_id", sa.String(length=36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("display_name", sa.String(length=200)),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("tenant_id", "email", name="uq_user_tenant_email"),
    )

    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=80), nullable=False, unique=True),
        sa.Column("description", sa.String(length=200)),
    )

    op.create_table(
        "user_roles",
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "presets",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("tenant_id", sa.String(length=36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("attribute_priorities", sa.JSON()),
        sa.Column("created_by_user_id", sa.String(length=36), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("tenant_id", "name", name="uq_preset_tenant_name"),
    )

    op.create_table(
        "uploads",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("tenant_id", sa.String(length=36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("filename", sa.String(length=400), nullable=False),
        sa.Column("content_type", sa.String(length=120), nullable=False),
        sa.Column("storage_url", sa.Text(), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default=sa.text("'received'")),
        sa.Column("preset_id", sa.String(length=36), sa.ForeignKey("presets.id")),
        sa.Column("created_by_user_id", sa.String(length=36), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_upload_tenant_status", "uploads", ["tenant_id", "status"])

    op.create_table(
        "jobs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("tenant_id", sa.String(length=36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("upload_id", sa.String(length=36), sa.ForeignKey("uploads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_type", sa.String(length=60), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default=sa.text("'queued'")),
        sa.Column("params", sa.JSON()),
        sa.Column("result", sa.JSON()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("started_at", sa.DateTime()),
        sa.Column("finished_at", sa.DateTime()),
    )
    op.create_index("ix_job_tenant_type_status", "jobs", ["tenant_id", "job_type", "status"])

    op.create_table(
        "normalization_results",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("tenant_id", sa.String(length=36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("upload_id", sa.String(length=36), sa.ForeignKey("uploads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("row_index", sa.Integer(), nullable=False),
        sa.Column("mapped_entities", sa.JSON(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("reviewed_by_user_id", sa.String(length=36), sa.ForeignKey("users.id")),
        sa.Column("reviewed_at", sa.DateTime()),
        sa.UniqueConstraint("upload_id", "row_index", name="uq_norm_upload_row"),
    )
    op.create_index(
        "ix_norm_tenant_upload_status",
        "normalization_results",
        ["tenant_id", "upload_id", "status"],
    )

    op.create_table(
        "lineage",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("tenant_id", sa.String(length=36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("entity_type", sa.String(length=60), nullable=False),
        sa.Column("entity_id", sa.String(length=36), nullable=False),
        sa.Column("parent_entity_type", sa.String(length=60)),
        sa.Column("parent_entity_id", sa.String(length=36)),
        sa.Column("meta", sa.JSON()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index(
        "ix_lineage_tenant_entity", "lineage", ["tenant_id", "entity_type", "entity_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_lineage_tenant_entity", table_name="lineage")
    op.drop_table("lineage")
    op.drop_index("ix_norm_tenant_upload_status", table_name="normalization_results")
    op.drop_table("normalization_results")
    op.drop_index("ix_job_tenant_type_status", table_name="jobs")
    op.drop_table("jobs")
    op.drop_index("ix_upload_tenant_status", table_name="uploads")
    op.drop_table("uploads")
    op.drop_table("presets")
    op.drop_table("user_roles")
    op.drop_table("roles")
    op.drop_table("users")
    op.drop_table("tenants")


