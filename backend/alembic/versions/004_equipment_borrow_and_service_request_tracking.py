"""Equipment borrow and service request tracking enhancements

Revision ID: 004_equipment_borrow_and_service_request_tracking
Revises: 003_services_directory_enhancements
Create Date: 2026-10-30 21:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '004_equipment_borrow_and_service_request_tracking'
down_revision: Union[str, None] = '003_services_directory_enhancements'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Equipment borrow tracking columns
    op.add_column('equipment_borrows', sa.Column('collection_instructions', sa.Text(), nullable=True))
    op.add_column('equipment_borrows', sa.Column('rejection_reason', sa.Text(), nullable=True))
    op.add_column('equipment_borrows', sa.Column('is_damaged_or_missing', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('equipment_borrows', sa.Column('damage_notes', sa.Text(), nullable=True))
    op.add_column('equipment_borrows', sa.Column('student_confirmed_return', sa.Boolean(), server_default='false', nullable=False))

    # 2. Service requests tracking columns
    op.add_column('service_requests', sa.Column('dimensions', sa.String(100), nullable=True))
    op.add_column('service_requests', sa.Column('preferred_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('service_requests', sa.Column('scheduled_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('service_requests', sa.Column('estimated_completion_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('service_requests', sa.Column('recorded_charges_lkr', sa.Numeric(10, 2), nullable=True))
    op.add_column('service_requests', sa.Column('rejection_reason', sa.Text(), nullable=True))
    op.add_column('service_requests', sa.Column('attachment_url', sa.String(500), nullable=True))
    op.add_column('service_requests', sa.Column('attachment_name', sa.String(255), nullable=True))

    # 3. PostgreSQL enum updates
    conn = op.get_bind()
    if conn.dialect.name == 'postgresql':
        for val in ['PENDING', 'APPROVED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']:
            op.execute(f"ALTER TYPE borrow_status_enum ADD VALUE IF NOT EXISTS '{val}'")
            op.execute(f"ALTER TYPE service_status_enum ADD VALUE IF NOT EXISTS '{val}'")


def downgrade() -> None:
    op.drop_column('service_requests', 'attachment_name')
    op.drop_column('service_requests', 'attachment_url')
    op.drop_column('service_requests', 'rejection_reason')
    op.drop_column('service_requests', 'recorded_charges_lkr')
    op.drop_column('service_requests', 'estimated_completion_date')
    op.drop_column('service_requests', 'scheduled_date')
    op.drop_column('service_requests', 'preferred_date')
    op.drop_column('service_requests', 'dimensions')
    op.drop_column('equipment_borrows', 'student_confirmed_return')
    op.drop_column('equipment_borrows', 'damage_notes')
    op.drop_column('equipment_borrows', 'is_damaged_or_missing')
    op.drop_column('equipment_borrows', 'rejection_reason')
    op.drop_column('equipment_borrows', 'collection_instructions')
