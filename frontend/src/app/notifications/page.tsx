"use client";

import React, { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCheck,
  Clock,
  ExternalLink,
  Layers,
  Printer,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { notificationService } from "@/services/notification.service";
import { Notification } from "@/types";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [unreadOnly, setUnreadOnly] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [unreadOnly]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getNotifications(unreadOnly);
      setNotifications(data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Ignore
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === "ALL") return true;
    return n.notification_type === filterType;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "FACILITY_BOOKING":
        return <CalendarDays className="h-4 w-4 text-primary" />;
      case "MEETING":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "EQUIPMENT":
        return <Wrench className="h-4 w-4 text-amber-600" />;
      case "SERVICE_3D":
        return <Printer className="h-4 w-4 text-emerald-600" />;
      default:
        return <Bell className="h-4 w-4 text-slate-600" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Actions */}
        {unreadCount > 0 && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="gap-1.5 text-xs font-semibold self-start sm:self-auto"
            >
              <CheckCheck className="h-4 w-4 text-emerald-600" />
              <span>Mark all {unreadCount} unread as read</span>
            </Button>
          </div>
        )}

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/30 p-3 rounded-xl border">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground">Category:</span>
            {["ALL", "FACILITY_BOOKING", "MEETING", "EQUIPMENT", "SERVICE_3D", "SYSTEM"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterType === type
                    ? "bg-primary text-primary-foreground font-semibold shadow-elevation-sm"
                    : "bg-background text-muted-foreground hover:text-foreground border"
                }`}
              >
                {type.replace("_", " ")}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="rounded text-primary focus:ring-primary"
            />
            <span>Show Unread Only ({unreadCount})</span>
          </label>
        </div>

        {/* Notification List */}
        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">Loading notifications...</div>
        ) : filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-xs text-muted-foreground space-y-2">
              <Layers className="h-8 w-8 mx-auto opacity-30" />
              <p className="text-sm font-semibold text-foreground">No notifications matching criteria</p>
              <p>You are all caught up with university communications.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {filteredNotifications.map((n) => (
              <Card
                key={n.id}
                onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                className={`p-4 transition-all cursor-pointer hover:shadow-xs border ${
                  !n.is_read
                    ? "bg-primary/5 border-primary/30 shadow-2xs"
                    : "bg-card hover:bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted border">
                      {getNotificationIcon(n.notification_type)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground">{n.title}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {n.notification_type.replace("_", " ")}
                        </Badge>
                        {!n.is_read && (
                          <span className="rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.2">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{n.message}</p>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80 pt-1 font-mono">
                        <Clock className="h-3 w-3" />
                        <span>{formatDateTime(n.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {!n.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-primary hover:text-primary/80 h-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(n.id);
                      }}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
