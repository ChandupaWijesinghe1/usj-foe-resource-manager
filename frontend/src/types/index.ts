export type UserRole =
  | "STUDENT"
  | "LECTURER"
  | "SUPER_ADMIN"
  | "FACILITY_ADMIN"
  | "LAB_ADMIN";

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  registration_number?: string | null;
  role: UserRole;
  department_id?: string | null;
  department?: Department | null;
  phone_number?: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export type FacilityType =
  | "LECTURE_HALL"
  | "AUDITORIUM"
  | "SEMINAR_ROOM"
  | "COMPUTER_LAB"
  | "CONFERENCE_ROOM";

export interface Facility {
  id: string;
  name: string;
  code: string;
  building: string;
  floor: string;
  capacity: number;
  facility_type: FacilityType;
  has_projector: boolean;
  has_ac: boolean;
  has_sound_system: boolean;
  department_id?: string | null;
  is_operational: boolean;
  maintenance_reason?: string | null;
  maintenance_until?: string | null;
}

export interface FacilityScheduleSlot {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
  is_maintenance: boolean;
  attendee_count?: number | null;
}

export type BookingStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

export interface FacilityBooking {
  id: string;
  facility_id: string;
  user_id: string;
  title: string;
  purpose: string;
  event_description?: string | null;
  attendee_count: number;
  start_time: string;
  end_time: string;
  document_url?: string | null;
  document_name?: string | null;
  is_maintenance_block?: boolean;
  status: BookingStatus;
  approved_by?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  facility?: Facility;
  user?: User;
}

export interface LecturerAvailability {
  id: string;
  lecturer_id: string;
  specific_date?: string | null;
  day_of_week: number; // 0=Mon, 6=Sun
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  max_students_per_slot: number;
  location_type: "PHYSICAL_OFFICE" | "LAB" | "ONLINE_CALL";
  room_or_link: string;
  is_active: boolean;
}

export interface LecturerDiscreteSlot {
  availability_slot_id: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  location_type: "PHYSICAL_OFFICE" | "LAB" | "ONLINE_CALL";
  room_or_link: string;
  is_available: boolean;
  current_bookings_count: number;
  max_students: number;
}

export type MeetingStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED"
  | "REQUESTED"
  | "CONFIRMED"
  | "DECLINED";

export interface LecturerMeeting {
  id: string;
  lecturer_id: string;
  student_id: string;
  availability_slot_id?: string | null;
  meeting_date: string;
  start_time: string;
  end_time: string;
  subject: string;
  agenda: string;
  meeting_status: MeetingStatus;
  decline_reason?: string | null;
  lecturer_notes?: string | null;
  created_at: string;
  lecturer?: User;
  student?: User;
  availability_slot?: LecturerAvailability;
}

export interface Laboratory {
  id: string;
  name: string;
  code: string;
  department_id: string;
  admin_in_charge_id?: string | null;
  location: string;
  description?: string | null;
  operating_hours: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  safety_guidelines?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  department?: Department | null;
  admin_in_charge?: User | null;
}

export interface Equipment {
  id: string;
  lab_id: string;
  name: string;
  model_number?: string | null;
  serial_number?: string | null;
  category: string;
  total_quantity: number;
  available_quantity: number;
  is_borrowable: boolean;
  requires_admin_approval: boolean;
  condition_status: "EXCELLENT" | "GOOD" | "NEEDS_REPAIR" | "DECOMMISSIONED";
  laboratory?: Laboratory;
}

export type BorrowStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "ISSUED"
  | "RETURNED"
  | "OVERDUE";

export interface EquipmentBorrow {
  id: string;
  equipment_id: string;
  borrower_id: string;
  quantity: number;
  purpose: string;
  expected_borrow_date: string;
  expected_return_date: string;
  actual_borrow_date?: string | null;
  actual_return_date?: string | null;
  status: BorrowStatus;
  collection_instructions?: string | null;
  rejection_reason?: string | null;
  is_damaged_or_missing?: boolean;
  damage_notes?: string | null;
  student_confirmed_return?: boolean;
  issued_by?: string | null;
  received_by?: string | null;
  condition_on_return?: string | null;
  admin_notes?: string | null;
  created_at: string;
  equipment?: Equipment;
  borrower?: User;
}

export interface LabService {
  id: string;
  lab_id: string;
  service_name: string;
  category: string;
  service_type:
    | "THREE_D_PRINTING"
    | "PCB_FABRICATION"
    | "LASER_CUTTING"
    | "MATERIAL_TESTING"
    | "EQUIPMENT_LOAN"
    | "COMPUTING_FACILITY"
    | "ELECTRONIC_COMPONENTS"
    | "OTHER";
  description: string;
  image_url?: string | null;
  turnaround_time_days: number;
  cost_per_unit: number;
  unit_name: string;
  total_quantity?: number | null;
  available_quantity?: number | null;
  is_available: boolean;
  usage_instructions?: string | null;
  borrowing_conditions?: string | null;
  is_active: boolean;
  laboratory?: Laboratory;
}

export type ServiceStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "SUBMITTED"
  | "ESTIMATED"
  | "APPROVED_BY_USER"
  | "READY_FOR_PICKUP";

export interface Print3DDetails {
  id: string;
  file_url: string;
  original_filename: string;
  file_size_bytes: number;
  material_type: "PLA" | "ABS" | "PETG" | "RESIN" | "TPU";
  color: string;
  infill_percentage: number;
  estimated_filament_grams?: number | null;
  estimated_print_hours?: number | null;
  calculated_cost_lkr?: number | null;
  slicing_notes?: string | null;
}

export interface ServiceRequest {
  id: string;
  service_id: string;
  requester_id: string;
  project_title: string;
  supervisor_name?: string | null;
  description: string;
  dimensions?: string | null;
  preferred_date?: string | null;
  scheduled_date?: string | null;
  estimated_completion_date?: string | null;
  recorded_charges_lkr?: number | null;
  rejection_reason?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  requested_quantity?: number | null;
  status: ServiceStatus;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
  service?: LabService;
  requester?: User;
  print_3d_detail?: Print3DDetails | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: "FACILITY_BOOKING" | "MEETING" | "EQUIPMENT" | "SERVICE_3D" | "SYSTEM";
  reference_id?: string | null;
  is_read: boolean;
  created_at: string;
}
