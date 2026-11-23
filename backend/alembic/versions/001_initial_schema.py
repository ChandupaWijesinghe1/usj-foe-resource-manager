"""Initial database schema migration

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-30 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Departments table
    op.create_table(
        'departments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(150), unique=True, nullable=False),
        sa.Column('code', sa.String(10), unique=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 2. Users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, index=True, nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('registration_number', sa.String(50), unique=True, index=True, nullable=True),
        sa.Column(
            'role',
            sa.Enum('STUDENT', 'LECTURER', 'SUPER_ADMIN', 'FACILITY_ADMIN', 'LAB_ADMIN', name='user_role_enum'),
            nullable=False,
            server_default='STUDENT',
        ),
        sa.Column('department_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True),
        sa.Column('phone_number', sa.String(20), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('is_verified', sa.Boolean, default=False, nullable=False),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('verified_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 3. Refresh Tokens
    op.create_table(
        'refresh_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('jti', sa.String(64), unique=True, index=True, nullable=False),
        sa.Column('token_hash', sa.String(255), unique=True, index=True, nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked', sa.Boolean, default=False, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 4. Facilities (Lecture Halls / Auditoriums)
    op.create_table(
        'facilities',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(150), nullable=False),
        sa.Column('code', sa.String(50), unique=True, index=True, nullable=False),
        sa.Column('building', sa.String(100), nullable=False),
        sa.Column('floor', sa.String(20), nullable=False),
        sa.Column('capacity', sa.Integer, nullable=False),
        sa.Column(
            'facility_type',
            sa.Enum('LECTURE_HALL', 'AUDITORIUM', 'SEMINAR_ROOM', 'COMPUTER_LAB', 'CONFERENCE_ROOM', name='facility_type_enum'),
            nullable=False,
            server_default='LECTURE_HALL',
        ),
        sa.Column('has_projector', sa.Boolean, default=True, nullable=False),
        sa.Column('has_ac', sa.Boolean, default=True, nullable=False),
        sa.Column('has_sound_system', sa.Boolean, default=True, nullable=False),
        sa.Column('department_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True),
        sa.Column('is_operational', sa.Boolean, default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 5. Facility Bookings
    op.create_table(
        'facility_bookings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('facilities.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('purpose', sa.Text, nullable=False),
        sa.Column('attendee_count', sa.Integer, default=1, nullable=False),
        sa.Column('start_time', sa.DateTime(timezone=True), index=True, nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), index=True, nullable=False),
        sa.Column(
            'status',
            sa.Enum('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED', name='booking_status_enum'),
            nullable=False,
            server_default='PENDING',
        ),
        sa.Column('approved_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('rejection_reason', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 6. Lecturer Availability Slots
    op.create_table(
        'lecturer_availability',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('lecturer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('day_of_week', sa.SmallInteger, nullable=False),
        sa.Column('start_time', sa.Time, nullable=False),
        sa.Column('end_time', sa.Time, nullable=False),
        sa.Column('slot_duration_minutes', sa.Integer, default=20, nullable=False),
        sa.Column(
            'location_type',
            sa.Enum('PHYSICAL_OFFICE', 'LAB', 'ONLINE_CALL', name='location_type_enum'),
            nullable=False,
            server_default='PHYSICAL_OFFICE',
        ),
        sa.Column('room_or_link', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
    )

    # 7. Lecturer Meetings
    op.create_table(
        'lecturer_meetings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('lecturer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('availability_slot_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('lecturer_availability.id', ondelete='SET NULL'), nullable=True),
        sa.Column('meeting_date', sa.Date, index=True, nullable=False),
        sa.Column('start_time', sa.Time, nullable=False),
        sa.Column('end_time', sa.Time, nullable=False),
        sa.Column('subject', sa.String(255), nullable=False),
        sa.Column('agenda', sa.Text, nullable=False),
        sa.Column(
            'meeting_status',
            sa.Enum('REQUESTED', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'COMPLETED', name='meeting_status_enum'),
            nullable=False,
            server_default='REQUESTED',
        ),
        sa.Column('decline_reason', sa.Text, nullable=True),
        sa.Column('lecturer_notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 8. Laboratories
    op.create_table(
        'laboratories',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('code', sa.String(50), unique=True, index=True, nullable=False),
        sa.Column('department_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('departments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('admin_in_charge_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('location', sa.String(150), nullable=False),
        sa.Column('operating_hours', sa.String(100), default='8:00 AM - 4:30 PM', nullable=False),
        sa.Column('safety_guidelines', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 9. Equipment Inventory
    op.create_table(
        'equipment',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('lab_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('laboratories.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('model_number', sa.String(100), nullable=True),
        sa.Column('serial_number', sa.String(100), unique=True, index=True, nullable=True),
        sa.Column('category', sa.String(100), index=True, nullable=False),
        sa.Column('total_quantity', sa.Integer, default=1, nullable=False),
        sa.Column('available_quantity', sa.Integer, default=1, nullable=False),
        sa.Column('is_borrowable', sa.Boolean, default=True, nullable=False),
        sa.Column('requires_admin_approval', sa.Boolean, default=True, nullable=False),
        sa.Column(
            'condition_status',
            sa.Enum('EXCELLENT', 'GOOD', 'NEEDS_REPAIR', 'DECOMMISSIONED', name='equipment_condition_enum'),
            nullable=False,
            server_default='GOOD',
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 10. Equipment Borrows
    op.create_table(
        'equipment_borrows',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('equipment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('equipment.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('borrower_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('quantity', sa.Integer, default=1, nullable=False),
        sa.Column('purpose', sa.Text, nullable=False),
        sa.Column('expected_borrow_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expected_return_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('actual_return_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            'status',
            sa.Enum('PENDING', 'APPROVED', 'ISSUED', 'RETURNED', 'OVERDUE', 'REJECTED', name='borrow_status_enum'),
            nullable=False,
            server_default='PENDING',
        ),
        sa.Column('issued_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('received_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('condition_on_return', sa.Text, nullable=True),
        sa.Column('admin_notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 11. Lab Services
    op.create_table(
        'lab_services',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('lab_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('laboratories.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('service_name', sa.String(255), nullable=False),
        sa.Column(
            'service_type',
            sa.Enum('THREE_D_PRINTING', 'PCB_FABRICATION', 'LASER_CUTTING', 'MATERIAL_TESTING', 'OTHER', name='service_type_enum'),
            nullable=False,
            server_default='OTHER',
        ),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('turnaround_time_days', sa.Integer, default=3, nullable=False),
        sa.Column('cost_per_unit', sa.Numeric(10, 2), default=0.00, nullable=False),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 12. Service Requests
    op.create_table(
        'service_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('service_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('lab_services.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('requester_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('project_title', sa.String(255), nullable=False),
        sa.Column('supervisor_name', sa.String(255), nullable=True),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column(
            'status',
            sa.Enum('SUBMITTED', 'ESTIMATED', 'APPROVED_BY_USER', 'IN_PROGRESS', 'READY_FOR_PICKUP', 'COMPLETED', 'REJECTED', 'CANCELLED', name='service_status_enum'),
            nullable=False,
            server_default='SUBMITTED',
        ),
        sa.Column('admin_notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 13. 3D Print Details
    op.create_table(
        'print_3d_details',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('service_request_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('service_requests.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('file_url', sa.String(500), nullable=False),
        sa.Column('original_filename', sa.String(255), nullable=False),
        sa.Column('file_size_bytes', sa.BigInteger, nullable=False),
        sa.Column(
            'material_type',
            sa.Enum('PLA', 'ABS', 'PETG', 'RESIN', 'TPU', name='material_type_enum'),
            nullable=False,
            server_default='PLA',
        ),
        sa.Column('color', sa.String(50), default='Black', nullable=False),
        sa.Column('infill_percentage', sa.Integer, default=20, nullable=False),
        sa.Column('estimated_filament_grams', sa.Numeric(8, 2), nullable=True),
        sa.Column('estimated_print_hours', sa.Numeric(5, 2), nullable=True),
        sa.Column('calculated_cost_lkr', sa.Numeric(10, 2), nullable=True),
        sa.Column('slicing_notes', sa.Text, nullable=True),
    )

    # 14. Notifications
    op.create_table(
        'notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column(
            'notification_type',
            sa.Enum('FACILITY_BOOKING', 'MEETING', 'EQUIPMENT', 'SERVICE_3D', 'SYSTEM', name='notification_type_enum'),
            nullable=False,
            server_default='SYSTEM',
        ),
        sa.Column('reference_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_read', sa.Boolean, default=False, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 15. Audit Logs
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('entity_type', sa.String(100), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('notifications')
    op.drop_table('print_3d_details')
    op.drop_table('service_requests')
    op.drop_table('lab_services')
    op.drop_table('equipment_borrows')
    op.drop_table('equipment')
    op.drop_table('laboratories')
    op.drop_table('lecturer_meetings')
    op.drop_table('lecturer_availability')
    op.drop_table('facility_bookings')
    op.drop_table('facilities')
    op.drop_table('refresh_tokens')
    op.drop_table('users')
    op.drop_table('departments')
