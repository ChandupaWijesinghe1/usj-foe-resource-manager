"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Clock,
  Compass,
  FileCheck2,
  FolderGit2,
  LayoutDashboard,
  Printer,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Lecture Halls & Booking",
    href: "/halls",
    icon: CalendarDays,
  },
  {
    title: "Lecturer Consultations",
    href: "/lecturers",
    icon: Clock,
  },
  {
    title: "Equipment Borrowing",
    href: "/equipment",
    icon: Wrench,
  },
  {
    title: "Lab Services & 3D Print",
    href: "/services",
    icon: Printer,
  },
  {
    title: "My Requests",
    href: "/my-requests",
    icon: FileCheck2,
  },
  {
    title: "Admin Management",
    href: "/admin",
    icon: ShieldCheck,
    roles: ["SUPER_ADMIN", "FACILITY_ADMIN", "HALL_ADMIN", "LAB_ADMIN"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasRole } = useAuth();

  return (
    <aside className="w-64 border-r bg-card/60 backdrop-blur min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden md:flex">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Navigation
        </div>
        {navItems.map((item) => {
          if (item.roles && !hasRole(item.roles as any)) {
            return null;
          }
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </div>

      {user && (
        <div className="rounded-lg border bg-background/50 p-3 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Compass className="h-3.5 w-3.5 text-primary" />
            <span>USJ Engineering Network</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Connected as <span className="font-medium text-foreground">{user.email}</span>
          </p>
          {user.registration_number && (
            <p className="text-[10px] text-muted-foreground">
              Index: <span className="font-mono text-foreground">{user.registration_number}</span>
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
