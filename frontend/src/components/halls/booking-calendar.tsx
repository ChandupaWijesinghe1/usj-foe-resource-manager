"use client";

import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { Facility, FacilityScheduleSlot } from "@/types";
import { Button } from "@/components/ui/button";

interface BookingCalendarProps {
  facility: Facility;
  scheduleSlots: FacilityScheduleSlot[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onSelectSlot: (startTime: string, endTime: string) => void;
  isLoading?: boolean;
}

export function BookingCalendar({
  facility,
  scheduleSlots,
  selectedDate,
  onDateChange,
  onSelectSlot,
  isLoading = false,
}: BookingCalendarProps) {
  const [viewMode, setViewMode] = useState<"day" | "week">("day");

  // Standard university operating slots: 08:00 - 18:00 (1 hour intervals)
  const timeSlots = [
    { start: "08:00", end: "09:00", startHour: 8, endHour: 9 },
    { start: "09:00", end: "10:00", startHour: 9, endHour: 10 },
    { start: "10:00", end: "11:00", startHour: 10, endHour: 11 },
    { start: "11:00", end: "12:00", startHour: 11, endHour: 12 },
    { start: "12:00", end: "13:00", startHour: 12, endHour: 13 },
    { start: "13:00", end: "14:00", startHour: 13, endHour: 14 },
    { start: "14:00", end: "15:00", startHour: 14, endHour: 15 },
    { start: "15:00", end: "16:00", startHour: 15, endHour: 16 },
    { start: "16:00", end: "17:00", startHour: 16, endHour: 17 },
    { start: "17:00", end: "18:00", startHour: 17, endHour: 18 },
  ];

  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    onDateChange(prev);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    onDateChange(next);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const dateString = selectedDate.toISOString().split("T")[0];

  // Helper to check if a slot on selectedDate overlaps with any schedule slot
  const getSlotStatus = (startHour: number, endHour: number) => {
    const slotStart = new Date(selectedDate);
    slotStart.setHours(startHour, 0, 0, 0);

    const slotEnd = new Date(selectedDate);
    slotEnd.setHours(endHour, 0, 0, 0);

    for (const slot of scheduleSlots) {
      const bStart = new Date(slot.start_time);
      const bEnd = new Date(slot.end_time);

      if (bStart < slotEnd && bEnd > slotStart) {
        if (slot.is_maintenance) {
          return { status: "MAINTENANCE", item: slot };
        }
        if (slot.status === "APPROVED") {
          return { status: "APPROVED", item: slot };
        }
        if (slot.status === "PENDING") {
          return { status: "PENDING", item: slot };
        }
      }
    }
    return { status: "AVAILABLE", item: null };
  };

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-xs overflow-hidden">
      {/* Calendar Header with Navigation */}
      <div className="p-4 bg-muted/40 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-bold text-sm tracking-tight">
              {facility.name} Schedule
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {facility.building} • Capacity: {facility.capacity} Seats
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="text-xs h-8 px-2.5"
          >
            Today
          </Button>
          <div className="flex items-center border rounded-lg bg-background">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-l-md"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs font-semibold select-none">
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <button
              type="button"
              onClick={handleNextDay}
              className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-r-md"
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Hall Status Notification if not operational */}
      {!facility.is_operational && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            <strong>Facility Offline:</strong> {facility.maintenance_reason || "Scheduled engineering maintenance in progress."}
          </span>
        </div>
      )}

      {/* Time Slot Timeline Grid */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b">
          <span className="font-medium flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> University Timetable Hours (08:00 - 18:00)
          </span>
          <span className="text-[11px]">Click an open slot to select</span>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Loading real-time availability...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {timeSlots.map((slot) => {
              const { status, item } = getSlotStatus(slot.startHour, slot.endHour);

              if (status === "MAINTENANCE") {
                return (
                  <div
                    key={slot.start}
                    className="p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-900/60 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 font-mono font-medium text-slate-600 dark:text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{slot.start} - {slot.end}</span>
                    </div>
                    <span className="rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
                      <Wrench className="h-3 w-3" /> Maintenance
                    </span>
                  </div>
                );
              }

              if (status === "APPROVED") {
                return (
                  <div
                    key={slot.start}
                    className="p-3 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40 text-xs flex items-center justify-between shadow-2xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 font-mono font-bold text-rose-800 dark:text-rose-300">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{slot.start} - {slot.end}</span>
                      </div>
                      <p className="text-[11px] text-rose-900/80 dark:text-rose-200 truncate max-w-[180px]">
                        {item?.title}
                      </p>
                    </div>
                    <span className="rounded-full bg-rose-200/80 text-rose-900 dark:bg-rose-900 dark:text-rose-200 text-[10px] font-bold px-2 py-0.5">
                      Reserved
                    </span>
                  </div>
                );
              }

              if (status === "PENDING") {
                return (
                  <div
                    key={slot.start}
                    className="p-3 rounded-lg border border-amber-300 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/40 text-xs flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 font-mono font-medium text-amber-800 dark:text-amber-300">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{slot.start} - {slot.end}</span>
                      </div>
                      <p className="text-[11px] text-amber-900/80 dark:text-amber-200 truncate max-w-[180px]">
                        {item?.title || "Pending Approval"}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 text-[10px] font-bold px-2 py-0.5">
                      Pending
                    </span>
                  </div>
                );
              }

              // Available Slot
              const fullStartIso = `${dateString}T${slot.start}:00`;
              const fullEndIso = `${dateString}T${slot.end}:00`;

              return (
                <button
                  key={slot.start}
                  type="button"
                  onClick={() => onSelectSlot(fullStartIso, fullEndIso)}
                  className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/40 text-xs flex items-center justify-between transition-colors group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2 font-mono font-semibold text-emerald-800 dark:text-emerald-300">
                    <Clock className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{slot.start} - {slot.end}</span>
                  </div>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    Available • Click to Book
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="pt-3 border-t flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>Available Slot</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
            <span>Reserved (Approved)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span>Pending Request</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
            <span>Maintenance Block</span>
          </div>
        </div>
      </div>
    </div>
  );
}
