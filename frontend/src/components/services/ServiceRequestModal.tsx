"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  FileCode,
  Layers,
  Printer,
  Sparkles,
  UploadCloud,
  Wrench,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { resourceService } from "@/services/resource.service";
import { LabService } from "@/types";

interface ServiceRequestModalProps {
  service: LabService | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ServiceRequestModal({
  service,
  isOpen,
  onClose,
  onSuccess,
}: ServiceRequestModalProps) {
  const [projectTitle, setProjectTitle] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [description, setDescription] = useState("");
  const [requestedQuantity, setRequestedQuantity] = useState(1);
  const [dimensions, setDimensions] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  // 3D Print specific
  const [materialType, setMaterialType] = useState<"PLA" | "ABS" | "PETG" | "RESIN" | "TPU">("PLA");
  const [color, setColor] = useState("Black");
  const [infill, setInfill] = useState(20);
  const [cadFile, setCadFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !service) return null;

  const is3DPrint = service.service_type === "THREE_D_PRINTING";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!projectTitle.trim()) {
      setError("Please provide a project title or module code.");
      return;
    }

    if (!description.trim()) {
      setError("Please provide a description of your project or requirements.");
      return;
    }

    if (is3DPrint && !cadFile) {
      setError("Please attach a CAD model file (.stl, .obj, .step, .3mf).");
      return;
    }

    setSubmitting(true);
    try {
      if (is3DPrint && cadFile) {
        // Multipart form upload for 3D printing
        const formData = new FormData();
        formData.append("service_id", service.id);
        formData.append("project_title", projectTitle.trim());
        formData.append("description", description.trim());
        formData.append("material_type", materialType);
        formData.append("color", color);
        formData.append("infill_percentage", infill.toString());
        if (supervisorName.trim()) {
          formData.append("supervisor_name", supervisorName.trim());
        }
        formData.append("cad_file", cadFile);

        await api.post("/services/requests/3d-print", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        // Upload attachment if present
        let attUrl: string | undefined = undefined;
        let attName: string | undefined = undefined;
        if (attachmentFile) {
          const uploadRes = await resourceService.uploadServiceAttachment(attachmentFile);
          attUrl = uploadRes.url;
          attName = uploadRes.filename;
        }

        // Standard service or equipment loan request
        await resourceService.submitServiceRequest({
          service_id: service.id,
          project_title: projectTitle.trim(),
          description: description.trim(),
          requested_quantity: requestedQuantity,
          supervisor_name: supervisorName.trim() || undefined,
          dimensions: dimensions.trim() || undefined,
          preferred_date: preferredDate ? new Date(preferredDate).toISOString() : undefined,
          attachment_url: attUrl,
          attachment_name: attName,
        });
      }

      setSuccessMsg(`Your request for "${service.service_name}" has been submitted successfully!`);
      setTimeout(() => {
        onSuccess();
        onClose();
        // Reset form
        setProjectTitle("");
        setSupervisorName("");
        setDescription("");
        setRequestedQuantity(1);
        setDimensions("");
        setPreferredDate("");
        setAttachmentFile(null);
        setCadFile(null);
        setSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error?.message ||
          "Failed to submit request. Please verify inputs."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b px-5 py-3.5 bg-muted/40">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {is3DPrint ? <Printer className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground truncate max-w-[340px]">
                Request: {service.service_name}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {service.laboratory?.name || "University Laboratory Facility"}
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

          {successMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium text-[11px]">
              {successMsg}
            </div>
          )}

          {/* Project Title */}
          <div>
            <label className="font-semibold text-muted-foreground block mb-1">
              Project Title / Coursework Module *
            </label>
            <Input
              type="text"
              placeholder="e.g. Final Year Project: Teleoperated Robotic Manipulator"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              required
              className="text-xs h-8"
            />
          </div>

          {/* Supervisor & Quantity row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Academic Supervisor / Lecturer
              </label>
              <Input
                type="text"
                placeholder="e.g. Dr. Kamal Perera"
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Requested Quantity
              </label>
              <Input
                type="number"
                min={1}
                max={service.available_quantity || 10}
                value={requestedQuantity}
                onChange={(e) => setRequestedQuantity(parseInt(e.target.value, 10) || 1)}
                className="text-xs h-8"
              />
              {service.available_quantity !== null && service.available_quantity !== undefined && (
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Max available: {service.available_quantity} units
                </span>
              )}
            </div>
          </div>

          {/* Non-3D Print Requirements Section */}
          {!is3DPrint && (
            <div className="p-3.5 rounded-xl bg-muted/40 border space-y-3">
              <span className="font-bold text-xs text-foreground block">
                Technical Specifications & Schedule
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold block mb-1">
                    Dimensions / Material / Board Specs
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. 100mm x 80mm FR4 double-layer"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold block mb-1">
                    Preferred Service Date
                  </label>
                  <Input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>

              {/* General Attachment Upload */}
              <div>
                <label className="text-[10px] text-muted-foreground font-semibold block mb-1">
                  Attach Design / Gerber / Specification File (Optional)
                </label>
                <div className="border border-dashed rounded-lg p-3 text-center bg-background/50 hover:bg-background transition-colors">
                  <input
                    type="file"
                    id="gen-att-upload"
                    accept=".stl,.obj,.step,.stp,.3mf,.pdf,.zip,.rar,.dxf,.dwg,.png,.jpg"
                    onChange={(e) => e.target.files && setAttachmentFile(e.target.files[0])}
                    className="hidden"
                  />
                  <label
                    htmlFor="gen-att-upload"
                    className="cursor-pointer flex flex-col items-center justify-center gap-1"
                  >
                    <UploadCloud className="h-5 w-5 text-primary" />
                    <span className="text-[11px] font-semibold text-foreground">
                      {attachmentFile ? attachmentFile.name : "Select technical document or design archive"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Supported: PDF, ZIP, RAR, DXF, DWG, STEP, STL (Max 50MB)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 3D Print Specific Section */}
          {is3DPrint && (
            <div className="p-3.5 rounded-xl bg-muted/40 border space-y-3">
              <span className="font-bold text-xs text-foreground block">
                3D Printing Specifications & CAD Attachment
              </span>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold block mb-1">
                    Filament Material
                  </label>
                  <select
                    value={materialType}
                    onChange={(e: any) => setMaterialType(e.target.value)}
                    className="w-full text-xs rounded border bg-background p-1.5"
                  >
                    <option value="PLA">PLA (Standard)</option>
                    <option value="PETG">PETG (Durable)</option>
                    <option value="ABS">ABS (Heat Resist)</option>
                    <option value="RESIN">Resin (High Detail)</option>
                    <option value="TPU">TPU (Flexible)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold block mb-1">
                    Color Preference
                  </label>
                  <Input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold block mb-1">
                    Infill ({infill}%)
                  </label>
                  <Input
                    type="number"
                    min={10}
                    max={100}
                    step={5}
                    value={infill}
                    onChange={(e) => setInfill(parseInt(e.target.value, 10) || 20)}
                    className="text-xs h-8"
                  />
                </div>
              </div>

              {/* CAD File Picker */}
              <div>
                <label className="text-[10px] text-muted-foreground font-semibold block mb-1">
                  Upload CAD Model (.stl, .obj, .step) *
                </label>
                <div className="border border-dashed rounded-lg p-3 text-center bg-background/50 hover:bg-background transition-colors">
                  <input
                    type="file"
                    id="cad-upload"
                    accept=".stl,.obj,.step,.stp,.3mf"
                    onChange={(e) => e.target.files && setCadFile(e.target.files[0])}
                    className="hidden"
                  />
                  <label
                    htmlFor="cad-upload"
                    className="cursor-pointer flex flex-col items-center justify-center gap-1"
                  >
                    <UploadCloud className="h-6 w-6 text-primary" />
                    <span className="text-[11px] font-semibold text-foreground">
                      {cadFile ? cadFile.name : "Click to select 3D model file"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Max file size: 50MB (.stl, .obj, .step)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Description & Purpose */}
          <div>
            <label className="font-semibold text-muted-foreground block mb-1">
              Purpose & Technical Description *
            </label>
            <Textarea
              placeholder="Describe what experiment or application this service/equipment will be used for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
              className="text-xs resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="usj"
              size="sm"
              disabled={submitting}
              className="font-semibold gap-1.5 shadow-xs text-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{submitting ? "Submitting..." : "Submit Petition"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
