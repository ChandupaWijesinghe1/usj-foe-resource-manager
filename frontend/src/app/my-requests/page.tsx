"use client";

import React, { useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  MapPin,
  Package,
  Printer,
  Video,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { EquipmentBorrow, FacilityBooking, LecturerMeeting, ServiceRequest } from "@/types";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { resourceService } from "@/services/resource.service";
import { Paperclip, Trash2 } from "lucide-react";

export default function MyRequestsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"halls" | "meetings" | "equipment" | "prints">("halls");

  const [bookings, setBookings] = useState<FacilityBooking[]>([]);
  const [meetings, setMeetings] = useState<LecturerMeeting[]>([]);
  const [borrows, setBorrows] = useState<EquipmentBorrow[]>([]);
  const [prints, setPrints] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [resHalls, resMeetings, resBorrows, resPrints] = await Promise.allSettled([
        resourceService.getMyBookings(),
        resourceService.getMyMeetings(),
        resourceService.getMyEquipmentBorrows(),
        resourceService.getMyServiceRequests(),
      ]);

      if (resHalls.status === "fulfilled") setBookings(resHalls.value);
      if (resMeetings.status === "fulfilled") setMeetings(resMeetings.value);
      if (resBorrows.status === "fulfilled") setBorrows(resBorrows.value);
      if (resPrints.status === "fulfilled") setPrints(resPrints.value);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this reservation request?")) return;
    try {
      await resourceService.cancelBooking(bookingId);
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Failed to cancel booking.");
    }
  };

  const handleCancelMeeting = async (meetingId: string) => {
    const reason = prompt("Optional cancellation reason:");
    if (reason === null) return;
    try {
      await resourceService.cancelMeeting(meetingId, reason || undefined);
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.detail || err.response?.data?.error?.message || "Failed to cancel meeting.");
    }
  };

  const handleConfirmReturn = async (borrowId: string) => {
    const notes = prompt("Enter any notes about return condition (e.g. Returned with original accessories at desk):");
    if (notes === null) return;
    try {
      await resourceService.confirmEquipmentReturn(borrowId, notes.trim() || undefined);
      alert("Return handover confirmed! Please hand over the physical equipment to the lab technician at the counter for condition verification.");
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.detail || err.response?.data?.error?.message || "Could not confirm return.");
    }
  };

  const handleCancelBorrow = async (borrowId: string) => {
    const reason = prompt("Reason for cancelling borrow request:");
    if (reason === null) return;
    try {
      await resourceService.cancelEquipmentBorrow(borrowId, reason.trim() || undefined);
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.detail || err.response?.data?.error?.message || "Failed to cancel borrow request.");
    }
  };

  const handleCancelService = async (requestId: string) => {
    const reason = prompt("Reason for cancelling service request:");
    if (reason === null) return;
    try {
      await resourceService.cancelServiceRequest(requestId, reason.trim() || undefined);
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.detail || err.response?.data?.error?.message || "Failed to cancel service request.");
    }
  };

  const handleAcceptPrintQuote = async (requestId: string) => {
    try {
      await api.patch(`/services/requests/${requestId}/accept-estimate`);
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Could not accept estimate.");
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "APPROVED":
      case "ACCEPTED":
      case "CONFIRMED":
      case "COMPLETED":
      case "RETURNED":
      case "READY_FOR_PICKUP":
        return "success";
      case "PENDING":
      case "REQUESTED":
      case "SUBMITTED":
      case "SCHEDULED":
      case "IN_PROGRESS":
      case "ISSUED":
        return "warning";
      case "ESTIMATED":
        return "info";
      default:
        return "destructive";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight">My Petitions & Activity Center</h1>
        <p className="text-sm text-muted-foreground">
          Track the live approval and processing status of your facility bookings, loans, and print jobs
        </p>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b space-x-4">
        <button
          className={`flex items-center gap-2 pb-2.5 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "halls"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("halls")}
        >
          <CalendarDays className="h-4 w-4" />
          <span>Hall Bookings ({bookings.length})</span>
        </button>

        <button
          className={`flex items-center gap-2 pb-2.5 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "meetings"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("meetings")}
        >
          <Clock className="h-4 w-4" />
          <span>Lecturer Meetings ({meetings.length})</span>
        </button>

        <button
          className={`flex items-center gap-2 pb-2.5 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "equipment"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("equipment")}
        >
          <Wrench className="h-4 w-4" />
          <span>Equipment Borrows ({borrows.length})</span>
        </button>

        <button
          className={`flex items-center gap-2 pb-2.5 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "prints"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("prints")}
        >
          <Printer className="h-4 w-4" />
          <span>Lab Services & 3D Prints ({prints.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Fetching records...</div>
      ) : (
        <div>
          {/* Hall Bookings Tab */}
          {activeTab === "halls" && (
            <div className="space-y-3">
              {bookings.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-xs text-muted-foreground">
                    No lecture hall bookings recorded yet.
                  </CardContent>
                </Card>
              ) : (
                bookings.map((b) => (
                  <Card key={b.id} className="p-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{b.title}</span>
                          <Badge variant={getStatusBadgeVariant(b.status)}>{b.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Facility: <span className="font-medium text-foreground">{b.facility?.name}</span> ({b.facility?.building}) • Participants: <span className="font-semibold text-foreground">{b.attendee_count}</span>
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {formatDateTime(b.start_time)} → {formatDateTime(b.end_time)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <strong>Purpose:</strong> {b.purpose}
                        </p>
                        {b.event_description && (
                          <p className="text-[11px] text-muted-foreground italic">
                            &quot;{b.event_description}&quot;
                          </p>
                        )}
                        {b.document_url && (
                          <div className="pt-1">
                            <a
                              href={b.document_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                            >
                              <Paperclip className="h-3 w-3" />
                              <span>Attached: {b.document_name || "Approval Document"}</span>
                            </a>
                          </div>
                        )}
                        {b.rejection_reason && (
                          <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive mt-1">
                            <strong>Declined:</strong> {b.rejection_reason}
                          </div>
                        )}
                      </div>

                      {(b.status === "PENDING" || b.status === "APPROVED") && (
                        <div className="shrink-0 self-end sm:self-start">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelBooking(b.id)}
                            className="text-xs text-destructive hover:bg-destructive/10 h-8 gap-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Cancel Booking</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Lecturer Meetings Tab */}
          {activeTab === "meetings" && (
            <div className="space-y-3">
              {meetings.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-xs text-muted-foreground">
                    No academic consultation meetings requested yet.
                  </CardContent>
                </Card>
              ) : (
                meetings.map((m) => {
                  const isCancellable =
                    m.meeting_status === "PENDING" ||
                    m.meeting_status === "REQUESTED" ||
                    m.meeting_status === "ACCEPTED" ||
                    m.meeting_status === "CONFIRMED";

                  return (
                    <Card key={m.id} className="p-4 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">{m.subject}</span>
                            <Badge variant={getStatusBadgeVariant(m.meeting_status)}>{m.meeting_status}</Badge>
                          </div>

                          <p className="text-xs text-muted-foreground">
                            Lecturer: <span className="font-medium text-foreground">{m.lecturer?.full_name || "Academic Staff"}</span> • Date:{" "}
                            <span className="font-medium text-foreground">{m.meeting_date}</span> ({m.start_time.slice(0, 5)} - {m.end_time.slice(0, 5)})
                          </p>

                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Agenda:</span> {m.agenda}
                          </p>

                          {m.availability_slot && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                              {m.availability_slot.location_type === "ONLINE_CALL" ? (
                                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                                  <Video className="h-3.5 w-3.5" />
                                  <span>Online Meeting:</span>
                                  {m.availability_slot.room_or_link.startsWith("http") ? (
                                    <a
                                      href={m.availability_slot.room_or_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-0.5 underline font-semibold"
                                    >
                                      Join Video Call <ExternalLink className="h-3 w-3" />
                                    </a>
                                  ) : (
                                    <span>{m.availability_slot.room_or_link}</span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                                  <MapPin className="h-3.5 w-3.5" />
                                  <span>Location: {m.availability_slot.room_or_link}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {m.decline_reason && (
                            <p className="text-xs text-destructive font-medium pt-1">
                              Lecturer Note / Decline Reason: {m.decline_reason}
                            </p>
                          )}

                          {m.lecturer_notes && (
                            <p className="text-xs text-primary font-medium">
                              Staff Notes: {m.lecturer_notes}
                            </p>
                          )}
                        </div>

                        {isCancellable && (
                          <div className="shrink-0 self-end sm:self-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelMeeting(m.id)}
                              className="text-xs text-destructive hover:bg-destructive/10 h-8 gap-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Cancel Request</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* Equipment Borrows Tab */}
          {activeTab === "equipment" && (
            <div className="space-y-3">
              {borrows.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-xs text-muted-foreground">
                    No equipment borrow requests logged yet.
                  </CardContent>
                </Card>
              ) : (
                borrows.map((eq) => {
                  const canCancel = eq.status === "PENDING" || eq.status === "APPROVED";
                  const canConfirmReturn = (eq.status === "IN_PROGRESS" || eq.status === "ISSUED") && !eq.student_confirmed_return;

                  return (
                    <Card key={eq.id} className="p-4 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">
                              {eq.equipment?.name || "Equipment Unit"}
                            </span>
                            <Badge variant={getStatusBadgeVariant(eq.status)}>{eq.status}</Badge>
                            {eq.student_confirmed_return && eq.status !== "COMPLETED" && eq.status !== "RETURNED" && (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 text-[10px]">
                                Return Logged by Student
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground">
                            {eq.equipment?.laboratory?.name && (
                              <span>Lab: <strong className="text-foreground">{eq.equipment.laboratory.name}</strong> • </span>
                            )}
                            Category: {eq.equipment?.category || "General"} • Quantity: <strong className="text-foreground">{eq.quantity} unit(s)</strong>
                          </p>

                          <p className="text-xs text-muted-foreground font-mono">
                            Expected: {formatDateTime(eq.expected_borrow_date)} → {formatDateTime(eq.expected_return_date)}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            <strong>Purpose:</strong> {eq.purpose}
                          </p>

                          {/* Collection Instructions from Admin */}
                          {eq.collection_instructions && (
                            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 p-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                              <span className="font-bold flex items-center gap-1 mb-0.5">
                                <MapPin className="h-3.5 w-3.5 shrink-0" /> Collection Instructions:
                              </span>
                              <span>{eq.collection_instructions}</span>
                            </div>
                          )}

                          {/* Rejection Note */}
                          {eq.rejection_reason && (
                            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive">
                              <strong>Declined by Lab Admin:</strong> {eq.rejection_reason}
                            </div>
                          )}

                          {/* Damage / Missing Alert */}
                          {eq.is_damaged_or_missing && (
                            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                              <strong className="block font-bold">Item Inspection Flag: Damaged / Needs Repair</strong>
                              <span>{eq.damage_notes || "Item condition flagged upon return check-in."}</span>
                            </div>
                          )}

                          {/* Return Verification Info */}
                          {eq.condition_on_return && !eq.is_damaged_or_missing && (
                            <p className="text-[11px] text-muted-foreground">
                              <strong>Return Verification:</strong> {eq.condition_on_return}
                              {eq.actual_return_date && ` (Checked in: ${formatDateTime(eq.actual_return_date)})`}
                            </p>
                          )}
                        </div>

                        <div className="flex sm:flex-col items-end gap-2 shrink-0">
                          {canConfirmReturn && (
                            <Button
                              variant="usj"
                              size="sm"
                              className="text-xs gap-1.5 h-8 font-semibold shadow-xs"
                              onClick={() => handleConfirmReturn(eq.id)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Confirm Return Handover</span>
                            </Button>
                          )}

                          {canCancel && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs text-destructive hover:bg-destructive/10 h-8 gap-1"
                              onClick={() => handleCancelBorrow(eq.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Cancel Request</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* Lab Services & 3D Print Orders Tab */}
          {activeTab === "prints" && (
            <div className="space-y-3">
              {prints.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-xs text-muted-foreground">
                    No laboratory service or 3D print orders submitted yet.
                  </CardContent>
                </Card>
              ) : (
                prints.map((p) => {
                  const canCancel = p.status === "PENDING" || p.status === "APPROVED" || p.status === "SCHEDULED" || p.status === "SUBMITTED";

                  return (
                    <Card key={p.id} className="p-4 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">{p.project_title}</span>
                            <Badge variant={getStatusBadgeVariant(p.status)}>{p.status}</Badge>
                            {p.service?.service_name && (
                              <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium text-foreground">
                                {p.service.service_name}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground">
                            {p.service?.laboratory?.name && (
                              <span>Facility: <strong className="text-foreground">{p.service.laboratory.name}</strong> • </span>
                            )}
                            {p.supervisor_name && <span>Supervisor: {p.supervisor_name} • </span>}
                            {p.requested_quantity && <span>Units: {p.requested_quantity}</span>}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            <strong>Description:</strong> {p.description}
                          </p>

                          {/* Technical Specifications */}
                          {p.dimensions && (
                            <p className="text-xs text-muted-foreground">
                              <strong>Dimensions / Specifications:</strong> {p.dimensions}
                            </p>
                          )}

                          {/* Preferred or Scheduled Dates */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                            {p.preferred_date && (
                              <span className="text-muted-foreground">
                                Preferred Date: <strong className="text-foreground">{p.preferred_date.slice(0, 10)}</strong>
                              </span>
                            )}
                            {p.scheduled_date && (
                              <span className="text-blue-700 dark:text-blue-400 font-medium">
                                Scheduled Appointment: {formatDateTime(p.scheduled_date)}
                              </span>
                            )}
                            {p.estimated_completion_date && (
                              <span className="text-amber-700 dark:text-amber-400 font-medium">
                                Est. Completion: {formatDateTime(p.estimated_completion_date)}
                              </span>
                            )}
                          </div>

                          {/* Recorded / Quoted Charges */}
                          {(p.recorded_charges_lkr !== null && p.recorded_charges_lkr !== undefined) ? (
                            <div className="inline-block rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                              Recorded Charges: LKR {Number(p.recorded_charges_lkr).toFixed(2)}
                            </div>
                          ) : p.print_3d_detail?.calculated_cost_lkr ? (
                            <div className="inline-block rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                              Calculated 3D Print Quote: LKR {Number(p.print_3d_detail.calculated_cost_lkr).toFixed(2)} ({p.print_3d_detail.estimated_filament_grams}g • {p.print_3d_detail.estimated_print_hours} hrs)
                            </div>
                          ) : null}

                          {/* Attachments */}
                          {(p.attachment_url || p.print_3d_detail?.file_url) && (
                            <div className="pt-1">
                              <a
                                href={p.attachment_url || p.print_3d_detail?.file_url || "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                              >
                                <Paperclip className="h-3.5 w-3.5" />
                                <span>Attached File: {p.attachment_name || p.print_3d_detail?.original_filename || "Download Attachment"}</span>
                              </a>
                            </div>
                          )}

                          {/* Technician Notes */}
                          {p.admin_notes && (
                            <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                              <strong>Technician / Admin Notes:</strong> {p.admin_notes}
                            </div>
                          )}

                          {/* Rejection Note */}
                          {p.rejection_reason && (
                            <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                              <strong>Declined:</strong> {p.rejection_reason}
                            </div>
                          )}
                        </div>

                        <div className="flex sm:flex-col items-end gap-2 shrink-0">
                          {p.status === "ESTIMATED" && (
                            <Button
                              variant="usj"
                              size="sm"
                              className="gap-1.5 shrink-0 text-xs"
                              onClick={() => handleAcceptPrintQuote(p.id)}
                            >
                              <Check className="h-4 w-4" /> Accept Quote & Print
                            </Button>
                          )}

                          {canCancel && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs text-destructive hover:bg-destructive/10 h-8 gap-1"
                              onClick={() => handleCancelService(p.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Cancel Request</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
