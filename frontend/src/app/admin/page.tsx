"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  Eye,
  EyeOff,
  GraduationCap,
  Layers,
  Lock,
  LogOut,
  Mail,
  Package,
  Paperclip,
  Printer,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { EquipmentBorrow, FacilityBooking, ServiceRequest } from "@/types";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { resourceService } from "@/services/resource.service";

function AdminPortalLogin({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { user, login, logout, getDashboardUrl } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickRole, setQuickRole] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setIsSubmitting(true);
    try {
      const loggedUser = await login(email, password);
      if (!["SUPER_ADMIN", "FACILITY_ADMIN", "LAB_ADMIN"].includes(loggedUser.role)) {
        setServerError(
          `Logged in as ${loggedUser.full_name} (${loggedUser.role}), but administrative privileges are required to access this portal.`
        );
        return;
      }
      onLoginSuccess();
    } catch (err: any) {
      setServerError(
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        "Authentication failed. Please verify administrative credentials."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSeed = async (seedEmail: string, seedPass: string, roleKey: string) => {
    setEmail(seedEmail);
    setPassword(seedPass);
    setServerError(null);
    setQuickRole(roleKey);
    try {
      const loggedUser = await login(seedEmail, seedPass);
      if (!["SUPER_ADMIN", "FACILITY_ADMIN", "LAB_ADMIN"].includes(loggedUser.role)) {
        setServerError("User does not hold administrative clearance.");
        return;
      }
      onLoginSuccess();
    } catch (err: any) {
      setServerError(
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        "Quick seed sign-in failed."
      );
    } finally {
      setQuickRole(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f8fa] dark:bg-background p-3 sm:p-6 flex items-center justify-center">
      <div className="mx-auto flex w-full max-w-[1240px] min-h-[calc(100vh-3rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-elevation-lg">
        {/* Left Form Section */}
        <section className="flex w-full items-center justify-center px-6 py-10 sm:px-12 lg:w-[50%] lg:px-14">
          <div className="w-full max-w-[460px] space-y-6">
            {/* Header with University Crest */}
            <div className="flex items-center gap-3.5">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white p-1 shadow-elevation-sm ring-1 ring-border">
                <img
                  src="/logo.jpg"
                  alt="University of Sri Jayewardenepura Crest"
                  className="h-full w-full object-cover rounded-xl"
                />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                  Admin Portal
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#C41E3A]/10 text-primary border border-primary/25">
                    RESTRICTED
                  </span>
                </h1>
                <p className="text-xs text-muted-foreground">
                  Faculty of Engineering · USJ
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Administrative Sign In
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Authorized access for Hall Management, Loaning Desks, and Fabrication Admins
              </p>
            </div>

            {/* Institutional Security Notice */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-primary">
                <Shield className="h-4 w-4" />
                <span>Pre-Provisioned Seed Accounts Only</span>
              </div>
              <p className="leading-relaxed">
                Administrative roles are strictly assigned by Faculty Administration. Self-registration is disabled for all administrative positions.
              </p>
            </div>

            {/* Quick 1-Click Seed Admin Credentials */}
            <div className="rounded-xl border bg-muted/40 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-secondary" />
                  Seed Admin Credentials (1-Click)
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  Select Role
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {/* Super Admin */}
                <button
                  type="button"
                  disabled={isSubmitting || quickRole !== null}
                  onClick={() => handleQuickSeed("admin@eng.sjp.ac.lk", "Admin@USJ2026!", "SUPER_ADMIN")}
                  className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:border-primary/60 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      🛡️
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        Super Administrator
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        <code>admin@eng.sjp.ac.lk</code> · Full Governance
                      </p>
                    </div>
                  </div>
                  <Badge variant="destructive" className="text-[10px] px-1.5">
                    {quickRole === "SUPER_ADMIN" ? "Signing In..." : "Log In"}
                  </Badge>
                </button>

                {/* Facility Admin */}
                <button
                  type="button"
                  disabled={isSubmitting || quickRole !== null}
                  onClick={() => handleQuickSeed("facility.admin@eng.sjp.ac.lk", "Facility@USJ2026!", "FACILITY_ADMIN")}
                  className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:border-amber-500/60 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
                      🏛️
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                        Facility &amp; Hall Admin
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        <code>facility.admin@eng.sjp.ac.lk</code> · Halls &amp; Booking
                      </p>
                    </div>
                  </div>
                  <Badge variant="gold" className="text-[10px] px-1.5">
                    {quickRole === "FACILITY_ADMIN" ? "Signing In..." : "Log In"}
                  </Badge>
                </button>

                {/* Lab Admin */}
                <button
                  type="button"
                  disabled={isSubmitting || quickRole !== null}
                  onClick={() => handleQuickSeed("lab.admin@eng.sjp.ac.lk", "LabAdmin@USJ2026!", "LAB_ADMIN")}
                  className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:border-cyan-500/60 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20 transition-all text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 flex items-center justify-center font-bold text-sm">
                      🔬
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition-colors">
                        Laboratory Admin
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        <code>lab.admin@eng.sjp.ac.lk</code> · Equipment &amp; 3D Prints
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5">
                    {quickRole === "LAB_ADMIN" ? "Signing In..." : "Log In"}
                  </Badge>
                </button>
              </div>
            </div>

            {/* Non-Admin Session Warning */}
            {user && !["SUPER_ADMIN", "FACILITY_ADMIN", "LAB_ADMIN"].includes(user.role) && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>Currently Signed in as {user.role.replace("_", " ")}</span>
                </div>
                <p>
                  You are logged in as <strong>{user.full_name}</strong>. Administrative clearance is required to view this portal.
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={logout}
                  >
                    Switch Account
                  </Button>
                  <Link href={getDashboardUrl(user)}>
                    <Button variant="default" size="sm" className="h-7 text-xs">
                      Go to Your Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {serverError && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive flex items-center gap-2"
              >
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Manual Admin Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-email"
                  className="block text-xs font-semibold text-foreground"
                >
                  Administrator Email
                </label>
                <div className="relative">
                  <Mail
                    aria-hidden="true"
                    className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="admin-email"
                    type="email"
                    autoComplete="email"
                    placeholder="admin@eng.sjp.ac.lk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 rounded-lg pl-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-semibold text-foreground"
                >
                  Administrator Password
                </label>
                <div className="relative">
                  <Lock
                    aria-hidden="true"
                    className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter administrative password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 rounded-lg pl-10 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="usj"
                disabled={isSubmitting || quickRole !== null}
                className="h-11 w-full rounded-lg font-bold gap-2 text-sm shadow-elevation-md"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Authenticating Administrator...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Authenticate as Administrator
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Other Portals Switcher */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2 border-t">
              <Link
                href="/lecture"
                className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                <span>👨‍🏫</span>
                Faculty Lecturer Sign In (/lecture)
              </Link>
              <Link
                href="/login"
                className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                <GraduationCap className="h-3.5 w-3.5 text-secondary" />
                Student Login
              </Link>
            </div>

            <div className="text-center text-[11px] text-muted-foreground pt-1">
              University of Sri Jayewardenepura · Faculty of Engineering
            </div>
          </div>
        </section>

        {/* Right Hero Section with Faculty Building Backdrop */}
        <aside
          className="relative hidden lg:flex lg:w-[50%] overflow-hidden items-center justify-center text-white"
          aria-label="Faculty of Engineering Administration Portal"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/faculty-building-wide.webp')" }}
          />

          {/* USJ Brand Crimson / Navy Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(196,30,58,0.95)_0%,rgba(139,14,79,0.90)_45%,rgba(17,26,58,0.95)_100%)]" />

          {/* Dot matrix texture */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1.5px)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative z-10 max-w-md px-8 text-center space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-md p-2 shadow-elevation-lg ring-2 ring-white/30">
              <img
                src="/logo.jpg"
                alt="University Crest"
                className="h-full w-full object-cover rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur border border-white/25 text-[#FDB913]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Administrative Command Center
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight drop-shadow-md">
                Admin Management Portal
              </h2>
              <p className="text-sm text-white/85 leading-relaxed">
                Operations control for lecture hall allocations, equipment loaning governance, laboratory fabrication requests, and maintenance schedules.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 text-left">
              <div className="rounded-xl bg-white/10 backdrop-blur border border-white/15 p-3 space-y-1">
                <CalendarDays className="h-5 w-5 text-[#FDB913]" />
                <p className="text-xs font-bold">Hall Bookings</p>
                <p className="text-[11px] text-white/75">
                  Review and approve facility reservations with schedule conflict check
                </p>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur border border-white/15 p-3 space-y-1">
                <Wrench className="h-5 w-5 text-[#FDB913]" />
                <p className="text-xs font-bold">Loaning Desk</p>
                <p className="text-[11px] text-white/75">
                  Verify tool dispatches, monitor overdue equipment, and log damage
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function AdminPage() {
  const { user, hasRole, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"halls" | "equipment" | "prints">("halls");

  const [bookings, setBookings] = useState<FacilityBooking[]>([]);
  const [borrows, setBorrows] = useState<EquipmentBorrow[]>([]);
  const [prints, setPrints] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Status Filter States
  const [borrowStatusFilter, setBorrowStatusFilter] = useState<string>("ALL");
  const [serviceStatusFilter, setServiceStatusFilter] = useState<string>("ALL");

  // Equipment Loaning Modals State
  const [approveBorrowItem, setApproveBorrowItem] = useState<EquipmentBorrow | null>(null);
  const [collectionInstructions, setCollectionInstructions] = useState<string>("Collect from Electronics Lab #2 Workbench 4 between 9:00 AM - 4:00 PM with your student ID");
  const [returnBorrowItem, setReturnBorrowItem] = useState<EquipmentBorrow | null>(null);
  const [returnCondition, setReturnCondition] = useState<string>("Tested and verified operational - all accessories intact");
  const [isDamagedOrMissing, setIsDamagedOrMissing] = useState<boolean>(false);
  const [damageNotes, setDamageNotes] = useState<string>("");

  // Service Request Modals State
  const [scheduleServiceItem, setScheduleServiceItem] = useState<ServiceRequest | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState<string>("");
  const [scheduleNotes, setScheduleNotes] = useState<string>("Slot allocated. Please report to the lab at your scheduled time.");

  const [completeServiceItem, setCompleteServiceItem] = useState<ServiceRequest | null>(null);
  const [recordedChargesLkr, setRecordedChargesLkr] = useState<number>(0);
  const [completeNotes, setCompleteNotes] = useState<string>("Job completed and inspected. Ready for collection.");

  // Estimation Modal State (3D Prints)
  const [estimateJob, setEstimateJob] = useState<ServiceRequest | null>(null);
  const [grams, setGrams] = useState(85);
  const [hours, setHours] = useState(3.5);
  const [costLkr, setCostLkr] = useState(1500);
  const [sliceNotes, setSliceNotes] = useState("Sliced with 0.2mm layer height on PrusaSlicer");

  useEffect(() => {
    fetchAdminData();
  }, [user]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [resHalls, resBorrows, resPrints] = await Promise.allSettled([
        resourceService.getFacilityBookings(),
        resourceService.getEquipmentBorrows(),
        resourceService.getAllServiceRequests(),
      ]);

      if (resHalls.status === "fulfilled") setBookings(resHalls.value);
      if (resBorrows.status === "fulfilled") setBorrows(resBorrows.value);
      if (resPrints.status === "fulfilled") setPrints(resPrints.value);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingAction = async (bookingId: string, status: "APPROVED" | "REJECTED") => {
    let rejectionReason: string | undefined = undefined;
    if (status === "REJECTED") {
      const promptRes = prompt("Please provide a rejection reason for this reservation request:", "Schedule conflict / Facility unavailable");
      if (promptRes === null) return;
      rejectionReason = promptRes.trim() || "Declined by Facility Administration";
    }

    try {
      await resourceService.updateBookingStatus(bookingId, status, rejectionReason);
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.response?.data?.detail || "Action failed.");
    }
  };

  // Equipment Handlers
  const handleApproveBorrowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveBorrowItem) return;
    try {
      await resourceService.updateBorrowStatus(approveBorrowItem.id, {
        status: "APPROVED",
        collection_instructions: collectionInstructions.trim(),
      });
      setApproveBorrowItem(null);
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.response?.data?.detail || "Failed to approve borrow request.");
    }
  };

  const handleRejectBorrow = async (borrowId: string) => {
    const reason = prompt("Enter rejection reason for this borrow request:", "Inventory reserved for academic lab practicals");
    if (reason === null) return;
    try {
      await resourceService.updateBorrowStatus(borrowId, {
        status: "REJECTED",
        rejection_reason: reason.trim() || "Declined by Laboratory Administration",
      });
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to reject borrow request.");
    }
  };

  const handleIssueEquipment = async (borrowId: string) => {
    if (!confirm("Confirm physical issuance of this equipment to the student?")) return;
    try {
      await resourceService.updateBorrowStatus(borrowId, {
        status: "IN_PROGRESS",
        admin_notes: "Physical unit verified and handed over to student.",
      });
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to record equipment issuance.");
    }
  };

  const handleReturnBorrowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnBorrowItem) return;
    try {
      await resourceService.updateBorrowStatus(returnBorrowItem.id, {
        status: "COMPLETED",
        condition_on_return: returnCondition.trim(),
        is_damaged_or_missing: isDamagedOrMissing,
        damage_notes: isDamagedOrMissing ? damageNotes.trim() : undefined,
      });
      setReturnBorrowItem(null);
      setIsDamagedOrMissing(false);
      setDamageNotes("");
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to check-in returned equipment.");
    }
  };

  // Service Request Handlers
  const handleScheduleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleServiceItem) return;
    try {
      await resourceService.updateServiceRequestStatus(scheduleServiceItem.id, {
        status: "SCHEDULED",
        scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
        estimated_completion_date: estimatedCompletionDate ? new Date(estimatedCompletionDate).toISOString() : undefined,
        admin_notes: scheduleNotes.trim(),
      });
      setScheduleServiceItem(null);
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to schedule service appointment.");
    }
  };

  const handleStartServiceProgress = async (requestId: string) => {
    try {
      await resourceService.updateServiceRequestStatus(requestId, {
        status: "IN_PROGRESS",
        admin_notes: "Job currently undergoing processing/fabrication in the laboratory.",
      });
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update service progress.");
    }
  };

  const handleCompleteServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeServiceItem) return;
    try {
      await resourceService.updateServiceRequestStatus(completeServiceItem.id, {
        status: "COMPLETED",
        recorded_charges_lkr: Number(recordedChargesLkr) || 0,
        admin_notes: completeNotes.trim(),
      });
      setCompleteServiceItem(null);
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to mark service request as completed.");
    }
  };

  const handleRejectService = async (requestId: string) => {
    const reason = prompt("Enter rejection reason for this service petition:", "Material specifications cannot be accommodated");
    if (reason === null) return;
    try {
      await resourceService.updateServiceRequestStatus(requestId, {
        status: "REJECTED",
        rejection_reason: reason.trim() || "Declined by Laboratory Administration",
      });
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to reject service request.");
    }
  };

  const handleSaveEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estimateJob) return;

    try {
      await api.patch(`/services/requests/${estimateJob.id}/estimate`, {
        estimated_filament_grams: Number(grams),
        estimated_print_hours: Number(hours),
        calculated_cost_lkr: Number(costLkr),
        slicing_notes: sliceNotes,
      });
      setEstimateJob(null);
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to set estimate.");
    }
  };

  const filteredBorrows = borrows.filter((b) => {
    if (borrowStatusFilter === "ALL") return true;
    return b.status === borrowStatusFilter;
  });

  const filteredServices = prints.filter((p) => {
    if (serviceStatusFilter === "ALL") return true;
    return p.status === serviceStatusFilter;
  });

  if (!hasRole(["SUPER_ADMIN", "FACILITY_ADMIN", "LAB_ADMIN"])) {
    return <AdminPortalLogin onLoginSuccess={fetchAdminData} />;
  }

  return (
    <DashboardLayout allowedRoles={["SUPER_ADMIN", "FACILITY_ADMIN", "LAB_ADMIN"]}>
      <div className="space-y-6">
      <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Faculty Administration Hub</h1>
          <p className="text-sm text-muted-foreground">
            Approve hall bookings, verify equipment checkouts, and process 3D printing slicing quotes
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant="destructive" className="w-fit gap-1 text-xs py-1 px-2.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            {user?.role.replace("_", " ")}
          </Badge>
          <Link href="/dashboard/admin">
            <Button variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Overview Analytics
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex border-b space-x-4">
        <button
          className={`flex items-center gap-2 pb-2.5 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "halls"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("halls")}
        >
          <CalendarDays className="h-4 w-4" />
          <span>Pending Hall Bookings ({bookings.filter((b) => b.status === "PENDING").length})</span>
        </button>

        <button
          className={`flex items-center gap-2 pb-2.5 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "equipment"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("equipment")}
        >
          <Wrench className="h-4 w-4" />
          <span>Equipment Loaning Desk ({borrows.length})</span>
        </button>

        <button
          className={`flex items-center gap-2 pb-2.5 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "prints"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("prints")}
        >
          <Printer className="h-4 w-4" />
          <span>Lab Services & 3D Prints ({prints.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading admin records...</div>
      ) : (
        <div>
          {/* Hall Bookings Desk */}
          {activeTab === "halls" && (
            <div className="space-y-3">
              {bookings.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-xs text-muted-foreground">
                    No facility bookings requiring action.
                  </CardContent>
                </Card>
              ) : (
                bookings.map((b) => (
                  <Card key={b.id} className="p-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{b.title}</span>
                          <Badge variant={b.status === "APPROVED" ? "success" : b.status === "REJECTED" ? "destructive" : "warning"}>
                            {b.status}
                          </Badge>
                          {b.is_maintenance_block && (
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-1.5 py-0.5 rounded">
                              Maintenance
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Facility: <span className="font-semibold text-foreground">{b.facility?.name}</span> ({b.facility?.building}) • Attendees: <span className="font-medium text-foreground">{b.attendee_count}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Requester: <span className="font-medium text-foreground">{b.user?.full_name}</span> ({b.user?.email})
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          Slot: {formatDateTime(b.start_time)} - {formatDateTime(b.end_time)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <strong>Purpose:</strong> {b.purpose}
                        </p>
                        {b.event_description && (
                          <p className="text-[11px] text-muted-foreground italic">
                            &quot;{b.event_description}&quot;
                          </p>
                        )}
                        {b.document_url && (
                          <div className="pt-1">
                            <a
                              href={b.document_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                            >
                              <Paperclip className="h-3 w-3" />
                              <span>Attached Document: {b.document_name || "Approval Letter"}</span>
                            </a>
                          </div>
                        )}
                        {b.rejection_reason && (
                          <p className="text-xs text-destructive mt-1">
                            <strong>Rejection Note:</strong> {b.rejection_reason}
                          </p>
                        )}
                      </div>

                      {b.status === "PENDING" && (
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10 text-xs gap-1 h-8"
                            onClick={() => handleBookingAction(b.id, "REJECTED")}
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="usj"
                            className="text-xs gap-1 h-8 font-semibold"
                            onClick={() => handleBookingAction(b.id, "APPROVED")}
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Equipment Check-out Desk */}
          {activeTab === "equipment" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 bg-muted/30 p-3 rounded-lg border">
                <span className="text-xs font-semibold text-muted-foreground">Filter by Loan Status:</span>
                <select
                  value={borrowStatusFilter}
                  onChange={(e) => setBorrowStatusFilter(e.target.value)}
                  className="text-xs rounded border bg-background px-2.5 py-1"
                >
                  <option value="ALL">All Borrow Statuses ({borrows.length})</option>
                  <option value="PENDING">PENDING ({borrows.filter((b) => b.status === "PENDING").length})</option>
                  <option value="APPROVED">APPROVED ({borrows.filter((b) => b.status === "APPROVED").length})</option>
                  <option value="IN_PROGRESS">IN_PROGRESS / ISSUED ({borrows.filter((b) => b.status === "IN_PROGRESS" || b.status === "ISSUED").length})</option>
                  <option value="COMPLETED">COMPLETED / RETURNED ({borrows.filter((b) => b.status === "COMPLETED" || b.status === "RETURNED").length})</option>
                  <option value="REJECTED">REJECTED ({borrows.filter((b) => b.status === "REJECTED").length})</option>
                  <option value="CANCELLED">CANCELLED ({borrows.filter((b) => b.status === "CANCELLED").length})</option>
                </select>
              </div>

              {filteredBorrows.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-xs text-muted-foreground">
                    No equipment borrow requests found for this filter.
                  </CardContent>
                </Card>
              ) : (
                filteredBorrows.map((eq) => (
                  <Card key={eq.id} className="p-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">{eq.equipment?.name}</span>
                          <Badge
                            variant={
                              eq.status === "COMPLETED" || eq.status === "RETURNED"
                                ? "success"
                                : eq.status === "APPROVED" || eq.status === "IN_PROGRESS" || eq.status === "ISSUED"
                                ? "info"
                                : eq.status === "PENDING"
                                ? "warning"
                                : "destructive"
                            }
                          >
                            {eq.status}
                          </Badge>
                          {eq.student_confirmed_return && eq.status !== "COMPLETED" && eq.status !== "RETURNED" && (
                            <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950 border-emerald-500/30 text-[10px]">
                              Student Logged Physical Return Handover
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Borrower: <strong className="text-foreground">{eq.borrower?.full_name}</strong> ({eq.borrower?.email}) • Quantity: <strong className="text-foreground">{eq.quantity} unit(s)</strong>
                        </p>

                        <p className="text-xs text-muted-foreground font-mono">
                          Period: {formatDateTime(eq.expected_borrow_date)} - {formatDateTime(eq.expected_return_date)}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          <strong>Purpose:</strong> {eq.purpose}
                        </p>

                        {/* Collection Instructions */}
                        {eq.collection_instructions && (
                          <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 p-2 text-xs text-emerald-800 dark:text-emerald-300">
                            <strong>Collection Instructions Given:</strong> {eq.collection_instructions}
                          </div>
                        )}

                        {/* Rejection Note */}
                        {eq.rejection_reason && (
                          <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                            <strong>Rejection Note:</strong> {eq.rejection_reason}
                          </div>
                        )}

                        {/* Damage inspection flag */}
                        {eq.is_damaged_or_missing && (
                          <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-2 text-xs text-amber-700 dark:text-amber-400">
                            <strong>Damage / Missing Flag Recorded:</strong> {eq.damage_notes || "Inspected upon check-in."}
                          </div>
                        )}

                        {/* Return notes */}
                        {eq.condition_on_return && !eq.is_damaged_or_missing && (
                          <p className="text-[11px] text-muted-foreground">
                            <strong>Check-in Condition:</strong> {eq.condition_on_return}
                          </p>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-end gap-2 shrink-0">
                        {eq.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              variant="usj"
                              className="text-xs gap-1 h-8 font-semibold"
                              onClick={() => setApproveBorrowItem(eq)}
                            >
                              <Check className="h-3.5 w-3.5" /> Approve & Give Instructions
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10 text-xs gap-1 h-8"
                              onClick={() => handleRejectBorrow(eq.id)}
                            >
                              <X className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </>
                        )}

                        {eq.status === "APPROVED" && (
                          <>
                            <Button
                              size="sm"
                              variant="usj"
                              className="text-xs gap-1 h-8 font-semibold"
                              onClick={() => handleIssueEquipment(eq.id)}
                            >
                              <Package className="h-3.5 w-3.5" /> Handover & Issue Unit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10 text-xs gap-1 h-8"
                              onClick={() => handleRejectBorrow(eq.id)}
                            >
                              <X className="h-3.5 w-3.5" /> Revoke Approval
                            </Button>
                          </>
                        )}

                        {(eq.status === "IN_PROGRESS" || eq.status === "ISSUED") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 border-emerald-500/30 text-xs gap-1 h-8 font-semibold"
                            onClick={() => {
                              setReturnBorrowItem(eq);
                              setIsDamagedOrMissing(false);
                              setDamageNotes("");
                            }}
                          >
                            <UserCheck className="h-3.5 w-3.5" /> Check-In & Inspect
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Lab Services & 3D Print Queue */}
          {activeTab === "prints" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 bg-muted/30 p-3 rounded-lg border">
                <span className="text-xs font-semibold text-muted-foreground">Filter by Job Status:</span>
                <select
                  value={serviceStatusFilter}
                  onChange={(e) => setServiceStatusFilter(e.target.value)}
                  className="text-xs rounded border bg-background px-2.5 py-1"
                >
                  <option value="ALL">All Service Statuses ({prints.length})</option>
                  <option value="PENDING">PENDING / SUBMITTED ({prints.filter((p) => p.status === "PENDING" || p.status === "SUBMITTED").length})</option>
                  <option value="APPROVED">APPROVED ({prints.filter((p) => p.status === "APPROVED").length})</option>
                  <option value="SCHEDULED">SCHEDULED ({prints.filter((p) => p.status === "SCHEDULED").length})</option>
                  <option value="IN_PROGRESS">IN_PROGRESS ({prints.filter((p) => p.status === "IN_PROGRESS").length})</option>
                  <option value="COMPLETED">COMPLETED ({prints.filter((p) => p.status === "COMPLETED").length})</option>
                  <option value="REJECTED">REJECTED ({prints.filter((p) => p.status === "REJECTED").length})</option>
                  <option value="CANCELLED">CANCELLED ({prints.filter((p) => p.status === "CANCELLED").length})</option>
                </select>
              </div>

              {filteredServices.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-xs text-muted-foreground">
                    No laboratory service requests found for this filter.
                  </CardContent>
                </Card>
              ) : (
                filteredServices.map((p) => (
                  <Card key={p.id} className="p-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">{p.project_title}</span>
                          <Badge
                            variant={
                              p.status === "COMPLETED"
                                ? "success"
                                : p.status === "IN_PROGRESS" || p.status === "SCHEDULED" || p.status === "APPROVED"
                                ? "info"
                                : p.status === "PENDING" || p.status === "SUBMITTED"
                                ? "warning"
                                : "destructive"
                            }
                          >
                            {p.status}
                          </Badge>
                          {p.service?.service_name && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium text-foreground">
                              {p.service.service_name}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Requester: <strong className="text-foreground">{p.requester?.full_name}</strong> ({p.requester?.email})
                          {p.supervisor_name && <span> • Supervisor: {p.supervisor_name}</span>}
                          {p.requested_quantity && <span> • Units: {p.requested_quantity}</span>}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          <strong>Description:</strong> {p.description}
                        </p>

                        {/* Dimensions & Schedule */}
                        {p.dimensions && (
                          <p className="text-xs text-muted-foreground">
                            <strong>Specs / Dimensions:</strong> {p.dimensions}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          {p.preferred_date && (
                            <span className="text-muted-foreground">
                              Preferred Date: <strong className="text-foreground">{p.preferred_date.slice(0, 10)}</strong>
                            </span>
                          )}
                          {p.scheduled_date && (
                            <span className="text-blue-700 dark:text-blue-400 font-semibold">
                              Scheduled Appointment: {formatDateTime(p.scheduled_date)}
                            </span>
                          )}
                          {p.estimated_completion_date && (
                            <span className="text-amber-700 dark:text-amber-400 font-semibold">
                              Est. Completion: {formatDateTime(p.estimated_completion_date)}
                            </span>
                          )}
                        </div>

                        {/* 3D Print Parameters */}
                        {p.print_3d_detail && (
                          <p className="text-xs text-muted-foreground">
                            Material: <strong>{p.print_3d_detail.material_type}</strong> • Color: {p.print_3d_detail.color} • Infill: {p.print_3d_detail.infill_percentage}%
                          </p>
                        )}

                        {/* Charges */}
                        {(p.recorded_charges_lkr !== null && p.recorded_charges_lkr !== undefined) ? (
                          <div className="inline-block rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                            Recorded Charges: LKR {Number(p.recorded_charges_lkr).toFixed(2)}
                          </div>
                        ) : p.print_3d_detail?.calculated_cost_lkr ? (
                          <div className="inline-block rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                            Quote: LKR {Number(p.print_3d_detail.calculated_cost_lkr).toFixed(2)} ({p.print_3d_detail.estimated_filament_grams}g • {p.print_3d_detail.estimated_print_hours} hrs)
                          </div>
                        ) : null}

                        {/* Attachment Link */}
                        {(p.attachment_url || p.print_3d_detail?.file_url) && (
                          <div className="pt-1">
                            <a
                              href={p.attachment_url || p.print_3d_detail?.file_url || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              <span>Attached: {p.attachment_name || p.print_3d_detail?.original_filename || "Download File"}</span>
                            </a>
                          </div>
                        )}

                        {/* Admin Notes */}
                        {p.admin_notes && (
                          <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                            <strong>Technician Notes:</strong> {p.admin_notes}
                          </div>
                        )}

                        {/* Rejection Note */}
                        {p.rejection_reason && (
                          <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                            <strong>Rejection Note:</strong> {p.rejection_reason}
                          </div>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-end gap-2 shrink-0">
                        {(p.status === "PENDING" || p.status === "SUBMITTED") && (
                          <>
                            {p.print_3d_detail && (
                              <Button
                                size="sm"
                                variant="usj"
                                className="text-xs gap-1 h-8 font-semibold"
                                onClick={() => setEstimateJob(p)}
                              >
                                <Printer className="h-3.5 w-3.5" /> Slice & Set Quote
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="usj"
                              className="text-xs gap-1 h-8 font-semibold"
                              onClick={() => {
                                setScheduleServiceItem(p);
                                setScheduledDate(p.preferred_date ? p.preferred_date.slice(0, 16) : "");
                              }}
                            >
                              <Clock className="h-3.5 w-3.5" /> Schedule Appointment
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10 text-xs gap-1 h-8"
                              onClick={() => handleRejectService(p.id)}
                            >
                              <X className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </>
                        )}

                        {(p.status === "APPROVED" || p.status === "SCHEDULED") && (
                          <>
                            <Button
                              size="sm"
                              variant="usj"
                              className="text-xs gap-1 h-8 font-semibold"
                              onClick={() => handleStartServiceProgress(p.id)}
                            >
                              <Wrench className="h-3.5 w-3.5" /> Start Progress
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs gap-1 h-8"
                              onClick={() => setScheduleServiceItem(p)}
                            >
                              <Clock className="h-3.5 w-3.5" /> Reschedule
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 border-emerald-500/30 text-xs gap-1 h-8 font-semibold"
                              onClick={() => {
                                setCompleteServiceItem(p);
                                setRecordedChargesLkr(p.recorded_charges_lkr || p.print_3d_detail?.calculated_cost_lkr || 0);
                              }}
                            >
                              <Check className="h-3.5 w-3.5" /> Mark Completed & Bill
                            </Button>
                          </>
                        )}

                        {p.status === "IN_PROGRESS" && (
                          <Button
                            size="sm"
                            variant="usj"
                            className="text-xs gap-1 h-8 font-semibold shadow-xs"
                            onClick={() => {
                              setCompleteServiceItem(p);
                              setRecordedChargesLkr(p.recorded_charges_lkr || p.print_3d_detail?.calculated_cost_lkr || 0);
                            }}
                          >
                            <Check className="h-3.5 w-3.5" /> Complete & Record Charges
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Approve Borrow Modal */}
      {approveBorrowItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Approve Borrowing Request</CardTitle>
                  <CardDescription className="text-xs">
                    {approveBorrowItem.equipment?.name} • Qty: {approveBorrowItem.quantity}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setApproveBorrowItem(null)} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleApproveBorrowSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Collection Instructions for Student *</label>
                  <Textarea
                    value={collectionInstructions}
                    onChange={(e) => setCollectionInstructions(e.target.value)}
                    placeholder="Specify the lab counter, technician in charge, and pickup hours..."
                    required
                    rows={3}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Approving this request will reserve {approveBorrowItem.quantity} unit(s) from available stock and notify {approveBorrowItem.borrower?.full_name}.
                </p>
                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setApproveBorrowItem(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="usj" size="sm">
                    Confirm Approval
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Check-In / Return Equipment Modal */}
      {returnBorrowItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Equipment Return Check-In</CardTitle>
                  <CardDescription className="text-xs">
                    {returnBorrowItem.equipment?.name} (Qty: {returnBorrowItem.quantity}) • Borrower: {returnBorrowItem.borrower?.full_name}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setReturnBorrowItem(null)} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReturnBorrowSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Return Condition Notes</label>
                  <Input
                    type="text"
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value)}
                    required
                  />
                </div>

                <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={isDamagedOrMissing}
                      onChange={(e) => setIsDamagedOrMissing(e.target.checked)}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span>Equipment damaged or parts missing</span>
                  </label>

                  {isDamagedOrMissing && (
                    <div className="space-y-1 pt-1">
                      <label className="text-[11px] font-semibold text-destructive">Damage / Missing Details *</label>
                      <Textarea
                        value={damageNotes}
                        onChange={(e) => setDamageNotes(e.target.value)}
                        placeholder="Detail the damages, missing probes/cables, or required technician repair..."
                        required={isDamagedOrMissing}
                        rows={2}
                      />
                      <span className="text-[10px] text-destructive block">
                        Marking as damaged will hold back {returnBorrowItem.quantity} unit(s) from available inventory until repaired.
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setReturnBorrowItem(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="usj" size="sm">
                    Finalize Return Check-In
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Schedule Service Modal */}
      {scheduleServiceItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Schedule Service Appointment</CardTitle>
                  <CardDescription className="text-xs truncate max-w-[340px]">
                    {scheduleServiceItem.project_title}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setScheduleServiceItem(null)} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleScheduleServiceSubmit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Appointment Date/Time</label>
                    <Input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Est. Completion</label>
                    <Input
                      type="datetime-local"
                      value={estimatedCompletionDate}
                      onChange={(e) => setEstimatedCompletionDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Technician Schedule Notes</label>
                  <Textarea
                    value={scheduleNotes}
                    onChange={(e) => setScheduleNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setScheduleServiceItem(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="usj" size="sm">
                    Save Schedule & Notify
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Complete Service & Bill Modal */}
      {completeServiceItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Complete Job & Record Charges</CardTitle>
                  <CardDescription className="text-xs truncate max-w-[340px]">
                    {completeServiceItem.project_title}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setCompleteServiceItem(null)} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCompleteServiceSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Material / Service Charges (LKR)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={recordedChargesLkr}
                    onChange={(e) => setRecordedChargesLkr(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Completion / Pickup Instructions</label>
                  <Textarea
                    value={completeNotes}
                    onChange={(e) => setCompleteNotes(e.target.value)}
                    rows={2}
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setCompleteServiceItem(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="usj" size="sm">
                    Mark Completed
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Slicing Estimate Modal */}
      {estimateJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Input Slicing Estimate</CardTitle>
                  <CardDescription className="text-xs">
                    {estimateJob.project_title} ({estimateJob.print_3d_detail?.material_type})
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEstimateJob(null)} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveEstimate} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Filament Weight (Grams)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={grams}
                      onChange={(e) => setGrams(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Print Duration (Hours)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={hours}
                      onChange={(e) => setHours(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Calculated Cost (LKR)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={costLkr}
                    onChange={(e) => setCostLkr(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Slicing Notes</label>
                  <Textarea
                    value={sliceNotes}
                    onChange={(e) => setSliceNotes(e.target.value)}
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEstimateJob(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="usj" size="sm">
                    Submit Quote to Student
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
