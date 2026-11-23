"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, BookOpen, GraduationCap, LogOut, ShieldAlert, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Notification } from "@/types";

export function Navbar() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  useEffect(() => {
    if (user) {
      api.get("/notifications?limit=5&unread_only=true")
        .then((res) => setNotifications(res.data))
        .catch(() => {});
    }
  }, [user]);

  const roleBadgeVariant = (role?: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "destructive";
      case "HALL_ADMIN":
      case "LAB_ADMIN":
        return "warning";
      case "LECTURER":
        return "info";
      default:
        return "secondary";
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
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
                <Badge variant="gold" className="text-[10px] px-1.5 py-0 hidden sm:inline-flex">
                  FOE
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Faculty of Engineering, University of Sri Jayewardenepura
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              {/* Notification Bell */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNotifMenu(!showNotifMenu)}
                >
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-destructive" />
                  )}
                </Button>

                {showNotifMenu && (
                  <div className="absolute right-0 mt-2 w-80 rounded-lg border bg-popover p-4 shadow-lg text-popover-foreground z-50">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Notifications ({notifications.length})
                      </span>
                      <Link
                        href="/my-requests"
                        className="text-xs text-primary hover:underline"
                        onClick={() => setShowNotifMenu(false)}
                      >
                        View all
                      </Link>
                    </div>
                    <div className="mt-2 divide-y">
                      {notifications.length === 0 ? (
                        <p className="py-4 text-center text-xs text-muted-foreground">
                          No unread notifications
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className="py-2">
                            <p className="text-xs font-medium">{n.title}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile & Role */}
              <div className="flex items-center gap-3 border-l pl-4">
                <div className="text-right hidden md:block">
                  <div className="text-sm font-semibold leading-none">{user.full_name}</div>
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    <Badge variant={roleBadgeVariant(user.role)} className="text-[10px] py-0 px-1.5">
                      {user.role.replace("_", " ")}
                    </Badge>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="gap-1.5 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link href="/lecture" className="hidden lg:inline-flex">
                <Button variant="ghost" size="sm" className="text-xs font-medium">
                  Lecturer Portal
                </Button>
              </Link>
              <Link href="/admin" className="hidden lg:inline-flex">
                <Button variant="ghost" size="sm" className="text-xs font-medium">
                  Admin Portal
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="usj" size="sm">
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
