"use client";

import React, { useEffect, useState } from "react";
import { Clock, Globe, MapPin, Plus, Save, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LecturerAvailability } from "@/types";
import { resourceService } from "@/services/resource.service";

interface AvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingSlot?: LecturerAvailability | null;
}

const WEEKDAYS = [
  { id: 0, label: "Monday" },
  { id: 1, label: "Tuesday" },
  { id: 2, label: "Wednesday" },
  { id: 3, label: "Thursday" },
  { id: 4, label: "Friday" },
  { id: 5, label: "Saturday" },
  { id: 6, label: "Sunday" },
];

export function AvailabilityModal({
  isOpen,
  onClose,
  onSaved,
  editingSlot,
}: AvailabilityModalProps) {
  const [slotType, setSlotType] = useState<"recurring" | "specific">("recurring");
  const [dayOfWeek, setDayOfWeek] = useState<number>(0);
  const [specificDate, setSpecificDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("11:00");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [locationType, setLocationType] = useState<"PHYSICAL_OFFICE" | "LAB" | "ONLINE_CALL">("PHYSICAL_OFFICE");
  const [roomOrLink, setRoomOrLink] = useState<string>("");
  const [maxStudents, setMaxStudents] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingSlot) {
      if (editingSlot.specific_date) {
        setSlotType("specific");
        setSpecificDate(editingSlot.specific_date);
      } else {
        setSlotType("recurring");
        setDayOfWeek(editingSlot.day_of_week);
      }
      setStartTime(editingSlot.start_time.slice(0, 5));
      setEndTime(editingSlot.end_time.slice(0, 5));
      setDurationMinutes(editingSlot.slot_duration_minutes);
      setLocationType(editingSlot.location_type);
      setRoomOrLink(editingSlot.room_or_link);
      setMaxStudents(editingSlot.max_students_per_slot || 1);
    } else {
      setSlotType("recurring");
      setDayOfWeek(0);
      setSpecificDate("");
      setStartTime("09:00");
      setEndTime("11:00");
      setDurationMinutes(30);
      setLocationType("PHYSICAL_OFFICE");
      setRoomOrLink("Faculty Office 204");
      setMaxStudents(1);
    }
    setError(null);
  }, [editingSlot, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (endTime <= startTime) {
      setError("End time must be later than start time.");
      return;
    }

    if (!roomOrLink.trim()) {
      setError("Please provide a room number or online meeting link.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<LecturerAvailability> = {
        start_time: `${startTime}:00`,
        end_time: `${endTime}:00`,
        slot_duration_minutes: durationMinutes,
        max_students_per_slot: maxStudents,
        location_type: locationType,
        room_or_link: roomOrLink.trim(),
        is_active: true,
      };

      if (slotType === "specific") {
        if (!specificDate) {
          setError("Please select a specific date.");
          setSubmitting(false);
          return;
        }
        payload.specific_date = specificDate;
        payload.day_of_week = new Date(specificDate).getDay();
      } else {
        payload.day_of_week = dayOfWeek;
        payload.specific_date = null;
      }

      if (editingSlot) {
        await resourceService.updateAvailabilitySlot(editingSlot.id, payload);
      } else {
        await resourceService.createAvailabilitySlot(payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.error?.message || "Failed to save slot.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b px-5 py-3.5 bg-muted/40">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {editingSlot ? "Edit Consultation Hours" : "Add Consultation Office Hours"}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Define when students can schedule appointments with you
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-destructive/15 text-destructive font-medium text-[11px]">
              {error}
            </div>
          )}

          {/* Slot Type Toggle */}
          <div>
            <label className="font-semibold text-muted-foreground block mb-1">Recurrence Schedule</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSlotType("recurring")}
                className={`py-1.5 px-3 rounded-lg border text-center font-medium transition-all ${
                  slotType === "recurring"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                Weekly Recurring Day
              </button>
              <button
                type="button"
                onClick={() => setSlotType("specific")}
                className={`py-1.5 px-3 rounded-lg border text-center font-medium transition-all ${
                  slotType === "specific"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                Specific Calendar Date
              </button>
            </div>
          </div>

          {/* Day or Date Selection */}
          {slotType === "recurring" ? (
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Select Day of Week</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary"
              >
                {WEEKDAYS.map((d) => (
                  <option key={d.id} value={d.id}>
                    Every {d.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Select Date</label>
              <Input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          )}

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Start Time</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="text-xs h-8"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">End Time</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="text-xs h-8"
                required
              />
            </div>
          </div>

          {/* Slot Duration & Max Students */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Slot Duration</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary"
              >
                <option value={15}>15 Minutes</option>
                <option value={20}>20 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes (1 hr)</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Max Students per Slot</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={maxStudents}
                onChange={(e) => setMaxStudents(parseInt(e.target.value, 10) || 1)}
                className="text-xs h-8"
              />
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                1 for individual, 2+ for group consultation
              </span>
            </div>
          </div>

          {/* Meeting Type & Details */}
          <div className="space-y-2">
            <label className="font-semibold text-muted-foreground block">Consultation Format & Location</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setLocationType("PHYSICAL_OFFICE")}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                  locationType === "PHYSICAL_OFFICE"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <MapPin className="h-4 w-4 mb-1" />
                <span className="text-[10px]">Physical Office</span>
              </button>

              <button
                type="button"
                onClick={() => setLocationType("ONLINE_CALL")}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                  locationType === "ONLINE_CALL"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Globe className="h-4 w-4 mb-1" />
                <span className="text-[10px]">Online (Meet/Zoom)</span>
              </button>

              <button
                type="button"
                onClick={() => setLocationType("LAB")}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                  locationType === "LAB"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Users className="h-4 w-4 mb-1" />
                <span className="text-[10px]">Department Lab</span>
              </button>
            </div>

            <div className="pt-1">
              <label className="font-medium text-[11px] text-muted-foreground block mb-1">
                {locationType === "ONLINE_CALL"
                  ? "Meeting URL (Google Meet / Zoom link)"
                  : "Office Room / Lab Location"}
              </label>
              <Input
                type="text"
                value={roomOrLink}
                onChange={(e) => setRoomOrLink(e.target.value)}
                placeholder={
                  locationType === "ONLINE_CALL"
                    ? "https://meet.google.com/xyz-abc-def"
                    : "Room 204, Faculty of Engineering"
                }
                className="text-xs h-8"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="usj" size="sm" disabled={submitting} className="gap-1.5 font-semibold">
              <Save className="h-3.5 w-3.5" />
              <span>{submitting ? "Saving..." : editingSlot ? "Update Slot" : "Publish Availability"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
