"use client";

import React from "react";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  FileText,
  Layers,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Tag,
  User as UserIcon,
  Wrench,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LabService } from "@/types";

interface ServiceDetailModalProps {
  service: LabService | null;
  isOpen: boolean;
  onClose: () => void;
  onRequest: (service: LabService) => void;
}

export function ServiceDetailModal({
  service,
  isOpen,
  onClose,
  onRequest,
}: ServiceDetailModalProps) {
  if (!isOpen || !service) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-card border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header with image */}
        <div className="relative h-48 w-full bg-muted shrink-0">
          <img
            src={
              service.image_url ||
              "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80"
            }
            alt={service.service_name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          <button
            onClick={onClose}
            className="absolute top-3 right-3 rounded-full bg-black/50 text-white p-1.5 hover:bg-black/70 backdrop-blur-xs"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="absolute bottom-3 left-4 right-4">
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-primary text-primary-foreground text-[10px] border-0">
                {service.category}
              </Badge>
              {service.is_available ? (
                <Badge className="bg-emerald-600 text-white text-[10px] border-0">
                  {service.available_quantity !== null && service.available_quantity !== undefined
                    ? `${service.available_quantity} Available in stock`
                    : "In Service / Operational"}
                </Badge>
              ) : (
                <Badge className="bg-destructive text-white text-[10px] border-0">
                  Currently Unavailable
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-white leading-tight drop-shadow-xs">
              {service.service_name}
            </h2>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Key Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-muted/40 border">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground block mb-0.5">
                Service Charge
              </span>
              <p className="font-bold text-foreground text-sm">
                {Number(service.cost_per_unit) > 0
                  ? `LKR ${Number(service.cost_per_unit).toFixed(2)}`
                  : "Free"}
              </p>
              <span className="text-[10px] text-muted-foreground">{service.unit_name || "per request"}</span>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground block mb-0.5">
                Turnaround Time
              </span>
              <p className="font-bold text-foreground text-sm">
                {service.turnaround_time_days} Days
              </p>
              <span className="text-[10px] text-muted-foreground">Typical processing</span>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground block mb-0.5">
                Inventory Stock
              </span>
              <p className="font-bold text-foreground text-sm">
                {service.total_quantity !== null && service.total_quantity !== undefined
                  ? `${service.available_quantity ?? 0} / ${service.total_quantity}`
                  : "Facility / Service"}
              </p>
              <span className="text-[10px] text-muted-foreground">Units allocated</span>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground block mb-0.5">
                Service Type
              </span>
              <p className="font-bold text-foreground text-xs truncate">
                {service.service_type}
              </p>
              <span className="text-[10px] text-muted-foreground">Engineering domain</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-primary" />
              <span>Description & Scope</span>
            </h4>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-xs">
              {service.description}
            </p>
          </div>

          {/* Usage Instructions */}
          {service.usage_instructions && (
            <div className="space-y-1.5 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
              <h4 className="font-bold text-xs text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Usage Guidelines & Safety Instructions</span>
              </h4>
              <p className="text-blue-800 dark:text-blue-200/90 whitespace-pre-line leading-relaxed text-[11px]">
                {service.usage_instructions}
              </p>
            </div>
          )}

          {/* Borrowing / Booking Conditions */}
          {service.borrowing_conditions && (
            <div className="space-y-1.5 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
              <h4 className="font-bold text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Borrowing Conditions & Terms of Use</span>
              </h4>
              <p className="text-amber-800 dark:text-amber-200/90 whitespace-pre-line leading-relaxed text-[11px]">
                {service.borrowing_conditions}
              </p>
            </div>
          )}

          {/* Laboratory & Admin Contact Information */}
          <div className="p-4 rounded-xl bg-muted/30 border space-y-3">
            <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">
              Host Laboratory & Administrative In-Charge
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <p className="font-bold text-foreground">
                  {service.laboratory?.name || "University Laboratory"}
                </p>
                <p className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{service.laboratory?.location || "Faculty of Engineering Complex"}</span>
                </p>
                <p className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Hours: {service.laboratory?.operating_hours || "8:30 AM - 4:30 PM"}</span>
                </p>
              </div>

              <div className="space-y-1 border-t sm:border-t-0 sm:border-l sm:pl-3 pt-2 sm:pt-0">
                <p className="font-semibold text-foreground flex items-center gap-1">
                  <UserIcon className="h-3.5 w-3.5 text-primary" />
                  <span>{service.laboratory?.admin_in_charge?.full_name || "Technical Officer / Lab In-Charge"}</span>
                </p>
                <p className="text-muted-foreground flex items-center gap-1 truncate">
                  <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{service.laboratory?.contact_email || service.laboratory?.admin_in_charge?.email || "eng-labs@sjp.ac.lk"}</span>
                </p>
                {(service.laboratory?.contact_phone || service.laboratory?.admin_in_charge?.phone_number) && (
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{service.laboratory?.contact_phone || service.laboratory?.admin_in_charge?.phone_number}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-between bg-muted/20 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>

          <Button
            variant="usj"
            size="sm"
            disabled={!service.is_available}
            onClick={() => {
              onClose();
              onRequest(service);
            }}
            className="text-xs font-semibold gap-1.5 shadow-xs"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Submit Request / Borrow</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
