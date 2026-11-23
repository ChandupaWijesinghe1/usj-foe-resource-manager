"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  Clock,
  ExternalLink,
  GraduationCap,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  Video,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AvailabilityModal } from "@/components/meetings/AvailabilityModal";
import { LecturerCalendar } from "@/components/meetings/LecturerCalendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resourceService } from "@/services/resource.service";
import { LecturerAvailability, LecturerMeeting, MeetingStatus } from "@/types";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function LecturerDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"calendar" | "pending" | "availability">("calendar");

  // Modal states
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<LecturerAvailability | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Queries
  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ["lecturer-meetings"],
    queryFn: () => resourceService.getMyMeetings(),
  });

  const { data: availabilities = [], isLoading: availabilitiesLoading } = useQuery({
    queryKey: ["lecturer-availabilities"],
    queryFn: () => resourceService.getMyAvailability(),
  });

  const { data: hallBookings = [] } = useQuery({
    queryKey: ["lecturer-hall-bookings"],
    queryFn: () => resourceService.getFacilityBookings(),
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: MeetingStatus;
      reason?: string;
    }) => resourceService.updateMeetingStatus(id, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lecturer-meetings"] });
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.error?.message || err.response?.data?.detail || "Failed to update meeting status.");
    },
  });

  const cancelMeetingMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      resourceService.cancelMeeting(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lecturer-meetings"] });
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.error?.message || "Failed to cancel meeting.");
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: (slotId: string) => resourceService.deleteAvailabilitySlot(slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lecturer-availabilities"] });
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.error?.message || "Failed to delete availability slot.");
    },
  });

  const pendingRequests = meetings.filter(
    (m) => m.meeting_status === "PENDING" || m.meeting_status === "REQUESTED"
  );
  const confirmedMeetings = meetings.filter(
    (m) => m.meeting_status === "ACCEPTED" || m.meeting_status === "CONFIRMED"
  );

  return (
    <DashboardLayout allowedRoles={["LECTURER", "SUPER_ADMIN"]}>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="rounded-card border bg-card surface-hero p-6 sm:p-8 shadow-elevation-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white p-1 shadow-elevation-sm ring-1 ring-border">
              <img
                src="/logo.jpg"
                alt="University Emblem"
                className="h-full w-full object-cover rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Dr./Prof. {user?.full_name}
                </h1>
                <Badge variant="gold" className="text-[10px] px-1.5 py-0">
                  Faculty Lecturer
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Academic Staff Portal · Faculty of Engineering, USJ
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              size="sm"
              variant="usj"
              onClick={() => {
                setEditingSlot(null);
                setIsAvailabilityModalOpen(true);
              }}
              className="font-semibold text-xs gap-1.5 shadow-elevation-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Publish Office Hours</span>
            </Button>
            <Link href="/halls">
              <Button size="sm" variant="outline" className="text-xs">
                Book Lecture Hall
              </Button>
            </Link>
          </div>
        </div>

        {/* Real-Time KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card
            className="border-l-4 border-l-amber-500 cursor-pointer hover:shadow-xs transition-shadow"
            onClick={() => setActiveTab("pending")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                Pending Student Petitions
              </CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRequests.length}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Require your review & response</p>
            </CardContent>
          </Card>

          <Card
            className="border-l-4 border-l-emerald-500 cursor-pointer hover:shadow-xs transition-shadow"
            onClick={() => setActiveTab("calendar")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                Confirmed Consultations
              </CardTitle>
              <UserCheck className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{confirmedMeetings.length}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Upcoming active appointments</p>
            </CardContent>
          </Card>

          <Card
            className="border-l-4 border-l-primary cursor-pointer hover:shadow-xs transition-shadow"
            onClick={() => setActiveTab("availability")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                Office Hour Schedules
              </CardTitle>
              <CalendarDays className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{availabilities.length}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Active availability windows</p>
            </CardContent>
          </Card>
        </div>

        {actionError && (
          <div className="rounded-md bg-destructive/15 p-3 text-xs font-medium text-destructive">
            {actionError}
          </div>
        )}

        {/* View Switcher Tabs */}
        <div className="flex border-b space-x-4">
          <button
            className={`flex items-center gap-2 pb-2.5 text-xs font-bold transition-colors border-b-2 ${
              activeTab === "calendar"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("calendar")}
          >
            <CalendarDays className="h-4 w-4" />
            <span>Consultation Calendar View</span>
          </button>

          <button
            className={`flex items-center gap-2 pb-2.5 text-xs font-bold transition-colors border-b-2 ${
              activeTab === "pending"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("pending")}
          >
            <Clock className="h-4 w-4" />
            <span>Pending Petitions Queue ({pendingRequests.length})</span>
          </button>

          <button
            className={`flex items-center gap-2 pb-2.5 text-xs font-bold transition-colors border-b-2 ${
              activeTab === "availability"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("availability")}
          >
            <Users className="h-4 w-4" />
            <span>Office Hours Configuration ({availabilities.length})</span>
          </button>
        </div>

        {/* Tab 1: Interactive Calendar View */}
        {activeTab === "calendar" && (
          <LecturerCalendar
            meetings={meetings}
            availabilities={availabilities}
            onAcceptMeeting={(id) => updateStatusMutation.mutate({ id, status: "ACCEPTED" })}
            onRejectMeeting={(id, reason) =>
              updateStatusMutation.mutate({ id, status: "REJECTED", reason })
            }
            onCancelMeeting={(id, reason) => cancelMeetingMutation.mutate({ id, reason })}
            onOpenAddAvailability={() => {
              setEditingSlot(null);
              setIsAvailabilityModalOpen(true);
            }}
            isActionPending={updateStatusMutation.isPending || cancelMeetingMutation.isPending}
          />
        )}

        {/* Tab 2: Actionable Pending Requests Queue */}
        {activeTab === "pending" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Incoming Consultation Requests</CardTitle>
              <CardDescription className="text-xs">
                Review and accept student office-hour consultation requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {meetingsLoading ? (
                <p className="text-xs text-muted-foreground py-6 text-center">Loading requests...</p>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground space-y-1">
                  <Check className="h-7 w-7 text-emerald-500 mx-auto mb-1" />
                  <p className="font-semibold text-foreground text-sm">All student petitions are reviewed!</p>
                  <p>When students submit requests for your office hours, they will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                    >
                      <div className="space-y-1.5 text-xs flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm">{req.subject}</span>
                          <Badge className="bg-amber-100 text-amber-800 text-[10px] font-semibold">
                            Pending Review
                          </Badge>
                        </div>

                        <p className="text-muted-foreground text-[11px]">
                          Student:{" "}
                          <span className="font-semibold text-foreground">
                            {req.student?.full_name || "Undergraduate Student"}
                          </span>{" "}
                          ({req.student?.email}) • Reg: {req.student?.registration_number || "N/A"}
                        </p>

                        <p className="text-muted-foreground text-[11px]">
                          Date: <span className="font-semibold text-foreground">{req.meeting_date}</span>{" "}
                          ({req.start_time.slice(0, 5)} - {req.end_time.slice(0, 5)})
                        </p>

                        <div className="p-2.5 rounded-lg bg-muted/40 border text-muted-foreground text-[11px] mt-1 italic">
                          &quot;{req.agenda}&quot;
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Button
                          size="sm"
                          variant="usj"
                          className="text-xs font-semibold h-8 gap-1 shadow-xs"
                          disabled={updateStatusMutation.isPending}
                          onClick={() =>
                            updateStatusMutation.mutate({ id: req.id, status: "ACCEPTED" })
                          }
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Accept</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs text-destructive hover:bg-destructive/10 h-8 gap-1"
                          disabled={updateStatusMutation.isPending}
                          onClick={() => {
                            const reason = prompt("Enter reason for declining (optional):");
                            updateStatusMutation.mutate({
                              id: req.id,
                              status: "REJECTED",
                              reason: reason || "Declined due to scheduling clash.",
                            });
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Decline</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tab 3: Office Hours Configuration */}
        {activeTab === "availability" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">Configured Office Hours</h2>
                <p className="text-xs text-muted-foreground">
                  Published consultation windows where students can request discrete appointments
                </p>
              </div>
              <Button
                size="sm"
                variant="usj"
                onClick={() => {
                  setEditingSlot(null);
                  setIsAvailabilityModalOpen(true);
                }}
                className="text-xs h-8 font-semibold gap-1.5 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Schedule Window</span>
              </Button>
            </div>

            {availabilitiesLoading ? (
              <p className="text-xs text-muted-foreground py-6 text-center">Loading schedules...</p>
            ) : availabilities.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-xs text-muted-foreground space-y-2">
                  <CalendarDays className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                  <p className="font-semibold text-foreground text-sm">No office hours published yet.</p>
                  <p>
                    Students cannot schedule consultations until you add at least one weekly or
                    date-specific availability slot.
                  </p>
                  <Button
                    size="sm"
                    variant="usj"
                    onClick={() => {
                      setEditingSlot(null);
                      setIsAvailabilityModalOpen(true);
                    }}
                    className="mt-2 text-xs font-semibold"
                  >
                    Add First Office Hour Slot
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availabilities.map((slot) => (
                  <Card key={slot.id} className="p-4 flex flex-col justify-between hover:shadow-xs transition-shadow">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs font-semibold">
                          {slot.specific_date ? `Date: ${slot.specific_date}` : `Every ${WEEKDAYS[slot.day_of_week]}`}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={
                            slot.is_active
                              ? "bg-emerald-100 text-emerald-800 text-[10px]"
                              : "bg-muted text-muted-foreground text-[10px]"
                          }
                        >
                          {slot.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5 text-base font-bold text-foreground">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-1.5">
                          {slot.location_type === "ONLINE_CALL" ? (
                            <Video className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          ) : (
                            <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          )}
                          <span className="truncate">{slot.room_or_link}</span>
                        </div>
                        <p className="text-[11px]">
                          Slot Duration: <span className="font-semibold">{slot.slot_duration_minutes} min</span> • Max capacity: <span className="font-semibold">{slot.max_students_per_slot || 1} student(s)</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t mt-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                        onClick={() => {
                          setEditingSlot(slot);
                          setIsAvailabilityModalOpen(true);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10 gap-1"
                        disabled={deleteSlotMutation.isPending}
                        onClick={() => {
                          if (confirm("Remove this availability window?")) {
                            deleteSlotMutation.mutate(slot.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Remove</span>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Availability Modal Dialog */}
        <AvailabilityModal
          isOpen={isAvailabilityModalOpen}
          onClose={() => {
            setIsAvailabilityModalOpen(false);
            setEditingSlot(null);
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["lecturer-availabilities"] });
          }}
          editingSlot={editingSlot}
        />
      </div>
    </DashboardLayout>
  );
}
