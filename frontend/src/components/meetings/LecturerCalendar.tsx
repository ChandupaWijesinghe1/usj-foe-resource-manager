"use client";

import React, { useState } from "react";
import {
  addDays,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  GraduationCap,
  MapPin,
  Plus,
  User as UserIcon,
  Video,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LecturerAvailability, LecturerMeeting, MeetingStatus } from "@/types";

interface LecturerCalendarProps {
  meetings: LecturerMeeting[];
  availabilities: LecturerAvailability[];
  onAcceptMeeting: (meetingId: string) => void;
  onRejectMeeting: (meetingId: string, reason: string) => void;
  onCancelMeeting: (meetingId: string, reason: string) => void;
  onOpenAddAvailability: () => void;
  isActionPending?: boolean;
}

export function LecturerCalendar({
  meetings,
  availabilities,
  onAcceptMeeting,
  onRejectMeeting,
  onCancelMeeting,
  onOpenAddAvailability,
  isActionPending = false,
}: LecturerCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday start
  );
  const [selectedMeeting, setSelectedMeeting] = useState<LecturerMeeting | null>(null);
  const [rejectPromptOpen, setRejectPromptOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [cancelPromptOpen, setCancelPromptOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const prevWeek = () => setCurrentWeekStart(addDays(currentWeekStart, -7));
  const nextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));
  const todayWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const formatTimeSlot = (timeStr: string) => {
    try {
      const [h, m] = timeStr.split(":");
      const hour = parseInt(h, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const h12 = hour % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    } catch {
      return timeStr.slice(0, 5);
    }
  };

  const getStatusBadge = (status: MeetingStatus) => {
    switch (status) {
      case "ACCEPTED":
      case "CONFIRMED":
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px]">Confirmed</Badge>;
      case "PENDING":
      case "REQUESTED":
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0 text-[10px]">Pending</Badge>;
      case "REJECTED":
      case "DECLINED":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-0 text-[10px]">Declined</Badge>;
      case "CANCELLED":
        return <Badge variant="outline" className="text-muted-foreground text-[10px]">Cancelled</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Calendar Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={todayWeek} className="text-xs h-8">
            Today
          </Button>
          <div className="flex items-center border rounded-lg bg-background">
            <button
              onClick={prevWeek}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-l-md"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs font-semibold text-foreground whitespace-nowrap">
              {format(currentWeekStart, "MMM d")} - {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
            </span>
            <button
              onClick={nextWeek}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-r-md"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="usj"
            onClick={onOpenAddAvailability}
            className="text-xs h-8 font-semibold gap-1.5 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Office Hours</span>
          </Button>
        </div>
      </div>

      {/* 7-Day Week Columns Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {weekDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isToday = isSameDay(day, new Date());
          const dayIndex = (day.getDay() + 6) % 7; // Monday = 0, Sunday = 6

          // Filter meetings for this day
          const dayMeetings = meetings.filter((m) => m.meeting_date === dateStr);

          // Filter availability slots applicable to this day
          const dayAvailabilities = availabilities.filter((a) => {
            if (a.specific_date) {
              return a.specific_date === dateStr;
            }
            return a.day_of_week === dayIndex;
          });

          return (
            <div
              key={dateStr}
              className={`flex flex-col rounded-xl border bg-card p-2.5 min-h-[220px] transition-all ${
                isToday ? "ring-2 ring-primary border-primary/50 shadow-xs" : "border-border"
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between pb-2 border-b mb-2">
                <div>
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground block">
                    {format(day, "EEE")}
                  </span>
                  <span className={`text-sm font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                    {format(day, "MMM d")}
                  </span>
                </div>
                {isToday && (
                  <Badge className="bg-primary text-white text-[9px] px-1 py-0">Today</Badge>
                )}
              </div>

              {/* Availability Windows Badge */}
              {dayAvailabilities.length > 0 && (
                <div className="space-y-1 mb-2">
                  {dayAvailabilities.map((slot) => (
                    <div
                      key={slot.id}
                      className="px-1.5 py-1 rounded bg-muted/60 text-[10px] text-muted-foreground flex items-center justify-between border border-border/50"
                    >
                      <span className="font-semibold text-foreground">
                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                      </span>
                      <span className="text-[9px] truncate max-w-[70px] text-muted-foreground">
                        {slot.location_type === "ONLINE_CALL" ? "Online" : "Office"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Meetings List */}
              <div className="space-y-1.5 flex-1">
                {dayMeetings.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center p-2">
                    <span className="text-[10px] text-muted-foreground/60 italic">No appointments</span>
                  </div>
                ) : (
                  dayMeetings.map((meeting) => {
                    const isAccepted = meeting.meeting_status === "ACCEPTED" || meeting.meeting_status === "CONFIRMED";
                    const isPending = meeting.meeting_status === "PENDING" || meeting.meeting_status === "REQUESTED";

                    return (
                      <button
                        key={meeting.id}
                        type="button"
                        onClick={() => setSelectedMeeting(meeting)}
                        className={`w-full text-left p-1.5 rounded-lg border text-[11px] transition-all cursor-pointer ${
                          isAccepted
                            ? "border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100/70 dark:border-emerald-900 dark:bg-emerald-950/40"
                            : isPending
                            ? "border-amber-300 bg-amber-50/70 hover:bg-amber-100/70 dark:border-amber-900 dark:bg-amber-950/40"
                            : "border-border/60 bg-muted/40 opacity-70"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-bold text-foreground text-[10px]">
                            {formatTimeSlot(meeting.start_time)}
                          </span>
                          {getStatusBadge(meeting.meeting_status)}
                        </div>
                        <p className="font-semibold text-foreground truncate text-[11px]">
                          {meeting.student?.full_name || "Student"}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {meeting.subject}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Meeting Details Dialog */}
      {selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b px-5 py-3.5 bg-muted/40">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Consultation Appointment</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedMeeting.meeting_date} • {formatTimeSlot(selectedMeeting.start_time)} - {formatTimeSlot(selectedMeeting.end_time)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedMeeting(null);
                  setRejectPromptOpen(false);
                  setCancelPromptOpen(false);
                }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground">Status</span>
                <div>{getStatusBadge(selectedMeeting.meeting_status)}</div>
              </div>

              {/* Student Details */}
              <div className="p-3 rounded-lg bg-muted/30 border space-y-1">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Student</span>
                <p className="font-bold text-foreground text-sm">
                  {selectedMeeting.student?.full_name || "Student Consultation"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {selectedMeeting.student?.email}
                  {selectedMeeting.student?.registration_number && ` • ${selectedMeeting.student.registration_number}`}
                </p>
              </div>

              {/* Topic & Agenda */}
              <div className="space-y-1">
                <span className="text-muted-foreground font-semibold">Discussion Topic:</span>
                <p className="font-bold text-foreground">{selectedMeeting.subject}</p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground font-semibold">Agenda / Description:</span>
                <p className="p-2.5 rounded-lg bg-muted/30 border text-muted-foreground text-[11px] whitespace-pre-wrap">
                  {selectedMeeting.agenda}
                </p>
              </div>

              {/* Location or Online Call Link */}
              {selectedMeeting.availability_slot && (
                <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedMeeting.availability_slot.location_type === "ONLINE_CALL" ? (
                      <Video className="h-4 w-4 text-blue-500" />
                    ) : (
                      <MapPin className="h-4 w-4 text-emerald-600" />
                    )}
                    <div>
                      <span className="text-[10px] text-muted-foreground font-medium block">
                        {selectedMeeting.availability_slot.location_type === "ONLINE_CALL" ? "Online Video Meeting" : "Physical Office Room"}
                      </span>
                      <span className="font-semibold text-foreground text-xs">
                        {selectedMeeting.availability_slot.room_or_link}
                      </span>
                    </div>
                  </div>
                  {selectedMeeting.availability_slot.location_type === "ONLINE_CALL" && selectedMeeting.availability_slot.room_or_link.startsWith("http") && (
                    <a
                      href={selectedMeeting.availability_slot.room_or_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                    >
                      <span>Join</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Rejection / Decline Reason if applicable */}
              {selectedMeeting.decline_reason && (
                <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[11px]">
                  <span className="font-bold block mb-0.5">Note:</span>
                  <span>{selectedMeeting.decline_reason}</span>
                </div>
              )}

              {/* Reject prompt box */}
              {rejectPromptOpen && (
                <div className="space-y-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                  <label className="font-semibold text-destructive text-[11px] block">
                    Reason for Declining (sent to student):
                  </label>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Schedule clash with Faculty Board meeting"
                    className="w-full text-xs rounded border p-1.5 bg-background"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setRejectPromptOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs font-semibold"
                      disabled={isActionPending}
                      onClick={() => {
                        onRejectMeeting(selectedMeeting.id, rejectReason || "Declined due to scheduling clash.");
                        setSelectedMeeting(null);
                        setRejectPromptOpen(false);
                      }}
                    >
                      Confirm Decline
                    </Button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {(selectedMeeting.meeting_status === "PENDING" || selectedMeeting.meeting_status === "REQUESTED") && !rejectPromptOpen && (
                <div className="flex items-center justify-end gap-2 pt-3 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs text-destructive hover:bg-destructive/10 h-8 gap-1"
                    onClick={() => setRejectPromptOpen(true)}
                    disabled={isActionPending}
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Decline</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="usj"
                    className="text-xs font-semibold h-8 gap-1"
                    disabled={isActionPending}
                    onClick={() => {
                      onAcceptMeeting(selectedMeeting.id);
                      setSelectedMeeting(null);
                    }}
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Accept Appointment</span>
                  </Button>
                </div>
              )}

              {(selectedMeeting.meeting_status === "ACCEPTED" || selectedMeeting.meeting_status === "CONFIRMED") && (
                <div className="flex items-center justify-between pt-3 border-t">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-destructive hover:bg-destructive/10 h-8"
                    onClick={() => {
                      if (confirm("Are you sure you want to cancel this confirmed consultation?")) {
                        onCancelMeeting(selectedMeeting.id, "Lecturer had an urgent official scheduling conflict.");
                        setSelectedMeeting(null);
                      }
                    }}
                    disabled={isActionPending}
                  >
                    Cancel Meeting
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8"
                    onClick={() => setSelectedMeeting(null)}
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
