"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  Clock,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { resourceService } from "@/services/resource.service";
import { Department, Laboratory } from "@/types";

interface LaboratoryProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingLab?: Laboratory | null;
  departments: Department[];
}

export function LaboratoryProfileModal({
  isOpen,
  onClose,
  onSaved,
  editingLab,
  departments,
}: LaboratoryProfileModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [operatingHours, setOperatingHours] = useState("8:30 AM - 5:00 PM");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [safetyGuidelines, setSafetyGuidelines] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingLab) {
      setName(editingLab.name);
      setCode(editingLab.code);
      setDepartmentId(editingLab.department_id);
      setLocation(editingLab.location);
      setDescription(editingLab.description || "");
      setOperatingHours(editingLab.operating_hours || "8:30 AM - 5:00 PM");
      setContactEmail(editingLab.contact_email || "");
      setContactPhone(editingLab.contact_phone || "");
      setSafetyGuidelines(editingLab.safety_guidelines || "");
    } else {
      setName("");
      setCode("");
      setDepartmentId(departments[0]?.id || "");
      setLocation("");
      setDescription("");
      setOperatingHours("8:30 AM - 5:00 PM");
      setContactEmail("");
      setContactPhone("");
      setSafetyGuidelines("Safety goggles and closed footwear mandatory in workbench zones.");
    }
    setError(null);
  }, [editingLab, isOpen, departments]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !code.trim() || !location.trim() || !departmentId) {
      setError("Please complete all required laboratory profile fields.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<Laboratory> = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        department_id: departmentId,
        location: location.trim(),
        description: description.trim() || undefined,
        operating_hours: operatingHours.trim(),
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        safety_guidelines: safetyGuidelines.trim() || undefined,
      };

      if (editingLab) {
        await resourceService.updateLaboratory(editingLab.id, payload);
      } else {
        await resourceService.createLaboratory(payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error?.message ||
          "Failed to save laboratory profile."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg max-h-[90vh] rounded-2xl bg-card border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b px-5 py-3.5 bg-muted/40 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {editingLab ? "Update Laboratory Profile" : "Register Engineering Laboratory"}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Define laboratory facility location, contact points, and safety rules
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

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-destructive/15 text-destructive font-medium text-[11px]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-semibold text-muted-foreground block mb-1">
                Laboratory Name *
              </label>
              <Input
                type="text"
                placeholder="e.g. Embedded Systems & Robotics Lab"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-xs h-8"
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Lab Code *
              </label>
              <Input
                type="text"
                placeholder="e.g. LAB-EMB-01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="text-xs h-8 uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Engineering Department *
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary"
                required
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Facility Location *
              </label>
              <Input
                type="text"
                placeholder="e.g. Room 304, Level 3, East Wing"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="text-xs h-8"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-muted-foreground block mb-1">
              Laboratory Overview & Description
            </label>
            <Textarea
              placeholder="Research domains, student facilities, key equipment available in this lab..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Operating Hours
              </label>
              <Input
                type="text"
                value={operatingHours}
                onChange={(e) => setOperatingHours(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Contact Email
              </label>
              <Input
                type="email"
                placeholder="lab@eng.sjp.ac.lk"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Extension / Phone
              </label>
              <Input
                type="text"
                placeholder="+94 11 280 2000 Ext 45"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-muted-foreground block mb-1">
              Safety Rules & PPE Guidelines
            </label>
            <Textarea
              placeholder="Safety goggles, footwear, ESD grounding wristbands, emergency protocols..."
              value={safetyGuidelines}
              onChange={(e) => setSafetyGuidelines(e.target.value)}
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="usj" size="sm" disabled={submitting} className="font-semibold gap-1.5 shadow-xs text-xs">
              <Save className="h-3.5 w-3.5" />
              <span>{submitting ? "Saving..." : editingLab ? "Update Laboratory" : "Register Laboratory"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
