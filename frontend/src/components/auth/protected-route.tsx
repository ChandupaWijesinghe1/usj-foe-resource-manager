"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { GraduationCap, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { UserRole } from "@/types";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, hasRole, getDashboardUrl } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-1 shadow-elevation-md ring-2 ring-primary/20 animate-pulse">
          <img
            src="/logo.jpg"
            alt="University Crest"
            className="h-full w-full object-cover rounded-xl"
          />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-foreground">Faculty of Engineering · USJ</p>
          <p className="text-xs text-muted-foreground">Verifying institutional credentials...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Access Restricted</h2>
          <p className="text-sm text-muted-foreground">
            Your account ({user.role.replace("_", " ")}) does not hold administrative clearance to
            access this portal section.
          </p>
        </div>
        <Button
          variant="usj"
          onClick={() => router.push(getDashboardUrl(user))}
          className="font-semibold text-xs mt-2"
        >
          Return to My Authorized Dashboard
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
