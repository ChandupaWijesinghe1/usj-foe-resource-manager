"use client";

import React, { useEffect, useState } from "react";
import {
  Check,
  Coins,
  Cpu,
  Layers,
  MapPin,
  Plus,
  Printer,
  Save,
  Tag,
  Upload,
  UploadCloud,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { resourceService } from "@/services/resource.service";
import { Laboratory, LabService } from "@/types";

interface ServicePublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingService?: LabService | null;
  laboratories: Laboratory[];
}

const CATEGORIES = [
  "Microcontrollers & Boards",
  "Single Board Computers & Embedded",
  "Sensors & Electronic Components",
  "Rapid Prototyping & 3D Printing",
  "PCB Manufacturing & Fabrication",
  "Test & Measurement Instruments",
  "Computer Laboratories & HPC",
  "Other Engineering Services",
];

export function ServicePublishModal({
  isOpen,
  onClose,
  onSaved,
  editingService,
  laboratories,
}: ServicePublishModalProps) {
  const [labId, setLabId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [serviceType, setServiceType] = useState<any>("EQUIPMENT_LOAN");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [turnaroundDays, setTurnaroundDays] = useState(3);
  const [costPerUnit, setCostPerUnit] = useState(0);
  const [unitName, setUnitName] = useState("item");
  const [totalQuantity, setTotalQuantity] = useState<string>("10");
  const [availableQuantity, setAvailableQuantity] = useState<string>("10");
  const [isAvailable, setIsAvailable] = useState(true);
  const [usageInstructions, setUsageInstructions] = useState("");
  const [borrowingConditions, setBorrowingConditions] = useState("");

  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingService) {
      setLabId(editingService.lab_id);
      setServiceName(editingService.service_name);
      setCategory(editingService.category || CATEGORIES[0]);
      setServiceType(editingService.service_type);
      setDescription(editingService.description);
      setImageUrl(editingService.image_url || "");
      setTurnaroundDays(editingService.turnaround_time_days || 3);
      setCostPerUnit(Number(editingService.cost_per_unit) || 0);
      setUnitName(editingService.unit_name || "item");
      setTotalQuantity(
        editingService.total_quantity !== null && editingService.total_quantity !== undefined
          ? editingService.total_quantity.toString()
          : ""
      );
      setAvailableQuantity(
        editingService.available_quantity !== null && editingService.available_quantity !== undefined
          ? editingService.available_quantity.toString()
          : ""
      );
      setIsAvailable(editingService.is_available);
      setUsageInstructions(editingService.usage_instructions || "");
      setBorrowingConditions(editingService.borrowing_conditions || "");
    } else {
      setLabId(laboratories[0]?.id || "");
      setServiceName("");
      setCategory(CATEGORIES[0]);
      setServiceType("EQUIPMENT_LOAN");
      setDescription("");
      setImageUrl("");
      setTurnaroundDays(3);
      setCostPerUnit(0);
      setUnitName("item");
      setTotalQuantity("10");
      setAvailableQuantity("10");
      setIsAvailable(true);
      setUsageInstructions("");
      setBorrowingConditions("Maximum borrowing duration 14 days. Must return in working condition.");
    }
    setError(null);
  }, [editingService, isOpen, laboratories]);

  if (!isOpen) return null;

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploadingImage(true);
    try {
      const res = await resourceService.uploadServiceImage(file);
      setImageUrl(res.url);
    } catch {
      setError("Failed to upload image. Please enter an image URL instead.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!labId) {
      setError("Please select a hosting laboratory.");
      return;
    }

    if (!serviceName.trim()) {
      setError("Please provide a name.");
      return;
    }

    if (!description.trim()) {
      setError("Please provide a description.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<LabService> = {
        lab_id: labId,
        service_name: serviceName.trim(),
        category,
        service_type: serviceType,
        description: description.trim(),
        image_url: imageUrl.trim() || undefined,
        turnaround_time_days: turnaroundDays,
        cost_per_unit: costPerUnit,
        unit_name: unitName.trim() || "unit",
        total_quantity: totalQuantity ? parseInt(totalQuantity, 10) : undefined,
        available_quantity: availableQuantity ? parseInt(availableQuantity, 10) : undefined,
        is_available: isAvailable,
        usage_instructions: usageInstructions.trim() || undefined,
        borrowing_conditions: borrowingConditions.trim() || undefined,
        is_active: true,
      };

      if (editingService) {
        await resourceService.updateService(editingService.id, payload);
      } else {
        await resourceService.createService(payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error?.message ||
          "Failed to save service offering."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl max-h-[92vh] rounded-2xl bg-card border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b px-5 py-3.5 bg-muted/40 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {editingService ? "Update Service or Equipment" : "Publish Service / Equipment Offering"}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Register facilities, microcontrollers, 3D printers, or test equipment in the university catalog
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

          {/* Hosting Lab & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Hosting Laboratory *
              </label>
              <select
                value={labId}
                onChange={(e) => setLabId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary"
                required
              >
                {laboratories.map((lab) => (
                  <option key={lab.id} value={lab.id}>
                    {lab.name} ({lab.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Marketplace Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Service Name & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-semibold text-muted-foreground block mb-1">
                Product / Service Name *
              </label>
              <Input
                type="text"
                placeholder="e.g. Arduino Mega 2560 Prototyping Kit"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                required
                className="text-xs h-8"
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Technical Service Type
              </label>
              <select
                value={serviceType}
                onChange={(e: any) => setServiceType(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
              >
                <option value="EQUIPMENT_LOAN">Equipment Loan</option>
                <option value="ELECTRONIC_COMPONENTS">Components & Sensors</option>
                <option value="THREE_D_PRINTING">3D Printing</option>
                <option value="PCB_FABRICATION">PCB Fabrication</option>
                <option value="COMPUTING_FACILITY">Computer Lab Facility</option>
                <option value="LASER_CUTTING">Laser Cutting</option>
                <option value="MATERIAL_TESTING">Material Testing</option>
                <option value="OTHER">Other Service</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="font-semibold text-muted-foreground block mb-1">
              Description & Capabilities *
            </label>
            <Textarea
              placeholder="Technical specs, key features, hardware pinouts, or manufacturing precision..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
              className="text-xs resize-none"
            />
          </div>

          {/* Quantities & Pricing */}
          <div className="p-3 rounded-xl bg-muted/40 border space-y-3">
            <span className="font-bold text-xs text-foreground block">
              Inventory Allocation & Pricing
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[10px] text-muted-foreground font-semibold block mb-1">
                  Total Stock Quantity
                </label>
                <Input
                  type="number"
                  min={0}
                  value={totalQuantity}
                  onChange={(e) => setTotalQuantity(e.target.value)}
                  placeholder="e.g. 25"
                  className="text-xs h-8"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground font-semibold block mb-1">
                  Currently Available
                </label>
                <Input
                  type="number"
                  min={0}
                  value={availableQuantity}
                  onChange={(e) => setAvailableQuantity(e.target.value)}
                  placeholder="e.g. 20"
                  className="text-xs h-8"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground font-semibold block mb-1">
                  Charge (LKR)
                </label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="text-xs h-8"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground font-semibold block mb-1">
                  Unit Name
                </label>
                <Input
                  type="text"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  placeholder="item / gram / hr"
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="avail-toggle"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="rounded border text-primary focus:ring-primary"
                />
                <label htmlFor="avail-toggle" className="text-xs font-semibold text-foreground cursor-pointer">
                  Mark as Available in Directory
                </label>
              </div>

              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="text-[11px]">Turnaround:</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={turnaroundDays}
                  onChange={(e) => setTurnaroundDays(parseInt(e.target.value, 10) || 3)}
                  className="w-14 rounded border p-1 text-xs text-center bg-background"
                />
                <span className="text-[11px]">days</span>
              </div>
            </div>
          </div>

          {/* Usage Instructions & Borrowing Rules */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Usage Guidelines & Instructions
              </label>
              <Textarea
                placeholder="Software requirements, IDE settings, lab bench handling..."
                value={usageInstructions}
                onChange={(e) => setUsageInstructions(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Borrowing Conditions & Terms
              </label>
              <Textarea
                placeholder="Maximum borrowing period, packaging requirements, supervisor approvals..."
                value={borrowingConditions}
                onChange={(e) => setBorrowingConditions(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>
          </div>

          {/* Image URL or Upload */}
          <div>
            <label className="font-semibold text-muted-foreground block mb-1">
              Product Image URL (or upload image)
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="https://images.unsplash.com/... or uploaded path"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="text-xs h-8 flex-1"
              />
              <label className="shrink-0 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                  disabled={uploadingImage}
                />
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs bg-muted hover:bg-muted/80 font-medium">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploadingImage ? "Uploading..." : "Upload"}</span>
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="usj" size="sm" disabled={submitting} className="font-semibold gap-1.5 shadow-xs text-xs">
              <Save className="h-3.5 w-3.5" />
              <span>{submitting ? "Saving..." : editingService ? "Update Offering" : "Publish to Catalog"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
