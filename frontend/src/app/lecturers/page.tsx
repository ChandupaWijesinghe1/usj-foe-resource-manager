"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Search,
  Sparkles,
  User as UserIcon,
  Video,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { SlotPicker } from "@/components/meetings/SlotPicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { resourceService } from "@/services/resource.service";
import { LecturerDiscreteSlot, User } from "@/types";

export default function LecturersPage() {
  const { user } = useAuth();
  const [lecturers, setLecturers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");

  // Booking Modal State
  const [selectedLecturer, setSelectedLecturer] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<LecturerDiscreteSlot | null>(null);
  const [subject, setSubject] = useState("");
  const [agenda, setAgenda] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchLecturers();
  }, [selectedDept, searchQuery]);

  const fetchLecturers = async () => {
    setLoading(true);
    try {
      const deptFilter = selectedDept !== "ALL" ? selectedDept : undefined;
      const data = await resourceService.getLecturers(deptFilter, searchQuery || undefined);
      setLecturers(data);
    } catch {
      // Fallback display
      setLecturers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBooking = (lec: User) => {
    setSelectedLecturer(lec);
    setSelectedSlot(null);
    setSubject("");
    setAgenda("");
    setStatusMsg(null);
    setSelectedDate(new Date().toISOString().split("T")[0]);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLecturer || !selectedSlot) {
      setStatusMsg({ type: "error", text: "Please select an available time slot." });
      return;
    }

    if (!subject.trim()) {
      setStatusMsg({ type: "error", text: "Please enter a consultation topic." });
      return;
    }

    if (!agenda.trim()) {
      setStatusMsg({ type: "error", text: "Please provide a brief description/agenda." });
      return;
    }

    setSubmitting(true);
    setStatusMsg(null);

    try {
      await resourceService.bookMeeting({
        lecturer_id: selectedLecturer.id,
        availability_slot_id: selectedSlot.availability_slot_id,
        meeting_date: selectedDate,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        subject: subject.trim(),
        agenda: agenda.trim(),
      });

      setStatusMsg({
        type: "success",
        text: `Consultation request successfully submitted to Dr./Prof. ${selectedLecturer.full_name}!`,
      });

      // Clear selection after short delay
      setTimeout(() => {
        setSelectedLecturer(null);
        setSelectedSlot(null);
      }, 2500);
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text:
          err.response?.data?.error?.message ||
          err.response?.data?.detail ||
          "Failed to request consultation meeting. Please try another slot.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Lecturer Consultations</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Browse academic staff and schedule consultation slots
            </p>
          </div>
        </div>

        {/* Search & Department Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search lecturers by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "ALL", label: "All Departments" },
              { id: "DCE", label: "Computer" },
              { id: "DEE", label: "Electrical" },
              { id: "DME", label: "Mechanical" },
              { id: "DCEE", label: "Civil" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedDept(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedDept === tab.id
                    ? "bg-primary text-primary-foreground shadow-elevation-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lecturers Grid */}
        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            <Clock className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
            Loading academic faculty directory...
          </div>
        ) : lecturers.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground border rounded-xl border-dashed p-6">
            <GraduationCap className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
            <p className="font-semibold text-foreground text-sm">No lecturers found.</p>
            <p className="text-xs mt-1">Try modifying your search criteria or department filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {lecturers.map((lec) => (
              <Card key={lec.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                      <UserIcon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base truncate">{lec.full_name}</CardTitle>
                      <CardDescription className="text-xs truncate">
                        {lec.department?.name || "Faculty of Engineering"}
                      </CardDescription>
                      <Badge variant="secondary" className="mt-1 text-[10px] font-normal">
                        Academic Staff
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2 text-xs text-muted-foreground py-2 border-t">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">{lec.email}</span>
                  </div>
                  {lec.phone_number && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{lec.phone_number}</span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-3 border-t">
                  <Button
                    variant="usj"
                    size="sm"
                    className="w-full gap-1.5 font-semibold text-xs shadow-xs"
                    onClick={() => handleOpenBooking(lec)}
                  >
                    <Clock className="h-4 w-4" />
                    <span>View Slots & Book</span>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Booking Dialog Modal */}
        {selectedLecturer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-xl rounded-2xl bg-card border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b px-5 py-3.5 bg-muted/40">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">
                      Book Consultation • Dr./Prof. {selectedLecturer.full_name}
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      {selectedLecturer.department?.name || "Faculty of Engineering"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLecturer(null)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleBookingSubmit} className="p-5 space-y-4 text-xs">
                {statusMsg && (
                  <div
                    className={`p-3 rounded-lg text-xs font-medium ${
                      statusMsg.type === "success"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {statusMsg.text}
                  </div>
                )}

                {/* Slot Picker Component */}
                <SlotPicker
                  lecturerId={selectedLecturer.id}
                  selectedDate={selectedDate}
                  onDateChange={(d) => {
                    setSelectedDate(d);
                    setSelectedSlot(null);
                  }}
                  selectedSlot={selectedSlot}
                  onSelectSlot={(s) => setSelectedSlot(s)}
                />

                {/* Consultation Details */}
                <div className="space-y-3 pt-2 border-t">
                  <div>
                    <label className="font-semibold text-muted-foreground block mb-1">
                      Consultation Topic / Subject *
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Final Year Project Architecture Review"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      className="text-xs h-8"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-muted-foreground block mb-1">
                      Agenda / Specific Questions *
                    </label>
                    <Textarea
                      placeholder="Outline specific topics, questions, or code areas you need guidance on..."
                      value={agenda}
                      onChange={(e) => setAgenda(e.target.value)}
                      rows={3}
                      required
                      className="text-xs resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <Link href="/my-requests" className="text-[11px] text-primary hover:underline font-medium">
                    View My Requests
                  </Link>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedLecturer(null)}
                      disabled={submitting}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="usj"
                      size="sm"
                      disabled={submitting || !selectedSlot}
                      className="text-xs font-semibold gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{submitting ? "Submitting..." : "Submit Request"}</span>
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
