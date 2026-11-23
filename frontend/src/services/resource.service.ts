import { api } from "@/lib/api";
import {
  Equipment,
  EquipmentBorrow,
  Facility,
  FacilityBooking,
  FacilityScheduleSlot,
  Laboratory,
  LabService,
  LecturerAvailability,
  LecturerDiscreteSlot,
  LecturerMeeting,
  MeetingStatus,
  ServiceRequest,
  User,
} from "@/types";

export const resourceService = {
  // Facilities / Lecture Halls
  async getFacilities(type?: string, includeDeactivated = false): Promise<Facility[]> {
    const res = await api.get<Facility[]>("/halls", {
      params: { facility_type: type, include_deactivated: includeDeactivated },
    });
    return res.data;
  },

  async getFacility(id: string): Promise<Facility> {
    const res = await api.get<Facility>(`/halls/${id}`);
    return res.data;
  },

  async getFacilitySchedule(
    facilityId: string,
    startDate: string,
    endDate: string
  ): Promise<FacilityScheduleSlot[]> {
    const res = await api.get<FacilityScheduleSlot[]>(`/halls/${facilityId}/schedule`, {
      params: { start_date: startDate, end_date: endDate },
    });
    return res.data;
  },

  async checkFacilityAvailability(payload: {
    facility_id: string;
    start_time: string;
    end_time: string;
  }): Promise<{
    available: boolean;
    message: string;
    facility_name?: string;
    facility_capacity?: number;
    conflict_start?: string;
    conflict_end?: string;
  }> {
    const res = await api.post("/bookings/check-availability", payload);
    return res.data;
  },

  async createFacility(payload: Partial<Facility>): Promise<Facility> {
    const res = await api.post<Facility>("/halls", payload);
    return res.data;
  },

  async updateFacility(facilityId: string, payload: Partial<Facility>): Promise<Facility> {
    const res = await api.patch<Facility>(`/halls/${facilityId}`, payload);
    return res.data;
  },

  async setFacilityStatus(
    facilityId: string,
    isOperational: boolean,
    reason?: string
  ): Promise<Facility> {
    const res = await api.patch<Facility>(`/halls/${facilityId}/status`, null, {
      params: { is_operational: isOperational, maintenance_reason: reason },
    });
    return res.data;
  },

  async blockFacilityMaintenance(
    facilityId: string,
    payload: { reason: string; start_time: string; end_time: string }
  ): Promise<FacilityBooking> {
    const res = await api.post<FacilityBooking>(`/halls/${facilityId}/maintenance`, payload);
    return res.data;
  },

  async uploadBookingDocument(file: File): Promise<{ url: string; filename: string; size_bytes: number }> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/bookings/upload-document", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  async getFacilityBookings(facilityId?: string, statusFilter?: string): Promise<FacilityBooking[]> {
    const res = await api.get<FacilityBooking[]>("/bookings", {
      params: { facility_id: facilityId, status_filter: statusFilter },
    });
    return res.data;
  },

  async getMyBookings(): Promise<FacilityBooking[]> {
    const res = await api.get<FacilityBooking[]>("/bookings/my-bookings");
    return res.data;
  },

  async createBooking(payload: {
    facility_id: string;
    title: string;
    purpose: string;
    event_description?: string;
    attendee_count: number;
    start_time: string;
    end_time: string;
    document_url?: string;
    document_name?: string;
  }): Promise<FacilityBooking> {
    const res = await api.post<FacilityBooking>("/bookings", payload);
    return res.data;
  },

  async updateBookingStatus(
    bookingId: string,
    status: "APPROVED" | "REJECTED" | "CANCELLED",
    rejectionReason?: string
  ): Promise<FacilityBooking> {
    const res = await api.patch<FacilityBooking>(`/bookings/${bookingId}/status`, {
      status,
      rejection_reason: rejectionReason,
    });
    return res.data;
  },

  async cancelBooking(bookingId: string): Promise<FacilityBooking> {
    const res = await api.patch<FacilityBooking>(`/bookings/${bookingId}/cancel`);
    return res.data;
  },

  // Lecturers & Consultations
  async getLecturers(departmentId?: string, search?: string): Promise<User[]> {
    const res = await api.get<User[]>("/lecturers", {
      params: { department_id: departmentId, search },
    });
    return res.data;
  },

  async getLecturer(lecturerId: string): Promise<User> {
    const res = await api.get<User>(`/lecturers/${lecturerId}`);
    return res.data;
  },

  async getLecturerAvailability(lecturerId: string): Promise<LecturerAvailability[]> {
    const res = await api.get<LecturerAvailability[]>(`/lecturers/${lecturerId}/availability`);
    return res.data;
  },

  async getLecturerDiscreteSlots(lecturerId: string, date: string): Promise<LecturerDiscreteSlot[]> {
    const res = await api.get<LecturerDiscreteSlot[]>(`/lecturers/${lecturerId}/available-slots`, {
      params: { date },
    });
    return res.data;
  },

  async getMyAvailability(): Promise<LecturerAvailability[]> {
    const res = await api.get<LecturerAvailability[]>("/lecturers/me/availability");
    return res.data;
  },

  async createAvailabilitySlot(payload: Partial<LecturerAvailability>): Promise<LecturerAvailability> {
    const res = await api.post<LecturerAvailability>("/lecturers/me/availability", payload);
    return res.data;
  },

  async updateAvailabilitySlot(
    slotId: string,
    payload: Partial<LecturerAvailability>
  ): Promise<LecturerAvailability> {
    const res = await api.put<LecturerAvailability>(`/lecturers/me/availability/${slotId}`, payload);
    return res.data;
  },

  async deleteAvailabilitySlot(slotId: string): Promise<void> {
    await api.delete(`/lecturers/me/availability/${slotId}`);
  },

  async getMeetings(params?: {
    statusFilter?: MeetingStatus;
    upcoming?: boolean;
  }): Promise<LecturerMeeting[]> {
    const res = await api.get<LecturerMeeting[]>("/meetings", {
      params: {
        status_filter: params?.statusFilter,
        upcoming: params?.upcoming,
      },
    });
    return res.data;
  },

  async getMeeting(id: string): Promise<LecturerMeeting> {
    const res = await api.get<LecturerMeeting>(`/meetings/${id}`);
    return res.data;
  },

  async getMyMeetings(): Promise<LecturerMeeting[]> {
    const res = await api.get<LecturerMeeting[]>("/meetings");
    return res.data;
  },

  async bookMeeting(payload: {
    lecturer_id: string;
    availability_slot_id?: string;
    meeting_date: string;
    start_time: string;
    end_time: string;
    subject: string;
    agenda: string;
  }): Promise<LecturerMeeting> {
    const res = await api.post<LecturerMeeting>("/meetings", payload);
    return res.data;
  },

  async updateMeetingStatus(
    meetingId: string,
    status: MeetingStatus,
    reason?: string,
    notes?: string
  ): Promise<LecturerMeeting> {
    const res = await api.patch<LecturerMeeting>(`/meetings/${meetingId}/status`, {
      meeting_status: status,
      decline_reason: reason,
      lecturer_notes: notes,
    });
    return res.data;
  },

  async cancelMeeting(meetingId: string, reason?: string): Promise<LecturerMeeting> {
    const res = await api.post<LecturerMeeting>(`/meetings/${meetingId}/cancel`, {
      cancellation_reason: reason,
    });
    return res.data;
  },

  // Equipment & Labs
  async getLaboratories(departmentId?: string, search?: string): Promise<Laboratory[]> {
    const res = await api.get<Laboratory[]>("/laboratories", {
      params: { department_id: departmentId, search },
    });
    return res.data;
  },

  async getLaboratory(labId: string): Promise<Laboratory> {
    const res = await api.get<Laboratory>(`/laboratories/${labId}`);
    return res.data;
  },

  async createLaboratory(payload: Partial<Laboratory>): Promise<Laboratory> {
    const res = await api.post<Laboratory>("/laboratories", payload);
    return res.data;
  },

  async updateLaboratory(labId: string, payload: Partial<Laboratory>): Promise<Laboratory> {
    const res = await api.put<Laboratory>(`/laboratories/${labId}`, payload);
    return res.data;
  },

  async deleteLaboratory(labId: string): Promise<void> {
    await api.delete(`/laboratories/${labId}`);
  },

  async getEquipment(labId?: string, isBorrowable?: boolean): Promise<Equipment[]> {
    const res = await api.get<Equipment[]>("/equipment", {
      params: { lab_id: labId, is_borrowable: isBorrowable },
    });
    return res.data;
  },

  async getMyEquipmentBorrows(): Promise<EquipmentBorrow[]> {
    const res = await api.get<EquipmentBorrow[]>("/equipment/my-borrows");
    return res.data;
  },

  async getEquipmentBorrows(params?: {
    status?: string;
    equipment_id?: string;
    borrower_id?: string;
  }): Promise<EquipmentBorrow[]> {
    const res = await api.get<EquipmentBorrow[]>("/equipment/borrows", { params });
    return res.data;
  },

  async borrowEquipment(payload: {
    equipment_id: string;
    quantity: number;
    purpose: string;
    expected_borrow_date: string;
    expected_return_date: string;
  }): Promise<EquipmentBorrow> {
    const res = await api.post<EquipmentBorrow>("/equipment/borrow", payload);
    return res.data;
  },

  async updateBorrowStatus(
    borrowId: string,
    payload: {
      status: string;
      collection_instructions?: string;
      rejection_reason?: string;
      is_damaged_or_missing?: boolean;
      damage_notes?: string;
      condition_on_return?: string;
      admin_notes?: string;
    }
  ): Promise<EquipmentBorrow> {
    const res = await api.patch<EquipmentBorrow>(`/equipment/borrows/${borrowId}/status`, payload);
    return res.data;
  },

  async confirmEquipmentReturn(borrowId: string, returnNotes?: string): Promise<EquipmentBorrow> {
    const res = await api.post<EquipmentBorrow>(`/equipment/borrows/${borrowId}/confirm-return`, null, {
      params: { return_notes: returnNotes },
    });
    return res.data;
  },

  async cancelEquipmentBorrow(borrowId: string, reason?: string): Promise<EquipmentBorrow> {
    const res = await api.post<EquipmentBorrow>(`/equipment/borrows/${borrowId}/cancel`, null, {
      params: { reason },
    });
    return res.data;
  },

  // University Services Directory & Marketplace
  async getServicesDirectory(params?: {
    search?: string;
    category?: string;
    labId?: string;
    departmentId?: string;
    availableOnly?: boolean;
  }): Promise<LabService[]> {
    const res = await api.get<LabService[]>("/services/directory", {
      params: {
        search: params?.search,
        category: params?.category,
        lab_id: params?.labId,
        department_id: params?.departmentId,
        available_only: params?.availableOnly,
      },
    });
    return res.data;
  },

  async getServiceCategories(): Promise<string[]> {
    const res = await api.get<string[]>("/services/categories");
    return res.data;
  },

  async getService(serviceId: string): Promise<LabService> {
    const res = await api.get<LabService>(`/services/${serviceId}`);
    return res.data;
  },

  async createService(payload: Partial<LabService>): Promise<LabService> {
    const res = await api.post<LabService>("/services", payload);
    return res.data;
  },

  async updateService(serviceId: string, payload: Partial<LabService>): Promise<LabService> {
    const res = await api.put<LabService>(`/services/${serviceId}`, payload);
    return res.data;
  },

  async deleteService(serviceId: string): Promise<void> {
    await api.delete(`/services/${serviceId}`);
  },

  async uploadServiceImage(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post<{ url: string; filename: string }>("/services/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  async uploadServiceAttachment(file: File): Promise<{ url: string; filename: string; size_bytes: number }> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post<{ url: string; filename: string; size_bytes: number }>("/services/upload-attachment", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  async submitServiceRequest(payload: {
    service_id: string;
    project_title: string;
    description: string;
    requested_quantity?: number;
    supervisor_name?: string;
    dimensions?: string;
    preferred_date?: string;
    attachment_url?: string;
    attachment_name?: string;
  }): Promise<ServiceRequest> {
    const res = await api.post<ServiceRequest>("/services/requests", payload);
    return res.data;
  },

  async getServices(): Promise<LabService[]> {
    const res = await api.get<LabService[]>("/services");
    return res.data;
  },

  async getMyServiceRequests(): Promise<ServiceRequest[]> {
    const res = await api.get<ServiceRequest[]>("/services/requests/my-requests");
    return res.data;
  },

  async getAllServiceRequests(params?: {
    status_filter?: string;
  }): Promise<ServiceRequest[]> {
    const res = await api.get<ServiceRequest[]>("/services/requests", { params });
    return res.data;
  },

  async updateServiceRequestStatus(
    requestId: string,
    payload: {
      status: string;
      scheduled_date?: string;
      estimated_completion_date?: string;
      recorded_charges_lkr?: number;
      rejection_reason?: string;
      admin_notes?: string;
    }
  ): Promise<ServiceRequest> {
    const res = await api.patch<ServiceRequest>(`/services/requests/${requestId}/status`, payload);
    return res.data;
  },

  async cancelServiceRequest(requestId: string, reason?: string): Promise<ServiceRequest> {
    const res = await api.post<ServiceRequest>(`/services/requests/${requestId}/cancel`, null, {
      params: { reason },
    });
    return res.data;
  },

  async create3DPrintRequest(payload: {
    service_id: string;
    project_title: string;
    supervisor_name?: string;
    description: string;
    file_url: string;
    original_filename: string;
    material_type: "PLA" | "ABS" | "PETG" | "RESIN" | "TPU";
    color: string;
    infill_percentage: number;
  }): Promise<ServiceRequest> {
    const res = await api.post<ServiceRequest>("/services/requests/3d-print", payload);
    return res.data;
  },

  // Admin Metrics & Governance
  async getAdminMetrics(): Promise<any> {
    const res = await api.get<any>("/admin/metrics");
    return res.data;
  },

  async getAdminReports(startDate?: string, endDate?: string): Promise<any> {
    const res = await api.get<any>("/admin/reports", {
      params: { start_date: startDate, end_date: endDate },
    });
    return res.data;
  },

  async getAdminUsers(role?: string, search?: string): Promise<User[]> {
    const res = await api.get<User[]>("/admin/users", {
      params: { role, search },
    });
    return res.data;
  },

  async getPendingLecturers(): Promise<User[]> {
    const res = await api.get<User[]>("/admin/lecturers/pending");
    return res.data;
  },

  async verifyLecturer(
    lecturerId: string,
    isVerified: boolean,
    rejectionReason?: string
  ): Promise<User> {
    const res = await api.post<User>(`/admin/lecturers/${lecturerId}/verify`, {
      is_verified: isVerified,
      rejection_reason: rejectionReason,
    });
    return res.data;
  },

  async createAdminAccount(payload: {
    email: string;
    full_name: string;
    password: string;
    role: string;
    department_id?: string;
  }): Promise<User> {
    const res = await api.post<User>("/admin/create-admin", payload);
    return res.data;
  },

  async sendEquipmentReturnReminders(): Promise<{
    reminders_sent: number;
    overdue_count: number;
    upcoming_count: number;
    message: string;
  }> {
    const res = await api.post("/admin/equipment/send-return-reminders");
    return res.data;
  },

  async toggleUserStatus(userId: string, isActive: boolean): Promise<User> {
    const res = await api.patch<User>(`/admin/users/${userId}/status`, null, {
      params: { is_active: isActive },
    });
    return res.data;
  },

  async updateUserRole(userId: string, role: string, isActive?: boolean): Promise<User> {
    const res = await api.patch<User>(`/admin/users/${userId}/role`, {
      role,
      is_active: isActive,
    });
    return res.data;
  },
};
