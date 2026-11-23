"use client";

import React, { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Users,
  Video,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resourceService } from "@/services/resource.service";
import { LecturerDiscreteSlot } from "@/types";

interface SlotPickerProps {
  lecturerId: string;
  selectedDate: string;
  onDateChange: (date: string) => void;
  selectedSlot: LecturerDiscreteSlot | null;
  onSelectSlot: (slot: LecturerDiscreteSlot) => void;
}

export function SlotPicker({
  lecturerId,
  selectedDate,
  onDateChange,
  selectedSlot,
  onSelectSlot,
}: SlotPickerProps) {
  const [slots, setSlots] = useState<LecturerDiscreteSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set min date to today (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!lecturerId || !selectedDate) return;
    loadSlots();
  }, [lecturerId, selectedDate]);

  const loadSlots = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await resourceService.getLecturerDiscreteSlots(lecturerId, selectedDate);
      setSlots(data);
    } catch (err: any) {
      console.error("Error loading lecturer slots:", err);
      setError("Unable to load consultation slots for this date.");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="space-y-4">
      {/* Date Picker Header */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
          <CalendarIcon className="h-3.5 w-3.5 text-primary" />
          <span>Select Consultation Date</span>
        </label>
        <Input
          type="date"
          min={todayStr}
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full text-xs"
        />
      </div>

      {/* Slots Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">Available Time Slots</span>
          {slots.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {slots.filter((s) => s.is_available).length} of {slots.length} available
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground border rounded-lg border-dashed">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Checking lecturer availability...</span>
          </div>
        ) : error ? (
          <div className="p-3 text-xs text-destructive bg-destructive/10 rounded-lg">
            {error}
          </div>
        ) : slots.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground border rounded-lg border-dashed p-4">
            <Clock className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground/60" />
            <p className="font-semibold text-foreground">No published consultation slots on this date.</p>
            <p className="text-[11px] mt-0.5">
              Please choose another weekday or check the lecturer&apos;s recurring office hours.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {slots.map((slot, index) => {
              const isSelected =
                selectedSlot?.start_time === slot.start_time &&
                selectedSlot?.end_time === slot.end_time;

              return (
                <button
                  key={`${slot.start_time}-${slot.end_time}-${index}`}
                  type="button"
                  disabled={!slot.is_available}
                  onClick={() => onSelectSlot(slot)}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all text-xs ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary shadow-xs"
                      : slot.is_available
                      ? "border-border hover:border-primary/50 hover:bg-accent/40 bg-card cursor-pointer"
                      : "border-border/40 bg-muted/40 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-foreground">
                      {formatTimeSlot(slot.start_time)} - {formatTimeSlot(slot.end_time)}
                    </span>
                    {slot.is_available ? (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] py-0 px-1.5"
                      >
                        Free
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground text-[10px] py-0 px-1.5"
                      >
                        Booked
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate w-full">
                    {slot.location_type === "ONLINE_CALL" ? (
                      <Video className="h-3 w-3 text-blue-500 shrink-0" />
                    ) : (
                      <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                    )}
                    <span className="truncate">{slot.room_or_link}</span>
                  </div>

                  {slot.max_students > 1 && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                      <Users className="h-3 w-3" />
                      <span>
                        {slot.current_bookings_count} / {slot.max_students} attendees
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
