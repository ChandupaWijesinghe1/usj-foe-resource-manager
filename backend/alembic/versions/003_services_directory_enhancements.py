"""Services directory and laboratory enhancements

Revision ID: 003_services_directory_enhancements
Revises: 002_lecturer_meeting_enhancements
Create Date: 2026-10-30 21:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '003_services_directory_enhancements'
down_revision: Union[str, None] = '002_lecturer_meeting_enhancements'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Laboratories enhancements
    op.add_column('laboratories', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('laboratories', sa.Column('contact_email', sa.String(255), nullable=True))
    op.add_column('laboratories', sa.Column('contact_phone', sa.String(50), nullable=True))
    op.add_column('laboratories', sa.Column('image_url', sa.String(500), nullable=True))
    op.add_column('laboratories', sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False))

    # 2. Lab services enhancements
    op.add_column('lab_services', sa.Column('category', sa.String(100), server_default='General', nullable=False))
    op.create_index(op.f('ix_lab_services_category'), 'lab_services', ['category'], unique=False)
    op.add_column('lab_services', sa.Column('image_url', sa.String(500), nullable=True))
    op.add_column('lab_services', sa.Column('unit_name', sa.String(50), server_default='job', nullable=False))
    op.add_column('lab_services', sa.Column('total_quantity', sa.Integer(), nullable=True))
    op.add_column('lab_services', sa.Column('available_quantity', sa.Integer(), nullable=True))
    op.add_column('lab_services', sa.Column('is_available', sa.Boolean(), server_default='true', nullable=False))
    op.add_column('lab_services', sa.Column('usage_instructions', sa.Text(), nullable=True))
    op.add_column('lab_services', sa.Column('borrowing_conditions', sa.Text(), nullable=True))

    # 3. Service requests enhancements
    op.add_column('service_requests', sa.Column('requested_quantity', sa.Integer(), server_default='1', nullable=False))

    # 4. ServiceType enum values in PostgreSQL
    conn = op.get_bind()
    if conn.dialect.name == 'postgresql':
        for val in ['EQUIPMENT_LOAN', 'COMPUTING_FACILITY', 'ELECTRONIC_COMPONENTS']:
            op.execute(f"ALTER TYPE service_type_enum ADD VALUE IF NOT EXISTS '{val}'")


def downgrade() -> None:
    op.drop_column('service_requests', 'requested_quantity')
    op.drop_index(op.f('ix_lab_services_category'), table_name='lab_services')
    op.drop_column('lab_services', 'borrowing_conditions')
    op.drop_column('lab_services', 'usage_instructions')
    op.drop_column('lab_services', 'is_available')
    op.drop_column('lab_services', 'available_quantity')
    op.drop_column('lab_services', 'total_quantity')
    op.drop_column('lab_services', 'unit_name')
    op.drop_column('lab_services', 'image_url')
    op.drop_column('lab_services', 'category')
    op.drop_column('laboratories', 'is_active')
    op.drop_column('laboratories', 'image_url')
    op.drop_column('laboratories', 'contact_phone')
    op.drop_column('laboratories', 'contact_email')
    op.drop_column('laboratories', 'description')
