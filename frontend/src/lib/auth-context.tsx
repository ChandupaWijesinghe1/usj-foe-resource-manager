"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService, LoginPayload } from "@/services/auth.service";
import { User, UserRole } from "@/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  refreshUser: () => Promise<void>;
  getDashboardUrl: (user?: User | null) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function getDashboardUrlForRole(user?: User | null): string {
  if (!user) return "/login";
  switch (user.role) {
    case "STUDENT":
      return "/dashboard/student";
    case "LECTURER":
      return "/dashboard/lecturer";
    case "SUPER_ADMIN":
    case "FACILITY_ADMIN":
    case "LAB_ADMIN":
      return "/dashboard/admin";
    default:
      return "/";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const fetchCurrentUser = async () => {
    try {
      if (!authService.isAuthenticated()) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const profile = await authService.getCurrentUser();
      setUser(profile);
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(profile));
      }
    } catch {
      setUser(null);
      await authService.logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    setIsLoading(true);
    try {
      const data = await authService.login({ email, password: pass });
      authService.storeSession(data);
      setUser(data.user);
      return data.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === "SUPER_ADMIN") return true;
    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        hasRole,
        refreshUser: fetchCurrentUser,
        getDashboardUrl: (u) => getDashboardUrlForRole(u !== undefined ? u : user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
