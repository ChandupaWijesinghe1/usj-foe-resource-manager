"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Clock,
  Compass,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Printer,
  ShieldCheck,
  User,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { NotificationsPopover } from "@/components/layout/notifications-popover";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { UserRole } from "@/types";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function DashboardLayout({ children, allowedRoles }: DashboardLayoutProps) {
  const { user, hasRole } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Compute navigation items based on user role
  const getNavItems = () => {
    if (!user) return [];

    if (user.role === "STUDENT") {
      return [
        { title: "Student Dashboard", href: "/dashboard/student", icon: LayoutDashboard },
        { title: "Lecture Halls & Booking", href: "/halls", icon: CalendarDays },
        { title: "Lecturer Consultations", href: "/lecturers", icon: Clock },
        { title: "Equipment Borrowing", href: "/equipment", icon: Wrench },
        { title: "Lab Services & 3D Print", href: "/services", icon: Printer },
        { title: "My Requests & Tracker", href: "/my-requests", icon: FileCheck2 },
        { title: "Notifications", href: "/notifications", icon: Bell },
        { title: "My Profile", href: "/profile", icon: User },
      ];
    }

    if (user.role === "LECTURER") {
      return [
        { title: "Lecturer Dashboard", href: "/dashboard/lecturer", icon: LayoutDashboard },
        { title: "Consultation Requests", href: "/lecturers", icon: Clock },
        { title: "Lecture Halls", href: "/halls", icon: CalendarDays },
        { title: "Equipment Catalog", href: "/equipment", icon: Wrench },
        { title: "My Requests", href: "/my-requests", icon: FileCheck2 },
        { title: "Notifications", href: "/notifications", icon: Bell },
        { title: "My Profile", href: "/profile", icon: User },
      ];
    }

    // Administrators: SUPER_ADMIN, FACILITY_ADMIN, LAB_ADMIN
    return [
      { title: "Admin Overview", href: "/dashboard/admin", icon: LayoutDashboard },
      { title: "Operations Hub", href: "/admin", icon: ShieldCheck },
      { title: "Halls & Facilities", href: "/halls", icon: CalendarDays },
      { title: "Lab & Equipment", href: "/equipment", icon: Wrench },
      { title: "3D Print & Services", href: "/services", icon: Printer },
      { title: "Notifications", href: "/notifications", icon: Bell },
      { title: "My Profile", href: "/profile", icon: User },
    ];
  };

  const navItems = getNavItems();

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-background">
        {/* Top Header */}
        <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur shadow-sm">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              {/* Mobile menu hamburger toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground hover:text-foreground"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-0.5 shadow-elevation-sm ring-1 ring-border group-hover:ring-primary/40 transition-all overflow-hidden">
                  <img
                    src="/logo.jpg"
                    alt="University of Sri Jayewardenepura Crest"
                    className="h-full w-full object-cover rounded-lg"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base tracking-tight text-foreground group-hover:text-primary transition-colors">
                      USJ Resource Portal
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FDB913]/20 text-[#78350F] border border-[#FDB913]/30 hidden sm:inline-flex">
                      FOE
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground hidden sm:block">
                    Faculty of Engineering, University of Sri Jayewardenepura
                  </p>
                </div>
              </Link>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <NotificationsPopover />
              <div className="h-6 w-[1px] bg-border" />
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Main Work Area */}
        <div className="flex flex-1">
          {/* Desktop Sidebar Navigation */}
          <aside className="w-64 border-r bg-card/70 backdrop-blur min-h-[calc(100vh-4rem)] p-4 hidden md:flex flex-col justify-between shrink-0 shadow-sm">
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>{user?.role.replace("_", " ")} MENU</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>

              <div className="pt-2 space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-elevation-sm"
                          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* User Footer Meta */}
            {user && (
              <div className="rounded-xl border bg-background/80 p-3 text-xs space-y-2 shadow-xs">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Compass className="h-3.5 w-3.5 text-primary" />
                  <span>USJ Campus Network</span>
                </div>
                <div className="text-[11px] text-muted-foreground space-y-0.5">
                  <p className="truncate">
                    ID: <span className="font-mono text-foreground font-medium">{user.registration_number || user.email.split("@")[0]}</span>
                  </p>
                  <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Verified & Active
                  </p>
                </div>
              </div>
            )}
          </aside>

          {/* Mobile Navigation Drawer Sheet */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex">
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="relative w-72 max-w-[85vw] bg-card p-5 shadow-2xl flex flex-col justify-between z-10">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b">
                    <div className="flex items-center gap-2.5">
                      <img
                        src="/logo.jpg"
                        alt="University Emblem"
                        className="h-7 w-7 rounded-lg object-cover shadow-xs"
                      />
                      <span className="font-bold text-sm">Navigation</span>
                    </div>
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    {navItems.map((item) => {
                      const isActive = pathname === item.href;
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all",
                            isActive
                              ? "bg-primary text-primary-foreground font-semibold shadow-elevation-sm"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {user && (
                  <div className="pt-4 border-t text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">{user.full_name}</p>
                    <p className="text-[11px] truncate">{user.email}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Page Content Viewport */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Breadcrumbs />
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
