"""Lecturer meeting and availability enhancements

Revision ID: 002_lecturer_meeting_enhancements
Revises: 001_initial_schema
Create Date: 2026-10-30 21:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002_lecturer_meeting_enhancements'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add specific_date and max_students_per_slot to lecturer_availability
    op.add_column(
        'lecturer_availability',
        sa.Column('specific_date', sa.Date(), nullable=True)
    )
    op.create_index(
        op.f('ix_lecturer_availability_specific_date'),
        'lecturer_availability',
        ['specific_date'],
        unique=False
    )
    op.add_column(
        'lecturer_availability',
        sa.Column('max_students_per_slot', sa.Integer(), nullable=False, server_default='1')
    )

    # 2. Add PENDING, ACCEPTED, REJECTED to meeting_status_enum for PostgreSQL
    # Note: in postgres, enum values can be added with ALTER TYPE
    conn = op.get_bind()
    if conn.dialect.name == 'postgresql':
        for val in ['PENDING', 'ACCEPTED', 'REJECTED']:
            op.execute(f"ALTER TYPE meeting_status_enum ADD VALUE IF NOT EXISTS '{val}'")


def downgrade() -> None:
    op.drop_index(op.f('ix_lecturer_availability_specific_date'), table_name='lecturer_availability')
    op.drop_column('lecturer_availability', 'max_students_per_slot')
    op.drop_column('lecturer_availability', 'specific_date')
