"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Lock,
  Mail,
  MapPin,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils";
import { resourceService } from "@/services/resource.service";
import { Facility, User, UserRole } from "@/types";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const userRole = user?.role || "SUPER_ADMIN";

  // Tab State
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Metrics Query
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ["admin-metrics", userRole],
    queryFn: () => resourceService.getAdminMetrics(),
  });

  // Reporting State
  const [reportDatePreset, setReportDatePreset] = useState<"7d" | "30d" | "90d" | "custom">("30d");
  const [reportStartDate, setReportStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [reportEndDate, setReportEndDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [reportsData, setReportsData] = useState<any>(null);
  const [reportsLoading, setReportsLoading] = useState<boolean>(false);

  // User Management State (Super Admin)
  const [usersList, setUsersList] = useState<User[]>([]);
  const [pendingLecturers, setPendingLecturers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState<string>("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("ALL");
  const [usersLoading, setUsersLoading] = useState<boolean>(false);

  // Admin Account Creation Modal State (Super Admin)
  const [createAdminModal, setCreateAdminModal] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [adminFullName, setAdminFullName] = useState<string>("");
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [adminRole, setAdminRole] = useState<string>("FACILITY_ADMIN");
  const [adminCreating, setAdminCreating] = useState<boolean>(false);

  // Maintenance Schedule Modal State (Facility Admin)
  const [maintenanceModal, setMaintenanceModal] = useState<boolean>(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [maintFacilityId, setMaintFacilityId] = useState<string>("");
  const [maintStartTime, setMaintStartTime] = useState<string>("");
  const [maintEndTime, setMaintEndTime] = useState<string>("");
  const [maintReason, setMaintReason] = useState<string>("Scheduled Electrical / HVAC Maintenance");
  const [maintSubmitting, setMaintSubmitting] = useState<boolean>(false);

  // Reminder Dispatch State (Lab Admin)
  const [reminderDispatching, setReminderDispatching] = useState<boolean>(false);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);

  // Load secondary data on tab switch or mount
  useEffect(() => {
    if (activeTab === "reports") {
      fetchReports();
    } else if (activeTab === "users" && userRole === "SUPER_ADMIN") {
      fetchUsers();
    } else if (activeTab === "lecturers" && userRole === "SUPER_ADMIN") {
      fetchPendingLecturers();
    } else if (activeTab === "maintenance" && (userRole === "FACILITY_ADMIN" || userRole === "SUPER_ADMIN")) {
      fetchFacilities();
    }
  }, [activeTab, userRole]);

  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const data = await resourceService.getAdminReports(reportStartDate, reportEndDate);
      setReportsData(data);
    } catch {
      // Ignore
    } finally {
      setReportsLoading(false);
    }
  };

  const handleDatePresetChange = (preset: "7d" | "30d" | "90d" | "custom") => {
    setReportDatePreset(preset);
    const now = new Date();
    const endStr = now.toISOString().slice(0, 10);
    setReportEndDate(endStr);

    let days = 30;
    if (preset === "7d") days = 7;
    if (preset === "90d") days = 90;

    if (preset !== "custom") {
      const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      setReportStartDate(start.toISOString().slice(0, 10));
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const roleQuery = userRoleFilter !== "ALL" ? userRoleFilter : undefined;
      const data = await resourceService.getAdminUsers(roleQuery, userSearch.trim() || undefined);
      setUsersList(data);
    } catch {
      // Ignore
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchPendingLecturers = async () => {
    try {
      const data = await resourceService.getPendingLecturers();
      setPendingLecturers(data);
    } catch {
      // Ignore
    }
  };

  const fetchFacilities = async () => {
    try {
      const data = await resourceService.getFacilities();
      setFacilities(data);
      if (data.length > 0 && !maintFacilityId) {
        setMaintFacilityId(data[0].id);
      }
    } catch {
      // Ignore
    }
  };

  const handleVerifyLecturer = async (lecturerId: string, isVerified: boolean) => {
    let rejectionReason: string | undefined = undefined;
    if (!isVerified) {
      const promptRes = prompt("Reason for declining this lecturer account verification:", "Academic credentials not confirmed by Dean's Office");
      if (promptRes === null) return;
      rejectionReason = promptRes.trim();
    }

    try {
      await resourceService.verifyLecturer(lecturerId, isVerified, rejectionReason);
      alert(isVerified ? "Lecturer verified successfully!" : "Lecturer registration declined.");
      fetchPendingLecturers();
      refetchMetrics();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Action failed.");
    }
  };

  const handleToggleUserStatus = async (userId: string, currentActive: boolean) => {
    const action = currentActive ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${action} this user account?`)) return;

    try {
      await resourceService.toggleUserStatus(userId, !currentActive);
      fetchUsers();
      refetchMetrics();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Could not toggle user status.");
    }
  };

  const handleCreateAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminCreating(true);
    try {
      await resourceService.createAdminAccount({
        email: adminEmail.trim(),
        full_name: adminFullName.trim(),
        password: adminPassword,
        role: adminRole,
      });
      alert(`Admin account created successfully for ${adminFullName}!`);
      setCreateAdminModal(false);
      setAdminEmail("");
      setAdminFullName("");
      setAdminPassword("");
      refetchMetrics();
      if (activeTab === "users") fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || err.response?.data?.error?.message || "Failed to create administrator account.");
    } finally {
      setAdminCreating(false);
    }
  };

  const handleScheduleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintFacilityId || !maintStartTime || !maintEndTime) return;
    setMaintSubmitting(true);
    try {
      await resourceService.blockFacilityMaintenance(maintFacilityId, {
        reason: maintReason.trim(),
        start_time: new Date(maintStartTime).toISOString(),
        end_time: new Date(maintEndTime).toISOString(),
      });
      alert("Maintenance block successfully scheduled! Time slot has been reserved.");
      setMaintenanceModal(false);
      refetchMetrics();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.response?.data?.detail || "Could not schedule maintenance block.");
    } finally {
      setMaintSubmitting(false);
    }
  };

  const handleSendReturnReminders = async () => {
    setReminderDispatching(true);
    setReminderMessage(null);
    try {
      const res = await resourceService.sendEquipmentReturnReminders();
      setReminderMessage(res.message);
      refetchMetrics();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to dispatch reminders.");
    } finally {
      setReminderDispatching(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={["SUPER_ADMIN", "FACILITY_ADMIN", "LAB_ADMIN"]}>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="rounded-card border bg-card surface-hero p-6 sm:p-8 shadow-elevation-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white p-1 shadow-elevation-sm ring-1 ring-border">
              <img
                src="/logo.jpg"
                alt="University Emblem"
                className="h-full w-full object-cover rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  {userRole === "SUPER_ADMIN"
                    ? "Super Admin Dashboard"
                    : userRole === "FACILITY_ADMIN"
                    ? "Facility Admin Dashboard"
                    : "Lab Admin Dashboard"}
                </h2>
                <Badge variant="gold" className="text-[10px] px-1.5 py-0">
                  {userRole.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Faculty Resource Management Operations · Faculty of Engineering, USJ
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/admin">
              <Button size="sm" variant="usj" className="font-semibold text-xs shadow-elevation-sm">
                Operations Hub
              </Button>
            </Link>
            {userRole === "SUPER_ADMIN" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreateAdminModal(true)}
                className="text-xs gap-1"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Create Admin</span>
              </Button>
            )}
            {userRole === "FACILITY_ADMIN" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMaintenanceModal(true)}
                className="text-xs gap-1"
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>Schedule Maintenance</span>
              </Button>
            )}
            {userRole === "LAB_ADMIN" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSendReturnReminders}
                disabled={reminderDispatching}
                className="text-xs gap-1"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{reminderDispatching ? "Sending..." : "Dispatch Reminders"}</span>
              </Button>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* KPI CARDS: ROLE-TAILORED                                      */}
        {/* ------------------------------------------------------------- */}
        {userRole === "SUPER_ADMIN" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <Card className="border-l-4 border-l-blue-600">
              <CardContent className="p-3.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Students</p>
                <p className="text-xl font-extrabold text-foreground mt-0.5">
                  {metricsLoading ? "..." : metrics?.super_admin?.total_students || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-600">
              <CardContent className="p-3.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Lecturers</p>
                <p className="text-xl font-extrabold text-foreground mt-0.5">
                  {metricsLoading ? "..." : metrics?.super_admin?.total_lecturers || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-600">
              <CardContent className="p-3.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Admins</p>
                <p className="text-xl font-extrabold text-foreground mt-0.5">
                  {metricsLoading ? "..." : metrics?.super_admin?.total_administrators || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-3.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Lecture Halls</p>
                <p className="text-xl font-extrabold text-foreground mt-0.5">
                  {metricsLoading ? "..." : metrics?.super_admin?.total_lecture_halls || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-600">
              <CardContent className="p-3.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Lab Services</p>
                <p className="text-xl font-extrabold text-foreground mt-0.5">
                  {metricsLoading ? "..." : metrics?.super_admin?.total_laboratory_services || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-600">
              <CardContent className="p-3.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Bookings</p>
                <p className="text-xl font-extrabold text-foreground mt-0.5">
                  {metricsLoading ? "..." : metrics?.super_admin?.total_booking_requests || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-rose-600 bg-rose-50/30 dark:bg-rose-950/20">
              <CardContent className="p-3.5">
                <p className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase">Pending Review</p>
                <p className="text-xl font-extrabold text-rose-700 dark:text-rose-400 mt-0.5">
                  {metricsLoading ? "..." : metrics?.super_admin?.pending_requests?.total || 0}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {userRole === "FACILITY_ADMIN" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <p className="text-xs font-bold text-muted-foreground uppercase">Total Halls</p>
                <p className="text-2xl font-bold mt-1">
                  {metricsLoading ? "..." : metrics?.facilities?.total_halls || 0}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {metrics?.facilities?.operational_halls || 0} operational
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-600">
              <CardContent className="p-4">
                <p className="text-xs font-bold text-muted-foreground uppercase">Today's Bookings</p>
                <p className="text-2xl font-bold mt-1 text-blue-600">
                  {metricsLoading ? "..." : metrics?.facilities?.today_bookings || 0}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">Active time slots</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-600">
              <CardContent className="p-4">
                <p className="text-xs font-bold text-muted-foreground uppercase">Pending Requests</p>
                <p className="text-2xl font-bold mt-1 text-amber-600">
                  {metricsLoading ? "..." : metrics?.facilities?.pending_booking_requests || 0}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">Awaiting decision</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-600">
              <CardContent className="p-4">
                <p className="text-xs font-bold text-muted-foreground uppercase">Approved Bookings</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">
                  {metricsLoading ? "..." : metrics?.facilities?.approved_bookings || 0}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">Reserved schedules</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-600 bg-purple-50/20 dark:bg-purple-950/20">
              <CardContent className="p-4">
                <p className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase">Hall Utilization</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-extrabold text-purple-700 dark:text-purple-400">
                    {metricsLoading ? "..." : metrics?.facilities?.hall_utilization_rate || 0}%
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">today</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-purple-600 h-1.5 rounded-full"
                    style={{ width: `${metrics?.facilities?.hall_utilization_rate || 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-slate-600">
              <CardContent className="p-4">
                <p className="text-xs font-bold text-muted-foreground uppercase">Maintenance</p>
                <p className="text-2xl font-bold mt-1 text-foreground">
                  {metricsLoading ? "..." : metrics?.facilities?.maintenance_schedules_count || 0}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">Blocks scheduled</p>
              </CardContent>
            </Card>
          </div>
        )}

        {userRole === "LAB_ADMIN" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <Card className="border-l-4 border-l-blue-600">
              <CardContent className="p-3.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Laboratories</p>
                <p className="text-xl font-extrabold text-foreground mt-0.5">
                  {metricsLoading ? "..." : metrics?.laboratory?.total_laboratories || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-600">
              <CardContent className="p-3.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Equipment Items</p>
                <p className="text-xl font-extrabold text-foreground mt-0.5">
                  {metricsLoading ? "..." : metrics?.laboratory?.total_equipment || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-600">
              <CardContent className="p-3.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Available Stock</p>
                <p className="text-xl font-extrabold text-emerald-600 mt-0.5">
                  {metricsLoading ? "..." : metrics?.laboratory?.available_inventory || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-600">
              <CardContent className="p-3.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Pending Borrows</p>
                <p className="text-xl font-extrabold text-amber-600 mt-0.5">
                  {metricsLoading ? "..." : metrics?.laboratory?.pending_borrowing_requests || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-teal-600">
              <CardContent className="p-3.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Pending Services</p>
                <p className="text-xl font-extrabold text-teal-600 mt-0.5">
                  {metricsLoading ? "..." : metrics?.laboratory?.pending_laboratory_service_requests || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-600">
              <CardContent className="p-3.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Currently Loaned</p>
                <p className="text-xl font-extrabold text-purple-600 mt-0.5">
                  {metricsLoading ? "..." : metrics?.laboratory?.currently_borrowed_equipment || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-destructive bg-rose-50/30 dark:bg-rose-950/20">
              <CardContent className="p-3.5">
                <p className="text-[10px] font-bold text-destructive uppercase">Overdue Items</p>
                <p className="text-xl font-extrabold text-destructive mt-0.5">
                  {metricsLoading ? "..." : metrics?.laboratory?.overdue_equipment_count || 0}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reminder notification toast */}
        {reminderMessage && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-500/30 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{reminderMessage}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TABS HEADER                                                   */}
        {/* ------------------------------------------------------------- */}
        <div className="flex border-b space-x-2 sm:space-x-4 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 pb-2.5 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Compass className="h-4 w-4" />
            <span>Overview & Activity</span>
          </button>

          {userRole === "SUPER_ADMIN" && (
            <>
              <button
                onClick={() => setActiveTab("lecturers")}
                className={`flex items-center gap-1.5 pb-2.5 transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === "lecturers"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                <span>Lecturer Verification ({metrics?.super_admin?.pending_requests?.lecturer_verifications || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab("users")}
                className={`flex items-center gap-1.5 pb-2.5 transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === "users"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="h-4 w-4" />
                <span>User Governance</span>
              </button>
            </>
          )}

          {userRole === "FACILITY_ADMIN" && (
            <button
              onClick={() => setActiveTab("maintenance")}
              className={`flex items-center gap-1.5 pb-2.5 transition-colors border-b-2 whitespace-nowrap ${
                activeTab === "maintenance"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Wrench className="h-4 w-4" />
              <span>Maintenance Schedules</span>
            </button>
          )}

          {userRole === "LAB_ADMIN" && (
            <button
              onClick={() => setActiveTab("overdue")}
              className={`flex items-center gap-1.5 pb-2.5 transition-colors border-b-2 whitespace-nowrap ${
                activeTab === "overdue"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>Overdue Equipment Tracker ({metrics?.laboratory?.overdue_equipment_count || 0})</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab("reports")}
            className={`flex items-center gap-1.5 pb-2.5 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "reports"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Faculty Reports & Analytics</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: OVERVIEW & SYSTEM ACTIVITY STREAM                      */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Super Admin: Pending requests breakdown cards & stream */}
            {userRole === "SUPER_ADMIN" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 shadow-xs">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Pending Requests Breakdown
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Items requiring action across all engineering facilities
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border">
                      <span className="font-medium text-foreground">Lecture Hall Bookings</span>
                      <Badge variant="warning">{metrics?.super_admin?.pending_requests?.bookings || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border">
                      <span className="font-medium text-foreground">Equipment Borrow Petitions</span>
                      <Badge variant="warning">{metrics?.super_admin?.pending_requests?.borrows || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border">
                      <span className="font-medium text-foreground">Lab Service Requests</span>
                      <Badge variant="warning">{metrics?.super_admin?.pending_requests?.services || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border">
                      <span className="font-medium text-foreground">Lecturer Account Verifications</span>
                      <Badge variant="destructive">{metrics?.super_admin?.pending_requests?.lecturer_verifications || 0}</Badge>
                    </div>

                    <Link href="/admin">
                      <Button variant="usj" size="sm" className="w-full mt-2 text-xs">
                        Open Operations Review Queue
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2 shadow-xs">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                        System Activity Overview
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Real-time audit log of faculty registrations, bookings, and loans
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => refetchMetrics()} className="h-8 gap-1 text-xs">
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Refresh</span>
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y max-h-96 overflow-y-auto text-xs">
                      {(!metrics?.system_activity_overview || metrics.system_activity_overview.length === 0) ? (
                        <div className="p-8 text-center text-muted-foreground">No recent activity logged.</div>
                      ) : (
                        metrics.system_activity_overview.map((act: any) => (
                          <div key={act.id} className="p-3.5 flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">{act.title}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {act.activity_type.replace("_", " ")}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{act.description}</p>
                              <p className="text-[10px] text-muted-foreground/75 font-mono">
                                By {act.actor_name} • {formatDateTime(act.timestamp)}
                              </p>
                            </div>
                            <Badge
                              variant={
                                act.status === "APPROVED" || act.status === "COMPLETED" || act.status === "ACTIVE"
                                  ? "success"
                                  : act.status === "PENDING" || act.status === "PENDING_VERIFICATION"
                                  ? "warning"
                                  : "destructive"
                              }
                            >
                              {act.status}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Facility Admin Overview: Today's Schedule Timeline */}
            {userRole === "FACILITY_ADMIN" && (
              <Card className="shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      Today's Lecture Hall Bookings and Schedules
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Live occupancy timeline for academic lecture complexes
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setMaintenanceModal(true)} className="text-xs gap-1">
                    <Wrench className="h-3.5 w-3.5" /> Block Maintenance
                  </Button>
                </CardHeader>
                <CardContent>
                  {(!metrics?.today_schedule || metrics.today_schedule.length === 0) ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      No facility bookings scheduled for today.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {metrics.today_schedule.map((slot: any) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card text-xs hover:bg-muted/30"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{slot.title}</span>
                              <Badge variant={slot.is_maintenance ? "destructive" : "info"}>
                                {slot.is_maintenance ? "MAINTENANCE" : slot.status}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground">
                              Facility: <strong>{slot.facility_name}</strong> • Booked by: {slot.user_name}
                              {slot.attendee_count > 0 && ` (${slot.attendee_count} attendees)`}
                            </p>
                          </div>
                          <div className="text-right font-mono text-[11px] text-muted-foreground">
                            <span>{slot.start_time.slice(11, 16)} - {slot.end_time.slice(11, 16)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Lab Admin Overview: Action cards & quick jumps */}
            {userRole === "LAB_ADMIN" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-xs">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Package className="h-4 w-4 text-emerald-600" />
                      Active Precision Equipment Circulation
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Summary of hardware currently checked out across student projects
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                      <span>Available Inventory Units in Storage:</span>
                      <span className="font-bold text-emerald-600 text-sm">
                        {metrics?.laboratory?.available_inventory || 0} units
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                      <span>Currently Issued:</span>
                      <span className="font-bold text-foreground text-sm">
                        {metrics?.laboratory?.currently_borrowed_equipment || 0} units
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                      <span>Pending Borrow Requests:</span>
                      <Badge variant="warning">{metrics?.laboratory?.pending_borrowing_requests || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                      <span>Overdue Return Alerts:</span>
                      <Badge variant="destructive">{metrics?.laboratory?.overdue_equipment_count || 0}</Badge>
                    </div>

                    <Link href="/admin">
                      <Button variant="usj" size="sm" className="w-full mt-2 text-xs">
                        Open Equipment Loaning Desk
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="shadow-xs">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Printer className="h-4 w-4 text-blue-600" />
                      FabLab Rapid Prototyping Queue
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Status of 3D printing and precision lab service requests
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                      <span>New Service Jobs Awaiting Review:</span>
                      <Badge variant="warning">{metrics?.laboratory?.pending_laboratory_service_requests || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                      <span>Active Facilities and Labs:</span>
                      <span className="font-bold text-foreground text-sm">
                        {metrics?.laboratory?.total_laboratories || 0} Labs
                      </span>
                    </div>

                    <Link href="/services">
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        Manage Directory Offerings
                      </Button>
                    </Link>
                    <Link href="/admin">
                      <Button variant="usj" size="sm" className="w-full text-xs">
                        Process Slicing and Appointments
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: LECTURER VERIFICATION (SUPER ADMIN ONLY)               */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "lecturers" && userRole === "SUPER_ADMIN" && (
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Lecturer Account Verification Queue
              </CardTitle>
              <CardDescription className="text-xs">
                Super Admin authorization required before academic staff can accept student consultation bookings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingLecturers.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                  <p className="font-semibold text-foreground text-sm">No Pending Lecturer Verifications</p>
                  <p>All academic faculty accounts are verified and authorized.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingLecturers.map((lec) => (
                    <div
                      key={lec.id}
                      className="p-4 rounded-xl border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{lec.full_name}</span>
                          <Badge variant="warning">AWAITING VERIFICATION</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Email: <strong className="text-foreground">{lec.email}</strong> • Department:{" "}
                          <strong>{lec.department?.name || "Faculty of Engineering"}</strong>
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Registered on: {formatDateTime(lec.created_at)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 text-xs gap-1"
                          onClick={() => handleVerifyLecturer(lec.id, false)}
                        >
                          <X className="h-3.5 w-3.5" /> Decline
                        </Button>
                        <Button
                          variant="usj"
                          size="sm"
                          className="text-xs gap-1 font-semibold"
                          onClick={() => handleVerifyLecturer(lec.id, true)}
                        >
                          <Check className="h-3.5 w-3.5" /> Verify Account
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: USER GOVERNANCE (SUPER ADMIN ONLY)                     */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "users" && userRole === "SUPER_ADMIN" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/30 p-3 rounded-xl border">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search user by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="text-xs h-8 w-full sm:w-64"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="text-xs rounded border bg-background px-2.5 py-1.5"
                >
                  <option value="ALL">All Roles</option>
                  <option value="STUDENT">Students</option>
                  <option value="LECTURER">Lecturers</option>
                  <option value="FACILITY_ADMIN">Facility Admins</option>
                  <option value="LAB_ADMIN">Lab Admins</option>
                  <option value="SUPER_ADMIN">Super Admins</option>
                </select>

                <Button size="sm" variant="usj" onClick={fetchUsers} className="text-xs h-8 font-semibold">
                  Search
                </Button>
              </div>
            </div>

            <Card className="shadow-xs">
              <CardContent className="p-0">
                <div className="divide-y text-xs">
                  {usersLoading ? (
                    <div className="py-12 text-center text-muted-foreground">Loading accounts...</div>
                  ) : usersList.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">No accounts found matching filter.</div>
                  ) : (
                    usersList.map((u) => (
                      <div key={u.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">{u.full_name}</span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {u.role}
                            </Badge>
                            <Badge variant={u.is_active ? "success" : "destructive"}>
                              {u.is_active ? "ACTIVE" : "DEACTIVATED"}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">
                            {u.email} {u.registration_number && `• Reg: ${u.registration_number}`}
                            {u.department && ` • Dept: ${u.department.name}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            className={`text-xs h-7 font-medium ${
                              u.is_active ? "text-destructive hover:bg-destructive/10" : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                            onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                          >
                            {u.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                            <span>{u.is_active ? "Deactivate" : "Activate"}</span>
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: MAINTENANCE SCHEDULES (FACILITY ADMIN)                 */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "maintenance" && (userRole === "FACILITY_ADMIN" || userRole === "SUPER_ADMIN") && (
          <Card className="shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  Scheduled Facility Maintenance Blocks
                </CardTitle>
                <CardDescription className="text-xs">
                  Blocked periods for deep cleaning, AV maintenance, or electrical tests
                </CardDescription>
              </div>
              <Button variant="usj" size="sm" onClick={() => setMaintenanceModal(true)} className="text-xs gap-1 font-semibold">
                <Plus className="h-3.5 w-3.5" /> Block Hall for Maintenance
              </Button>
            </CardHeader>
            <CardContent>
              {(!metrics?.upcoming_maintenance || metrics.upcoming_maintenance.length === 0) ? (
                <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                  <p className="font-semibold text-foreground text-sm">No Maintenance Blocks Scheduled</p>
                  <p>All faculty lecture halls and auditoriums are operational.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {metrics.upcoming_maintenance.map((m: any) => (
                    <div key={m.id} className="p-3.5 rounded-xl border bg-muted/20 flex items-start justify-between gap-4 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm">{m.facility_name}</span>
                          <Badge variant="destructive">MAINTENANCE BLOCK</Badge>
                        </div>
                        <p className="text-muted-foreground font-medium">Reason: {m.reason}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {formatDateTime(m.start_time)} - {formatDateTime(m.end_time)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: OVERDUE EQUIPMENT TRACKER (LAB ADMIN)                  */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "overdue" && (userRole === "LAB_ADMIN" || userRole === "SUPER_ADMIN") && (
          <Card className="shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Overdue Equipment Return Tracker
                </CardTitle>
                <CardDescription className="text-xs">
                  Active equipment loans past their expected return date
                </CardDescription>
              </div>
              <Button
                variant="usj"
                size="sm"
                onClick={handleSendReturnReminders}
                disabled={reminderDispatching}
                className="text-xs gap-1 font-semibold"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{reminderDispatching ? "Dispatching..." : "Send Return Reminders"}</span>
              </Button>
            </CardHeader>
            <CardContent>
              {(!metrics?.overdue_equipment || metrics.overdue_equipment.length === 0) ? (
                <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                  <p className="font-semibold text-foreground text-sm">No Overdue Equipment</p>
                  <p>All borrowed laboratory instruments have been returned or are within their expected loan period.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {metrics.overdue_equipment.map((item: any) => (
                    <div
                      key={item.borrow_id}
                      className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm">{item.equipment_name}</span>
                          <Badge variant="destructive">{item.days_overdue} Day(s) Overdue</Badge>
                        </div>
                        <p className="text-muted-foreground">
                          Borrower: <strong className="text-foreground">{item.borrower_name}</strong> ({item.borrower_email}) • Qty: <strong>{item.quantity} unit(s)</strong>
                        </p>
                        <p className="text-[11px] text-destructive font-mono">
                          Was Due: {formatDateTime(item.expected_return_date)}
                        </p>
                      </div>

                      <Link href="/admin">
                        <Button variant="outline" size="sm" className="text-xs text-destructive hover:bg-destructive/10">
                          Inspect &amp; Return
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 6: FACULTY REPORTS & ANALYTICS                            */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            {/* Date Range Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-2xl border shadow-xs">
              <div className="space-y-1">
                <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  Reporting Time Window
                </span>
                <p className="text-xs text-muted-foreground">
                  Select predefined period or custom date range
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(["7d", "30d", "90d", "custom"] as const).map((preset) => (
                  <Button
                    key={preset}
                    variant={reportDatePreset === preset ? "usj" : "outline"}
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => handleDatePresetChange(preset)}
                  >
                    {preset === "7d" ? "Last 7 Days" : preset === "30d" ? "Last 30 Days" : preset === "90d" ? "Last 90 Days" : "Custom"}
                  </Button>
                ))}

                {reportDatePreset === "custom" && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="text-xs h-8 w-36"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="text-xs h-8 w-36"
                    />
                  </div>
                )}

                <Button variant="usj" size="sm" onClick={fetchReports} disabled={reportsLoading} className="text-xs h-8 font-semibold">
                  {reportsLoading ? "Loading..." : "Update Report"}
                </Button>
              </div>
            </div>

            {reportsLoading ? (
              <div className="py-16 text-center text-xs text-muted-foreground">Aggregating faculty report metrics...</div>
            ) : !reportsData ? (
              <div className="py-16 text-center text-xs text-muted-foreground">Click Update Report to generate data.</div>
            ) : (
              <div className="space-y-6">
                {/* Executive Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="shadow-xs border-l-4 border-l-primary">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase text-muted-foreground">Bookings Handled</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{reportsData.bookings?.total || 0}</div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {reportsData.bookings?.total_attendees || 0} participants accommodated
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="shadow-xs border-l-4 border-l-blue-600">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase text-muted-foreground">Equipment Loans</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{reportsData.equipment?.total_loans || 0}</div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {reportsData.equipment?.intact_returns || 0} intact • {reportsData.equipment?.damaged_returns || 0} damaged
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="shadow-xs border-l-4 border-l-emerald-600">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase text-muted-foreground">Charges Collected</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-emerald-600">
                        LKR {Number(reportsData.services?.total_charges_collected_lkr || 0).toFixed(2)}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {reportsData.services?.total_requests || 0} service jobs completed
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="shadow-xs border-l-4 border-l-purple-600">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase text-muted-foreground">Rapid 3D Prints</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">{reportsData.services?.total_3d_prints || 0}</div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">FabLab precision prototypes</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Visual Chart: Daily Activity Distribution */}
                <Card className="shadow-xs">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Daily Utilization and Booking Distribution
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Volume of facility bookings and equipment loans over the selected interval
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(!reportsData.timeline || reportsData.timeline.length === 0) ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">No timeline data available.</div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-4 text-xs font-semibold pb-2 border-b">
                          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-primary" /> Bookings</span>
                          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-blue-600" /> Borrows</span>
                          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-600" /> Services</span>
                        </div>
                        <div className="space-y-1.5 max-h-72 overflow-y-auto pt-2">
                          {reportsData.timeline.map((point: any) => {
                            const total = point.bookings + point.borrows + point.services;
                            return (
                              <div key={point.date} className="flex items-center gap-3 text-xs">
                                <span className="w-24 font-mono text-[11px] text-muted-foreground shrink-0">{point.date}</span>
                                <div className="flex-1 flex h-4 bg-muted/40 rounded overflow-hidden">
                                  {point.bookings > 0 && (
                                    <div
                                      style={{ width: `${Math.min(100, (point.bookings / Math.max(1, total)) * 100)}%` }}
                                      className="bg-primary"
                                      title={`Bookings: ${point.bookings}`}
                                    />
                                  )}
                                  {point.borrows > 0 && (
                                    <div
                                      style={{ width: `${Math.min(100, (point.borrows / Math.max(1, total)) * 100)}%` }}
                                      className="bg-blue-600"
                                      title={`Borrows: ${point.borrows}`}
                                    />
                                  )}
                                  {point.services > 0 && (
                                    <div
                                      style={{ width: `${Math.min(100, (point.services / Math.max(1, total)) * 100)}%` }}
                                      className="bg-emerald-600"
                                      title={`Services: ${point.services}`}
                                    />
                                  )}
                                </div>
                                <span className="w-16 text-right font-mono text-[11px] font-bold text-foreground shrink-0">
                                  {total} total
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Sub-breakdown Tables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top Facilities */}
                  <Card className="shadow-xs">
                    <CardHeader>
                      <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
                        Most Utilized Lecture Halls
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y text-xs">
                        {(!reportsData.bookings?.top_facilities || reportsData.bookings.top_facilities.length === 0) ? (
                          <div className="p-4 text-center text-muted-foreground">No bookings in range.</div>
                        ) : (
                          reportsData.bookings.top_facilities.map((fac: any, idx: number) => (
                            <div key={fac.name} className="p-3 flex items-center justify-between">
                              <span className="font-semibold text-foreground">
                                {idx + 1}. {fac.name}
                              </span>
                              <Badge variant="usj">{fac.booking_count} bookings</Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Equipment */}
                  <Card className="shadow-xs">
                    <CardHeader>
                      <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
                        Highest Demand Laboratory Equipment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y text-xs">
                        {(!reportsData.equipment?.top_equipment || reportsData.equipment.top_equipment.length === 0) ? (
                          <div className="p-4 text-center text-muted-foreground">No equipment loans in range.</div>
                        ) : (
                          reportsData.equipment.top_equipment.map((eq: any, idx: number) => (
                            <div key={eq.name} className="p-3 flex items-center justify-between">
                              <span className="font-semibold text-foreground">
                                {idx + 1}. {eq.name}
                              </span>
                              <Badge variant="outline">{eq.units_borrowed} units loaned</Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL: PROVISION NEW ADMINISTRATOR (SUPER ADMIN)             */}
        {/* ------------------------------------------------------------- */}
        {createAdminModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <Card className="w-full max-w-md shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Provision Administrator Account</CardTitle>
                    <CardDescription className="text-xs">
                      Super Admin authorization to create role-restricted staff accounts
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setCreateAdminModal(false)} className="h-8 w-8 p-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateAdminSubmit} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground">Administrative Role *</label>
                    <select
                      value={adminRole}
                      onChange={(e) => setAdminRole(e.target.value)}
                      className="w-full text-xs rounded border bg-background p-2 font-medium"
                    >
                      <option value="FACILITY_ADMIN">Facility Admin (Lecture Halls and Maintenance)</option>
                      <option value="LAB_ADMIN">Lab Admin (Equipment and Services)</option>
                      <option value="SUPER_ADMIN">Super Admin (Faculty Governance)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground">Full Name *</label>
                    <Input
                      type="text"
                      placeholder="e.g. Eng. Sanath Ranatunga"
                      value={adminFullName}
                      onChange={(e) => setAdminFullName(e.target.value)}
                      required
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground">University Staff Email *</label>
                    <Input
                      type="email"
                      placeholder="e.g. s.ranatunga@eng.sjp.ac.lk"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      required
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground">Initial Temporary Password *</label>
                    <Input
                      type="password"
                      placeholder="Min 8 characters"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                      minLength={8}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2 border-t">
                    <Button type="button" variant="outline" size="sm" onClick={() => setCreateAdminModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="usj" size="sm" disabled={adminCreating}>
                      {adminCreating ? "Provisioning..." : "Create Admin Account"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL: SCHEDULE MAINTENANCE BLOCK (FACILITY ADMIN)           */}
        {/* ------------------------------------------------------------- */}
        {maintenanceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <Card className="w-full max-w-md shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Schedule Maintenance Interval</CardTitle>
                    <CardDescription className="text-xs">
                      Blocks the selected hall from student booking reservations
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setMaintenanceModal(false)} className="h-8 w-8 p-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleScheduleMaintenanceSubmit} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground">Target Lecture Hall / Theatre *</label>
                    <select
                      value={maintFacilityId}
                      onChange={(e) => setMaintFacilityId(e.target.value)}
                      className="w-full text-xs rounded border bg-background p-2"
                      required
                    >
                      {facilities.map((fac) => (
                        <option key={fac.id} value={fac.id}>
                          {fac.name} ({fac.building})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground">Block Start *</label>
                      <Input
                        type="datetime-local"
                        value={maintStartTime}
                        onChange={(e) => setMaintStartTime(e.target.value)}
                        required
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground">Block End *</label>
                      <Input
                        type="datetime-local"
                        value={maintEndTime}
                        onChange={(e) => setMaintEndTime(e.target.value)}
                        required
                        className="text-xs h-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground">Maintenance Purpose / Reason *</label>
                    <Textarea
                      value={maintReason}
                      onChange={(e) => setMaintReason(e.target.value)}
                      required
                      rows={2}
                      className="text-xs resize-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2 border-t">
                    <Button type="button" variant="outline" size="sm" onClick={() => setMaintenanceModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="usj" size="sm" disabled={maintSubmitting}>
                      {maintSubmitting ? "Saving..." : "Confirm Maintenance Block"}
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
