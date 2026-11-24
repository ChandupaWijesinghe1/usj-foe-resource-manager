"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  Info,
  MapPin,
  Paperclip,
  Plus,
  Projector,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  Upload,
  Users,
  Wind,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { resourceService } from "@/services/resource.service";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { BookingCalendar } from "@/components/halls/booking-calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Facility, FacilityScheduleSlot, FacilityType } from "@/types";

// Zod Schema for Booking Submission
const bookingSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    purpose: z.string().min(5, "Purpose must be at least 5 characters"),
    event_description: z.string().optional(),
    attendee_count: z.number().min(1, "At least 1 attendee is required"),
    start_time: z.string().min(1, "Start time is required"),
    end_time: z.string().min(1, "End time is required"),
  })
  .refine((data) => new Date(data.end_time) > new Date(data.start_time), {
    message: "End time must be after start time",
    path: ["end_time"],
  });

type BookingFormValues = z.infer<typeof bookingSchema>;

export default function HallsPage() {
  const { user, hasRole } = useAuth();
  const isFacilityAdmin = hasRole(["SUPER_ADMIN", "FACILITY_ADMIN"]);

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  // Amenity filters
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [acFilter, setAcFilter] = useState<boolean | null>(null);
  const [projFilter, setProjFilter] = useState<boolean | null>(null);
  const [minCap, setMinCap] = useState<number>(0);

  // Active Selected Facility & Schedule View
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [scheduleSlots, setScheduleSlots] = useState<FacilityScheduleSlot[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Booking Form State
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string } | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState<{
    available: boolean;
    text: string;
  } | null>(null);
  const [bookingFeedback, setBookingFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Admin Hall Management Modals
  const [createHallModalOpen, setCreateHallModalOpen] = useState(false);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [maintenanceReason, setMaintenanceReason] = useState("");
  const [maintenanceStart, setMaintenanceStart] = useState("");
  const [maintenanceEnd, setMaintenanceEnd] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset: resetBookingForm,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      title: "",
      purpose: "",
      event_description: "",
      attendee_count: 30,
      start_time: "",
      end_time: "",
    },
  });

  const watchedStartTime = watch("start_time");
  const watchedEndTime = watch("end_time");

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      const data = await resourceService.getFacilities(
        typeFilter === "ALL" ? undefined : typeFilter,
        isFacilityAdmin
      );
      let filtered = data;
      if (acFilter !== null) filtered = filtered.filter((f) => f.has_ac === acFilter);
      if (projFilter !== null) filtered = filtered.filter((f) => f.has_projector === projFilter);
      if (minCap > 0) filtered = filtered.filter((f) => f.capacity >= minCap);
      setFacilities(filtered);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, [typeFilter, acFilter, projFilter, minCap, isFacilityAdmin]);

  // Fetch schedule slots for the selected facility & calendar date
  const fetchSchedule = async (facilityId: string, date: Date) => {
    try {
      setScheduleLoading(true);
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const slots = await resourceService.getFacilitySchedule(
        facilityId,
        start.toISOString(),
        end.toISOString()
      );
      setScheduleSlots(slots);
    } catch {
      setScheduleSlots([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFacility) {
      fetchSchedule(selectedFacility.id, calendarDate);
    }
  }, [selectedFacility, calendarDate]);

  // Handle slot selection from interactive calendar
  const handleSlotSelect = (startTimeIso: string, endTimeIso: string) => {
    setValue("start_time", startTimeIso);
    setValue("end_time", endTimeIso);
    setBookingFeedback(null);
    setAvailabilityMessage(null);
    setBookingModalOpen(true);
  };

  // Pre-flight check availability
  const handleCheckAvailability = async () => {
    if (!selectedFacility || !watchedStartTime || !watchedEndTime) return;
    try {
      const res = await resourceService.checkFacilityAvailability({
        facility_id: selectedFacility.id,
        start_time: new Date(watchedStartTime).toISOString(),
        end_time: new Date(watchedEndTime).toISOString(),
      });
      setAvailabilityMessage({
        available: res.available,
        text: res.message,
      });
    } catch (err: any) {
      setAvailabilityMessage({
        available: false,
        text: err.response?.data?.error?.message || "Failed to verify slot.",
      });
    }
  };

  // Upload supporting document
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingDoc(true);
      const res = await resourceService.uploadBookingDocument(file);
      setUploadedFile({ url: res.url, name: res.filename });
    } catch (err: any) {
      alert("Failed to upload document. Allowed: PDF, PNG, JPG, DOCX");
    } finally {
      setUploadingDoc(false);
    }
  };

  // Submit booking request
  const onBookingSubmit = async (values: BookingFormValues) => {
    if (!selectedFacility) return;
    setBookingFeedback(null);

    try {
      await resourceService.createBooking({
        facility_id: selectedFacility.id,
        title: values.title,
        purpose: values.purpose,
        event_description: values.event_description || undefined,
        attendee_count: values.attendee_count,
        start_time: new Date(values.start_time).toISOString(),
        end_time: new Date(values.end_time).toISOString(),
        document_url: uploadedFile?.url,
        document_name: uploadedFile?.name,
      });

      setBookingFeedback({
        type: "success",
        text: "Booking request submitted! A Facility Admin will review your reservation.",
      });

      fetchSchedule(selectedFacility.id, calendarDate);

      setTimeout(() => {
        setBookingModalOpen(false);
        resetBookingForm();
        setUploadedFile(null);
        setBookingFeedback(null);
      }, 2500);
    } catch (err: any) {
      setBookingFeedback({
        type: "error",
        text:
          err.response?.data?.error?.message ||
          err.response?.data?.detail ||
          "Scheduling conflict or booking creation error.",
      });
    }
  };

  // Facility Admin: Place maintenance block
  const handleMaintenanceBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacility || !maintenanceReason || !maintenanceStart || !maintenanceEnd) return;

    try {
      await resourceService.blockFacilityMaintenance(selectedFacility.id, {
        reason: maintenanceReason,
        start_time: new Date(maintenanceStart).toISOString(),
        end_time: new Date(maintenanceEnd).toISOString(),
      });
      alert(`Maintenance block applied for ${selectedFacility.name}.`);
      setMaintenanceModalOpen(false);
      setMaintenanceReason("");
      fetchSchedule(selectedFacility.id, calendarDate);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Failed to block maintenance.");
    }
  };

  // Facility Admin: Toggle operational status
  const handleToggleOperational = async (fac: Facility) => {
    const nextStatus = !fac.is_operational;
    const reason = nextStatus ? undefined : prompt("Reason for deactivating facility:") || "Maintenance";
    try {
      await resourceService.setFacilityStatus(fac.id, nextStatus, reason);
      fetchFacilities();
      if (selectedFacility?.id === fac.id) {
        setSelectedFacility({ ...fac, is_operational: nextStatus, maintenance_reason: reason });
      }
    } catch {
      alert("Failed to update status.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Admin Action Bar */}
        {isFacilityAdmin && (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="usj"
                size="sm"
                className="text-xs font-semibold gap-1.5"
                onClick={() => setCreateHallModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
                <span>Add Lecture Hall</span>
              </Button>
            </div>
        )}

        {/* Filter Controls Bar */}
        <Card className="p-4 bg-card/60 backdrop-blur shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-muted-foreground flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Type:
              </span>
              {["ALL", "LECTURE_HALL", "AUDITORIUM", "SEMINAR_ROOM", "COMPUTER_LAB"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                    typeFilter === t
                      ? "bg-primary text-primary-foreground font-semibold shadow-elevation-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.replace("_", " ")}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAcFilter(acFilter === true ? null : true)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1 ${
                  acFilter === true
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Wind className="h-3 w-3" /> AC Only
              </button>
              <button
                type="button"
                onClick={() => setProjFilter(projFilter === true ? null : true)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1 ${
                  projFilter === true
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Projector className="h-3 w-3" /> Projector
              </button>
            </div>
          </div>
        </Card>

        {/* Two-Column Grid: Hall Directory & Interactive Schedule Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Lecture Hall Cards (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-sm font-bold tracking-tight text-foreground flex items-center justify-between">
              <span>Select Hall to View Schedule</span>
              <span className="text-xs font-normal text-muted-foreground">
                {facilities.length} available
              </span>
            </h2>

            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground border rounded-xl">
                Loading engineering lecture halls...
              </div>
            ) : facilities.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground border rounded-xl">
                No lecture halls match the selected filter criteria.
              </div>
            ) : (
              <div className="space-y-3">
                {facilities.map((fac) => {
                  const isSelected = selectedFacility?.id === fac.id;
                  return (
                    <div
                      key={fac.id}
                      onClick={() => setSelectedFacility(fac)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-elevation-sm"
                          : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-foreground">{fac.name}</h3>
                            {!fac.is_operational && (
                              <span className="rounded-full bg-destructive/15 text-destructive text-[10px] font-bold px-1.5 py-0.2">
                                Offline
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {fac.building} • {fac.floor}
                          </p>
                        </div>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-muted text-foreground">
                          {fac.code}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold flex items-center gap-1">
                          <Users className="h-3 w-3" /> {fac.capacity} Seats
                        </span>
                        {fac.has_ac && (
                          <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-medium">
                            Air Conditioned
                          </span>
                        )}
                        {fac.has_projector && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-medium">
                            Projector
                          </span>
                        )}
                      </div>

                      {/* Admin Quick Actions */}
                      {isFacilityAdmin && (
                        <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-[11px]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleOperational(fac);
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground font-medium underline"
                          >
                            {fac.is_operational ? "Deactivate Hall" : "Reactivate Hall"}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFacility(fac);
                              setMaintenanceModalOpen(true);
                            }}
                            className="text-xs text-amber-600 hover:underline font-medium flex items-center gap-1"
                          >
                            <Wrench className="h-3 w-3" /> Block Maintenance
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Interactive Booking Calendar & Action Hub (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {selectedFacility ? (
              <div className="space-y-4">
                <BookingCalendar
                  facility={selectedFacility}
                  scheduleSlots={scheduleSlots}
                  selectedDate={calendarDate}
                  onDateChange={setCalendarDate}
                  onSelectSlot={handleSlotSelect}
                  isLoading={scheduleLoading}
                />

                <div className="rounded-xl border bg-card p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm">Need a Custom Time Slot?</h3>
                    <p className="text-xs text-muted-foreground">
                      Submit a reservation request with custom duration and supporting files.
                    </p>
                  </div>
                  <Button
                    variant="usj"
                    size="sm"
                    className="font-semibold text-xs shrink-0"
                    onClick={() => {
                      const todayIso = calendarDate.toISOString().split("T")[0];
                      setValue("start_time", `${todayIso}T09:00:00`);
                      setValue("end_time", `${todayIso}T11:00:00`);
                      setBookingModalOpen(true);
                    }}
                  >
                    Open Custom Booking Form
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground space-y-2">
                <CalendarDays className="h-10 w-10 mx-auto text-primary opacity-60" />
                <h3 className="font-bold text-sm text-foreground">Select a Hall to View Timetable</h3>
                <p className="text-xs max-w-sm mx-auto">
                  Choose a lecture hall or auditorium from the left directory to inspect its live schedule,
                  reserved intervals, and available booking slots.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Booking Submission Modal */}
        {bookingModalOpen && selectedFacility && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setBookingModalOpen(false)}
            />
            <Card className="relative z-10 w-full max-w-lg shadow-2xl border-t-4 border-t-primary rounded-card max-h-[90vh] overflow-y-auto">
              <CardHeader className="flex flex-row items-start justify-between pb-2 border-b">
                <div>
                  <CardTitle className="text-lg font-bold">
                    Reserve {selectedFacility.name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {selectedFacility.building} • Capacity: {selectedFacility.capacity} Seats
                  </CardDescription>
                </div>
                <button
                  onClick={() => setBookingModalOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                {bookingFeedback && (
                  <div
                    className={`p-3 rounded-md text-xs font-medium ${
                      bookingFeedback.type === "success"
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                        : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {bookingFeedback.text}
                  </div>
                )}

                <form onSubmit={handleSubmit(onBookingSubmit)} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Event / Lecture Title
                    </label>
                    <Input
                      placeholder="e.g. EC4010 Advanced Control Systems Lecture"
                      {...register("title")}
                    />
                    {errors.title && (
                      <p className="text-[11px] text-destructive">{errors.title.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Start Date and Time
                      </label>
                      <Input type="datetime-local" {...register("start_time")} />
                      {errors.start_time && (
                        <p className="text-[11px] text-destructive">{errors.start_time.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">
                        End Date and Time
                      </label>
                      <Input type="datetime-local" {...register("end_time")} />
                      {errors.end_time && (
                        <p className="text-[11px] text-destructive">{errors.end_time.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Preflight Check Button */}
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCheckAvailability}
                      className="text-xs h-7 gap-1"
                    >
                      <Clock className="h-3 w-3" />
                      Verify Slot Availability
                    </Button>

                    {availabilityMessage && (
                      <span
                        className={`text-[11px] font-semibold ${
                          availabilityMessage.available ? "text-emerald-600" : "text-destructive"
                        }`}
                      >
                        {availabilityMessage.available ? "✓ Available" : "✗ Conflict detected"}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Expected Number of Participants
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={selectedFacility.capacity}
                      {...register("attendee_count", { valueAsNumber: true })}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Maximum capacity: {selectedFacility.capacity} students
                    </p>
                    {errors.attendee_count && (
                      <p className="text-[11px] text-destructive">
                        {errors.attendee_count.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Booking Purpose / Academic Course
                    </label>
                    <Input
                      placeholder="e.g. Makeup lecture for Batch 21 Civil Engineers"
                      {...register("purpose")}
                    />
                    {errors.purpose && (
                      <p className="text-[11px] text-destructive">{errors.purpose.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Detailed Event Description (Optional)
                    </label>
                    <Textarea
                      placeholder="Include technical requirements, audio/mic setup, or lecturer details..."
                      rows={2}
                      {...register("event_description")}
                    />
                  </div>

                  {/* Supporting Document Upload */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5" />
                      Supporting Documentation (Dean / Head Approval PDF)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.docx"
                        onChange={handleFileUpload}
                        disabled={uploadingDoc}
                        className="text-xs h-9 cursor-pointer"
                      />
                    </div>
                    {uploadedFile && (
                      <p className="text-[11px] text-emerald-600 font-medium">
                        ✓ Attached: {uploadedFile.name}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBookingModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="usj"
                      size="sm"
                      className="font-semibold text-xs"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Checking Clashes..." : "Submit Reservation Request"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Maintenance Block Modal for Facility Admin */}
        {maintenanceModalOpen && selectedFacility && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
              onClick={() => setMaintenanceModalOpen(false)}
            />
            <Card className="relative z-10 w-full max-w-md shadow-2xl border-t-4 border-t-amber-600">
              <CardHeader className="flex flex-row items-start justify-between pb-2 border-b">
                <div>
                  <CardTitle className="text-base font-bold">
                    Block {selectedFacility.name} for Maintenance
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Reserves time slot and blocks student bookings
                  </CardDescription>
                </div>
                <button
                  onClick={() => setMaintenanceModalOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleMaintenanceBlockSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Maintenance Purpose / Description
                    </label>
                    <Input
                      placeholder="e.g. Audio System Testing, Projector Lamp Replacement"
                      value={maintenanceReason}
                      onChange={(e) => setMaintenanceReason(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Start</label>
                      <Input
                        type="datetime-local"
                        value={maintenanceStart}
                        onChange={(e) => setMaintenanceStart(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">End</label>
                      <Input
                        type="datetime-local"
                        value={maintenanceEnd}
                        onChange={(e) => setMaintenanceEnd(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMaintenanceModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="usj" size="sm" className="font-semibold text-xs">
                      Block Time Slot
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
