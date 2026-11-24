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
        { title: "Student Dashboard", href: "/dashboard/student", subtitle: "Your bookings, requests and campus activity at a glance", icon: LayoutDashboard },
        { title: "Lecture Halls & Booking", href: "/halls", subtitle: "Check availability and reserve lecture halls", icon: CalendarDays },
        { title: "Lecturer Consultations", href: "/lecturers", subtitle: "Book consultation slots with academic staff", icon: Clock },
        { title: "Equipment Borrowing", href: "/equipment", subtitle: "Browse and borrow laboratory equipment", icon: Wrench },
        { title: "Lab Services & 3D Print", href: "/services", subtitle: "Request lab services and 3D printing jobs", icon: Printer },
        { title: "My Requests & Tracker", href: "/my-requests", subtitle: "Track the status of everything you have requested", icon: FileCheck2 },
        { title: "Notifications", href: "/notifications", subtitle: "Updates on your bookings, requests and approvals", icon: Bell },
        { title: "My Profile", href: "/profile", subtitle: "Your account details and security settings", icon: User },
      ];
    }

    if (user.role === "LECTURER") {
      return [
        { title: "Lecturer Dashboard", href: "/dashboard/lecturer", subtitle: "Your consultations, bookings and requests at a glance", icon: LayoutDashboard },
        { title: "Consultation Requests", href: "/lecturers", subtitle: "Manage consultation slots and student requests", icon: Clock },
        { title: "Lecture Halls", href: "/halls", subtitle: "Check availability and reserve lecture halls", icon: CalendarDays },
        { title: "Equipment Catalog", href: "/equipment", subtitle: "Browse and borrow laboratory equipment", icon: Wrench },
        { title: "My Requests", href: "/my-requests", subtitle: "Track the status of everything you have requested", icon: FileCheck2 },
        { title: "Notifications", href: "/notifications", subtitle: "Updates on your bookings, requests and approvals", icon: Bell },
        { title: "My Profile", href: "/profile", subtitle: "Your account details and security settings", icon: User },
      ];
    }

    // Administrators: SUPER_ADMIN, FACILITY_ADMIN, LAB_ADMIN
    return [
      { title: "Admin Overview", href: "/dashboard/admin", subtitle: "Faculty-wide resource usage and pending approvals", icon: LayoutDashboard },
      { title: "Operations Hub", href: "/admin", subtitle: "Manage users, facilities and approval workflows", icon: ShieldCheck },
      { title: "Halls & Facilities", href: "/halls", subtitle: "Manage lecture halls, facilities and bookings", icon: CalendarDays },
      { title: "Lab & Equipment", href: "/equipment", subtitle: "Manage laboratory equipment and loans", icon: Wrench },
      { title: "3D Print & Services", href: "/services", subtitle: "Manage lab service and 3D printing requests", icon: Printer },
      { title: "Notifications", href: "/notifications", subtitle: "Updates on your bookings, requests and approvals", icon: Bell },
      { title: "My Profile", href: "/profile", subtitle: "Your account details and security settings", icon: User },
    ];
  };

  const navItems = getNavItems();

  // Page heading for the top bar: match the current route against the menu,
  // falling back to a prettified path segment for routes not in the menu.
  const currentItem = navItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  const fallbackTitle = (pathname.split("/").filter(Boolean).pop() || "Dashboard")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const pageTitle = currentItem?.title ?? fallbackTitle;
  const pageSubtitle = currentItem?.subtitle ?? "Faculty of Engineering Resource Portal";

  const renderNavLinks = (onNavigate?: () => void) =>
    navItems.map((item) => {
      const isActive = item === currentItem;
      const Icon = item.icon;

      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
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
    });

  const brand = (
    <Link href="/" className="flex items-center gap-3 group">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-0.5 shadow-elevation-sm ring-1 ring-border group-hover:ring-primary/40 transition-all overflow-hidden">
        <img
          src="/logo.jpg"
          alt="University of Sri Jayewardenepura Crest"
          className="h-full w-full object-cover rounded-lg"
        />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm tracking-tight text-foreground group-hover:text-primary transition-colors">
            USJ Resource Portal
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-[#FDB913]/20 text-[#78350F] border border-[#FDB913]/30">
            FOE
          </span>
        </div>
        <p className="text-[11px] leading-tight text-muted-foreground">Faculty of Engineering</p>
        <p className="text-[10px] leading-tight text-muted-foreground/80">University of Sri Jayewardenepura</p>
      </div>
    </Link>
  );

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-background">
        {/* Top bar: left part sits above the sidebar, right part above the page */}
        <header className="sticky top-0 z-40 flex h-20 border-b bg-card/95 backdrop-blur shadow-sm">
          {/* Left: brand, same width as the sidebar */}
          <div className="hidden md:flex w-64 shrink-0 items-center px-4 border-r">{brand}</div>

          {/* Right: page title + actions */}
          <div className="flex flex-1 min-w-0 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-muted-foreground hover:text-foreground"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                  {pageTitle}
                </h1>
                <p className="text-xs text-muted-foreground truncate">{pageSubtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <NotificationsPopover />
              <div className="h-6 w-[1px] bg-border" />
              <UserMenu />
            </div>
          </div>
        </header>

        <div className="flex flex-1">
          {/* Desktop Sidebar (menu only; brand lives in the top bar) */}
          <aside className="sticky top-20 h-[calc(100vh-5rem)] w-64 border-r bg-card/70 backdrop-blur hidden md:flex flex-col shrink-0 shadow-sm">
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>{user?.role.replace("_", " ")} MENU</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
              <div className="pt-2 space-y-1">{renderNavLinks()}</div>
            </nav>

            {user && (
              <div className="p-4 pt-0">
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
              </div>
            )}
          </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 max-w-[85vw] bg-card shadow-2xl flex flex-col z-10">
              <div className="flex h-20 items-center justify-between gap-2 px-4 border-b">
                {brand}
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground"
                  aria-label="Close navigation menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {renderNavLinks(() => setMobileMenuOpen(false))}
              </nav>

              {user && (
                <div className="p-4 border-t text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">{user.full_name}</p>
                  <p className="text-[11px] truncate">{user.email}</p>
                </div>
              )}
            </div>
          </div>
        )}

          <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
