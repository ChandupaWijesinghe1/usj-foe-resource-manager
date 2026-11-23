"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Cpu,
  Filter,
  Layers,
  Mail,
  MapPin,
  Phone,
  Plus,
  Printer,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LaboratoryProfileModal } from "@/components/services/LaboratoryProfileModal";
import { ServiceCard } from "@/components/services/ServiceCard";
import { ServiceDetailModal } from "@/components/services/ServiceDetailModal";
import { ServicePublishModal } from "@/components/services/ServicePublishModal";
import { ServiceRequestModal } from "@/components/services/ServiceRequestModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { resourceService } from "@/services/resource.service";
import { Department, Laboratory, LabService } from "@/types";

const CATEGORY_TABS = [
  { id: "ALL", label: "All Offerings" },
  { id: "Microcontrollers", label: "Microcontrollers & Boards" },
  { id: "Embedded", label: "Embedded & SBCs" },
  { id: "3D", label: "3D Printing" },
  { id: "PCB", label: "PCB Manufacturing" },
  { id: "Sensors", label: "Sensors & Components" },
  { id: "Computer", label: "Computer Labs" },
  { id: "Test", label: "Test & Instruments" },
];

export default function ServicesPage() {
  const { user } = useAuth();
  const isLabAdmin = user?.role === "LAB_ADMIN" || user?.role === "SUPER_ADMIN";

  // Navigation tab: Marketplace vs Laboratories
  const [activeView, setActiveView] = useState<"marketplace" | "laboratories">("marketplace");

  // Data states
  const [services, setServices] = useState<LabService[]>([]);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedLabId, setSelectedLabId] = useState("ALL");
  const [availableOnly, setAvailableOnly] = useState(false);

  // Modals
  const [detailService, setDetailService] = useState<LabService | null>(null);
  const [requestService, setRequestService] = useState<LabService | null>(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<LabService | null>(null);
  const [labModalOpen, setLabModalOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<Laboratory | null>(null);

  // Notification Toast
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchServices();
  }, [searchQuery, selectedCategory, selectedLabId, availableOnly]);

  const fetchInitialData = async () => {
    try {
      const [labsRes, deptsRes] = await Promise.allSettled([
        resourceService.getLaboratories(),
        api.get("/users/departments"),
      ]);
      if (labsRes.status === "fulfilled") setLaboratories(labsRes.value);
      if (deptsRes.status === "fulfilled") setDepartments(deptsRes.value.data);
    } catch {
      // Ignore fallback
    }
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const data = await resourceService.getServicesDirectory({
        search: searchQuery.trim() || undefined,
        category: selectedCategory !== "ALL" ? selectedCategory : undefined,
        labId: selectedLabId !== "ALL" ? selectedLabId : undefined,
        availableOnly: availableOnly ? true : undefined,
      });
      setServices(data);
    } catch (err: any) {
      console.error("Failed to load services directory:", err);
      // Fallback demo items if backend initial database is empty
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = async (srv: LabService) => {
    if (!confirm(`Are you sure you want to remove "${srv.service_name}" from the active catalog?`)) {
      return;
    }
    try {
      await resourceService.deleteService(srv.id);
      setFeedback({ type: "success", message: `"${srv.service_name}" has been deactivated.` });
      fetchServices();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.response?.data?.detail || "Could not delete service.",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Laboratory Services &amp; 3D Printing
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Browse lab facilities, services, and submit 3D printing requests
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isLabAdmin && (
              <>
                <Button
                  size="sm"
                  variant="usj"
                  onClick={() => {
                    setEditingService(null);
                    setPublishModalOpen(true);
                  }}
                  className="font-semibold text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Publish Service</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingLab(null);
                    setLabModalOpen(true);
                  }}
                  className="text-xs gap-1.5"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Register Laboratory</span>
                </Button>
              </>
            )}

            <Link href="/my-requests">
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
              >
                View My Requests
              </Button>
            </Link>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
              feedback.type === "success"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-destructive/15 text-destructive"
            }`}
          >
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* View Switcher: Marketplace vs Laboratories */}
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView("marketplace")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === "marketplace"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Services & Equipment Catalog ({services.length})
            </button>

            <button
              onClick={() => setActiveView("laboratories")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === "laboratories"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Engineering Laboratories ({laboratories.length})
            </button>
          </div>

          <div className="text-[11px] text-muted-foreground hidden sm:block">
            USJ Faculty of Engineering Resources
          </div>
        </div>

        {/* ================= VIEW 1: SERVICES MARKETPLACE ================= */}
        {activeView === "marketplace" && (
          <div className="space-y-5">
            {/* Search & Filter Toolbar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-4 rounded-xl border">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search microcontrollers, Arduino, Raspberry Pi, 3D printing, sensors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs h-9 w-full"
                />
              </div>

              {/* Lab Selector Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedLabId}
                  onChange={(e) => setSelectedLabId(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary h-9"
                >
                  <option value="ALL">All Laboratories</option>
                  {laboratories.map((lab) => (
                    <option key={lab.id} value={lab.id}>
                      {lab.name}
                    </option>
                  ))}
                </select>

                {/* Available Only Toggle */}
                <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground cursor-pointer whitespace-nowrap bg-muted/60 px-3 py-1.5 rounded-md border h-9">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => setAvailableOnly(e.target.checked)}
                    className="rounded border text-primary focus:ring-primary"
                  />
                  <span>In Stock Only</span>
                </label>
              </div>
            </div>

            {/* Horizontal Category Scroll Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === tab.id
                      ? "bg-primary text-primary-foreground shadow-elevation-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Services Grid */}
            {loading ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                <Clock className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                Loading university services directory...
              </div>
            ) : services.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground border rounded-xl border-dashed p-6 bg-card">
                <Wrench className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                <p className="font-semibold text-foreground text-sm">No services or equipment found.</p>
                <p className="text-xs mt-1">
                  Try adjusting your search query, selecting another category, or clearing the availability filter.
                </p>
                {isLabAdmin && (
                  <Button
                    size="sm"
                    variant="usj"
                    onClick={() => {
                      setEditingService(null);
                      setPublishModalOpen(true);
                    }}
                    className="mt-3 text-xs font-semibold"
                  >
                    Publish First Offering
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {services.map((srv) => (
                  <ServiceCard
                    key={srv.id}
                    service={srv}
                    isAdmin={isLabAdmin}
                    onViewDetails={(s) => setDetailService(s)}
                    onRequest={(s) => setRequestService(s)}
                    onEdit={(s) => {
                      setEditingService(s);
                      setPublishModalOpen(true);
                    }}
                    onDelete={handleDeleteService}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= VIEW 2: LABORATORIES DIRECTORY ================= */}
        {activeView === "laboratories" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Faculty of Engineering Laboratories
                </h2>
                <p className="text-xs text-muted-foreground">
                  Explore departmental labs, operating hours, workbench guidelines, and technical personnel
                </p>
              </div>

              {isLabAdmin && (
                <Button
                  size="sm"
                  variant="usj"
                  onClick={() => {
                    setEditingLab(null);
                    setLabModalOpen(true);
                  }}
                  className="text-xs font-semibold gap-1.5 shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Register Laboratory</span>
                </Button>
              )}
            </div>

            {laboratories.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground border rounded-xl border-dashed p-6 bg-card">
                <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                <p className="font-semibold text-foreground text-sm">No laboratories registered yet.</p>
                <p className="text-xs mt-1">Lab Admins can register faculty laboratories.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {laboratories.map((lab) => (
                  <Card key={lab.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="outline" className="text-[10px] font-bold mb-1">
                            {lab.code}
                          </Badge>
                          <CardTitle className="text-base">{lab.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {lab.department?.name || "Department of Engineering"}
                          </CardDescription>
                        </div>
                        <Building2 className="h-6 w-6 text-primary shrink-0 opacity-80" />
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-2.5 text-xs text-muted-foreground py-2 border-t">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{lab.location}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Hours: {lab.operating_hours}</span>
                      </div>

                      {lab.description && (
                        <p className="text-[11px] line-clamp-2 italic pt-1">{lab.description}</p>
                      )}

                      {/* Contact Info */}
                      <div className="pt-2 border-t space-y-1">
                        <p className="font-semibold text-foreground text-[11px]">
                          In-Charge: {lab.admin_in_charge?.full_name || "Technical Staff"}
                        </p>
                        <p className="text-[11px] flex items-center gap-1.5 truncate">
                          <Mail className="h-3 w-3 text-primary shrink-0" />
                          <span>{lab.contact_email || lab.admin_in_charge?.email || "lab@eng.sjp.ac.lk"}</span>
                        </p>
                        {(lab.contact_phone || lab.admin_in_charge?.phone_number) && (
                          <p className="text-[11px] flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-primary shrink-0" />
                            <span>{lab.contact_phone || lab.admin_in_charge?.phone_number}</span>
                          </p>
                        )}
                      </div>

                      {/* Safety Rules snippet */}
                      {lab.safety_guidelines && (
                        <div className="p-2 rounded bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-[10px] text-amber-800 dark:text-amber-300">
                          <span className="font-bold">Safety Rule: </span>
                          <span className="line-clamp-1">{lab.safety_guidelines}</span>
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="pt-3 border-t flex items-center justify-between bg-muted/10">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => {
                          setSelectedLabId(lab.id);
                          setActiveView("marketplace");
                        }}
                      >
                        View Lab Services
                      </Button>

                      {isLabAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8 text-primary"
                          onClick={() => {
                            setEditingLab(lab);
                            setLabModalOpen(true);
                          }}
                        >
                          Edit Profile
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal 1: Service Detail Dialog */}
        <ServiceDetailModal
          service={detailService}
          isOpen={!!detailService}
          onClose={() => setDetailService(null)}
          onRequest={(s) => setRequestService(s)}
        />

        {/* Modal 2: Service Request Dialog */}
        <ServiceRequestModal
          service={requestService}
          isOpen={!!requestService}
          onClose={() => setRequestService(null)}
          onSuccess={() => {
            setFeedback({
              type: "success",
              message: "Your petition was submitted successfully. You can track progress under My Requests.",
            });
            fetchServices();
          }}
        />

        {/* Modal 3: Service Publish / Edit Dialog (Lab Admin) */}
        <ServicePublishModal
          isOpen={publishModalOpen}
          onClose={() => {
            setPublishModalOpen(false);
            setEditingService(null);
          }}
          onSaved={() => {
            setFeedback({
              type: "success",
              message: editingService ? "Offering updated successfully." : "New offering published to catalog.",
            });
            fetchServices();
          }}
          editingService={editingService}
          laboratories={laboratories}
        />

        {/* Modal 4: Laboratory Profile Dialog (Lab Admin) */}
        <LaboratoryProfileModal
          isOpen={labModalOpen}
          onClose={() => {
            setLabModalOpen(false);
            setEditingLab(null);
          }}
          onSaved={() => {
            setFeedback({
              type: "success",
              message: editingLab ? "Laboratory profile updated." : "New laboratory registered successfully.",
            });
            fetchInitialData();
          }}
          editingLab={editingLab}
          departments={departments}
        />
      </div>
    </DashboardLayout>
  );
}
