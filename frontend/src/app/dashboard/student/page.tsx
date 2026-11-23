"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Clock,
  ExternalLink,
  GraduationCap,
  Layers,
  Printer,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { resourceService } from "@/services/resource.service";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function StudentDashboardPage() {
  const { user } = useAuth();

  // TanStack Query: Fetch my bookings
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => resourceService.getFacilityBookings(),
  });

  // TanStack Query: Fetch my lecturer meetings
  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ["my-meetings"],
    queryFn: () => resourceService.getMyMeetings(),
  });

  // TanStack Query: Fetch my equipment borrows
  const { data: borrows = [], isLoading: borrowsLoading } = useQuery({
    queryKey: ["my-borrows"],
    queryFn: () => resourceService.getMyEquipmentBorrows(),
  });

  // TanStack Query: Fetch my 3D print service requests
  const { data: serviceRequests = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["my-service-requests"],
    queryFn: () => resourceService.getMyServiceRequests(),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
      case "CONFIRMED":
      case "COMPLETED":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
      case "PENDING":
      case "REQUESTED":
      case "SUBMITTED":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
      case "REJECTED":
      case "DECLINED":
      case "CANCELLED":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  return (
    <DashboardLayout allowedRoles={["STUDENT"]}>
      <div className="space-y-6">
        {/* Student Welcome Banner */}
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
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Welcome, {user?.full_name}
                </h1>
                <Badge variant="gold" className="text-[10px] px-1.5 py-0">
                  Student
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span>Faculty of Engineering · USJ</span>
                {user?.registration_number && (
                  <>
                    <span>•</span>
                    <span className="font-mono font-semibold text-foreground">Index: {user.registration_number}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/halls">
              <Button size="sm" variant="usj" className="font-semibold text-xs shadow-elevation-sm">
                Reserve Lecture Hall
              </Button>
            </Link>
            <Link href="/services">
              <Button size="sm" variant="outline" className="text-xs">
                Submit 3D Print File
              </Button>
            </Link>
          </div>
        </div>

        {/* Real-time KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                Facility Bookings
              </CardTitle>
              <CalendarDays className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookings.length}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {bookings.filter((b) => b.status === "APPROVED").length} approved
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                Lecturer Meetings
              </CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{meetings.length}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {meetings.filter((m) => m.meeting_status === "CONFIRMED").length} confirmed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                Equipment Loans
              </CardTitle>
              <Wrench className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{borrows.length}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {borrows.filter((b) => b.status === "ISSUED").length} currently in hand
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                3D Print Jobs
              </CardTitle>
              <Printer className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{serviceRequests.length}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                FabLab prototyping queue
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/halls" className="group">
            <Card className="h-full hover:border-primary hover:shadow-xs transition-all">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                    Lecture Halls
                  </h3>
                  <p className="text-xs text-muted-foreground">Book halls and auditoriums</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/lecturers" className="group">
            <Card className="h-full hover:border-amber-600 hover:shadow-xs transition-all">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm group-hover:text-amber-700 transition-colors">
                    Consultations
                  </h3>
                  <p className="text-xs text-muted-foreground">Schedule lecturer slots</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/equipment" className="group">
            <Card className="h-full hover:border-blue-600 hover:shadow-xs transition-all">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm group-hover:text-blue-700 transition-colors">
                    Lab Equipment
                  </h3>
                  <p className="text-xs text-muted-foreground">Borrow tools and devices</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/services" className="group">
            <Card className="h-full hover:border-emerald-600 hover:shadow-xs transition-all">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm group-hover:text-emerald-700 transition-colors">
                    FabLab 3D Print
                  </h3>
                  <p className="text-xs text-muted-foreground">Upload 3D STL designs</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Live Requisition & Activity Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Bookings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">My Facility Bookings</CardTitle>
                <CardDescription className="text-xs">Latest lecture hall allocations</CardDescription>
              </div>
              <Link href="/my-requests">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  <span>View All</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {bookingsLoading ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Loading bookings...</p>
              ) : bookings.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground space-y-1">
                  <CalendarDays className="h-6 w-6 mx-auto opacity-30 mb-1" />
                  <p>No active facility bookings.</p>
                  <Link href="/halls" className="text-primary font-semibold hover:underline">
                    Browse lecture halls
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {bookings.slice(0, 4).map((b) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <p className="font-semibold text-foreground">{b.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(b.start_time).toLocaleString()}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadge(b.status)}`}>
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Meetings & Consultations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">Consultation Sessions</CardTitle>
                <CardDescription className="text-xs">Lecturer office hour meetings</CardDescription>
              </div>
              <Link href="/my-requests">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  <span>View All</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {meetingsLoading ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Loading meetings...</p>
              ) : meetings.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground space-y-1">
                  <Clock className="h-6 w-6 mx-auto opacity-30 mb-1" />
                  <p>No upcoming lecturer meetings scheduled.</p>
                  <Link href="/lecturers" className="text-amber-700 font-semibold hover:underline">
                    Book a consultation
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {meetings.slice(0, 4).map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <p className="font-semibold text-foreground">{m.subject}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Date: {m.meeting_date} ({m.start_time} - {m.end_time})
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadge(m.meeting_status)}`}>
                        {m.meeting_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
