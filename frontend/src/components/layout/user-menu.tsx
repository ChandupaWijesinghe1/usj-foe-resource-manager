"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings, Shield, User, UserCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="ghost" size="sm" className="text-xs font-semibold">
            Sign In
          </Button>
        </Link>
        <Link href="/register">
          <Button variant="usj" size="sm" className="text-xs font-semibold">
            Register
          </Button>
        </Link>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const formatRole = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "Super Admin";
      case "FACILITY_ADMIN":
        return "Facility Admin";
      case "LAB_ADMIN":
        return "Lab Admin";
      case "LECTURER":
        return "Lecturer";
      case "STUDENT":
        return "Student";
      default:
        return role;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
      case "FACILITY_ADMIN":
      case "LAB_ADMIN":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300";
      case "LECTURER":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
      default:
        return "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300";
    }
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    router.push("/login");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full p-1 hover:bg-muted transition-colors focus:outline-none"
        aria-label="User Profile Menu"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-xs shadow-elevation-sm ring-2 ring-primary/20">
          {getInitials(user.full_name)}
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-64 rounded-xl border bg-card text-card-foreground shadow-2xl animate-in fade-in-0 zoom-in-95">
            <div className="border-b px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-sm truncate">{user.full_name}</p>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getRoleBadgeClass(
                    user.role
                  )}`}
                >
                  {formatRole(user.role)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              {user.registration_number && (
                <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                  {user.registration_number}
                </p>
              )}
            </div>

            <div className="p-1 space-y-0.5 text-xs">
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span>My Profile</span>
              </Link>

              <Link
                href="/my-requests"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span>My Bookings & Requests</span>
              </Link>

              {(user.role === "SUPER_ADMIN" ||
                user.role === "FACILITY_ADMIN" ||
                user.role === "LAB_ADMIN") && (
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-foreground hover:bg-muted transition-colors font-medium text-primary dark:text-rose-400"
                >
                  <Shield className="h-4 w-4" />
                  <span>Admin Management Hub</span>
                </Link>
              )}
            </div>

            <div className="border-t p-1">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors text-xs font-medium"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
