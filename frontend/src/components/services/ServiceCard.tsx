"use client";

import React from "react";
import {
  Box,
  CheckCircle2,
  Clock,
  Cpu,
  Edit2,
  ExternalLink,
  Layers,
  MapPin,
  Pencil,
  Printer,
  Sparkles,
  Tag,
  Trash2,
  Users,
  Wrench,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { LabService } from "@/types";

interface ServiceCardProps {
  service: LabService;
  onViewDetails: (service: LabService) => void;
  onRequest: (service: LabService) => void;
  onEdit?: (service: LabService) => void;
  onDelete?: (service: LabService) => void;
  isAdmin?: boolean;
}

export function ServiceCard({
  service,
  onViewDetails,
  onRequest,
  onEdit,
  onDelete,
  isAdmin = false,
}: ServiceCardProps) {
  // Category-based icon helper
  const getCategoryIcon = (category: string, type: string) => {
    const c = category.toLowerCase();
    const t = type.toLowerCase();
    if (c.includes("3d") || t.includes("three_d")) return <Printer className="h-4 w-4 text-amber-500" />;
    if (c.includes("microcontroller") || c.includes("arduino") || c.includes("embedded"))
      return <Cpu className="h-4 w-4 text-blue-500" />;
    if (c.includes("pcb") || c.includes("circuit")) return <Layers className="h-4 w-4 text-emerald-500" />;
    if (c.includes("sensor")) return <Sparkles className="h-4 w-4 text-purple-500" />;
    return <Wrench className="h-4 w-4 text-primary" />;
  };

  // Fallback image generator based on category if image_url is empty
  const getImagePlaceholder = () => {
    if (service.image_url) return service.image_url;
    const cat = service.category.toLowerCase();
    if (cat.includes("3d") || service.service_type === "THREE_D_PRINTING") {
      return "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80";
    }
    if (cat.includes("microcontroller") || cat.includes("arduino") || cat.includes("raspberry")) {
      return "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=600&auto=format&fit=crop&q=80";
    }
    if (cat.includes("pcb") || cat.includes("circuit")) {
      return "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80";
    }
    return "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80";
  };

  return (
    <Card className="flex flex-col justify-between overflow-hidden group hover:shadow-md transition-all duration-200 border-border bg-card">
      <div>
        {/* Visual Header / Product Image */}
        <div className="relative h-44 w-full overflow-hidden bg-muted">
          <img
            src={getImagePlaceholder()}
            alt={service.service_name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Top Badges */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
            <Badge className="bg-black/60 text-white backdrop-blur-xs text-[10px] border-0 font-medium flex items-center gap-1">
              {getCategoryIcon(service.category, service.service_type)}
              <span>{service.category}</span>
            </Badge>

            {service.is_available ? (
              <Badge className="bg-emerald-600/90 text-white backdrop-blur-xs text-[10px] border-0">
                {service.available_quantity !== null && service.available_quantity !== undefined
                  ? `${service.available_quantity} Available`
                  : "Available"}
              </Badge>
            ) : (
              <Badge className="bg-destructive/90 text-white backdrop-blur-xs text-[10px] border-0">
                Unavailable
              </Badge>
            )}
          </div>

          {/* Price / Charge Pill */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
            <span className="text-white font-bold text-xs drop-shadow-xs">
              {Number(service.cost_per_unit) > 0
                ? `LKR ${Number(service.cost_per_unit).toFixed(2)} / ${service.unit_name || "unit"}`
                : "Free Academic Loan"}
            </span>

            {service.turnaround_time_days > 0 && (
              <span className="text-white/90 text-[10px] font-medium flex items-center gap-1 drop-shadow-xs">
                <Clock className="h-3 w-3" />
                <span>~{service.turnaround_time_days}d turnaround</span>
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <CardContent className="p-4 space-y-2.5">
          <div>
            <h3 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {service.service_name}
            </h3>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 text-primary shrink-0" />
              <span className="truncate">
                {service.laboratory?.name || "Faculty Laboratory"} •{" "}
                {service.laboratory?.location || "Engineering Complex"}
              </span>
            </p>
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {service.description}
          </p>

          {/* Borrowing / Conditions highlight */}
          {service.borrowing_conditions && (
            <div className="p-2 rounded-md bg-muted/50 border border-border/40 text-[11px] text-muted-foreground line-clamp-1">
              <span className="font-semibold text-foreground">Rule: </span>
              {service.borrowing_conditions}
            </div>
          )}
        </CardContent>
      </div>

      {/* Footer Actions */}
      <CardFooter className="p-4 pt-0 border-t flex flex-col gap-2 bg-muted/10">
        <div className="flex items-center gap-2 w-full pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(service)}
            className="flex-1 text-xs h-8"
          >
            Details
          </Button>

          <Button
            variant="usj"
            size="sm"
            onClick={() => onRequest(service)}
            disabled={!service.is_available}
            className="flex-1 text-xs h-8 font-semibold shadow-xs"
          >
            Request
          </Button>
        </div>

        {/* Admin management toolbar */}
        {isAdmin && (
          <div className="flex items-center justify-between w-full pt-2 border-t text-[11px] text-muted-foreground">
            <span className="font-medium text-[10px] uppercase">Admin Actions</span>
            <div className="flex items-center gap-1">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(service)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                  title="Edit service details"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(service)}
                  className="p-1 rounded text-destructive hover:bg-destructive/10"
                  title="Delete service"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
