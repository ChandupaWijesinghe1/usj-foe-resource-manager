"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  AlertCircle,
  Building,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Shield,
  User,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { userService } from "@/services/user.service";
import { authService } from "@/services/auth.service";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Profile update schema
const profileSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  phone_number: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// Password change schema
const passwordChangeSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "New password must be at least 8 characters"),
    confirm_password: z.string().min(8, "Confirm password is required"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "New passwords do not match",
    path: ["confirm_password"],
  });

type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Profile Form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      full_name: user?.full_name || "",
      phone_number: user?.phone_number || "",
    },
  });

  // Password Form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const onUpdateProfile = async (values: ProfileFormValues) => {
    setProfileSuccess(null);
    setProfileError(null);
    try {
      await userService.updateProfile({
        full_name: values.full_name,
        phone_number: values.phone_number || null,
      });
      await refreshUser();
      setProfileSuccess("Profile details updated successfully.");
    } catch (err: any) {
      setProfileError(err.response?.data?.error?.message || "Failed to update profile details.");
    }
  };

  const onChangePassword = async (values: PasswordChangeFormValues) => {
    setPasswordSuccess(null);
    setPasswordError(null);
    try {
      const res = await authService.changePassword(
        values.current_password,
        values.new_password
      );
      setPasswordSuccess(res.message || "Password updated successfully.");
      resetPasswordForm();
    } catch (err: any) {
      setPasswordError(
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        "Failed to change password. Please check your current password."
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header Title */}
        <div className="border-b pb-4">
          <h1 className="text-2xl font-bold tracking-tight">Profile &amp; Security</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your personal contact details and password
          </p>
        </div>

        {/* Profile Card Meta */}
        <Card className="surface-hero rounded-card shadow-elevation-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-elevation-sm ring-4 ring-primary/10">
                  {user?.full_name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{user?.full_name}</h2>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  {user?.registration_number && (
                    <p className="text-xs font-mono font-medium text-foreground mt-0.5">
                      Index: {user.registration_number}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-bold border border-primary/20">
                  {user?.role.replace("_", " ")}
                </span>
                <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-3 py-1 text-xs font-semibold flex items-center gap-1 border border-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Verified Active
                </span>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Two-column layout for details update & password change */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Info Update */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription className="text-xs">
                Update your preferred name and contact number
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profileSuccess && (
                <div className="mb-4 rounded-md bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs font-medium text-emerald-800 dark:text-emerald-200 border border-emerald-200">
                  {profileSuccess}
                </div>
              )}
              {profileError && (
                <div className="mb-4 rounded-md bg-destructive/15 p-3 text-xs font-medium text-destructive flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleProfileSubmit(onUpdateProfile)} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                  <Input {...registerProfile("full_name")} />
                  {profileErrors.full_name && (
                    <p className="text-[11px] text-destructive">
                      {profileErrors.full_name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Institutional Email (Read-Only)
                  </label>
                  <Input value={user?.email || ""} disabled className="bg-muted text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground">
                    Institutional email addresses are managed by the Dean&apos;s Office.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Contact Phone Number
                  </label>
                  <Input placeholder="+94 77 123 4567" {...registerProfile("phone_number")} />
                </div>

                <Button
                  type="submit"
                  variant="usj"
                  size="sm"
                  className="font-semibold text-xs mt-2"
                  disabled={isProfileSubmitting}
                >
                  {isProfileSubmitting ? "Saving..." : "Save Profile Details"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                Password &amp; Security
              </CardTitle>
              <CardDescription className="text-xs">
                Regularly update your credentials to safeguard access
              </CardDescription>
            </CardHeader>
            <CardContent>
              {passwordSuccess && (
                <div className="mb-4 rounded-md bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs font-medium text-emerald-800 dark:text-emerald-200 border border-emerald-200">
                  {passwordSuccess}
                </div>
              )}
              {passwordError && (
                <div className="mb-4 rounded-md bg-destructive/15 p-3 text-xs font-medium text-destructive flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit(onChangePassword)} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Current Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter current password"
                    {...registerPassword("current_password")}
                  />
                  {passwordErrors.current_password && (
                    <p className="text-[11px] text-destructive">
                      {passwordErrors.current_password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    New Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Min. 8 characters"
                    {...registerPassword("new_password")}
                  />
                  {passwordErrors.new_password && (
                    <p className="text-[11px] text-destructive">
                      {passwordErrors.new_password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Repeat new password"
                    {...registerPassword("confirm_password")}
                  />
                  {passwordErrors.confirm_password && (
                    <p className="text-[11px] text-destructive">
                      {passwordErrors.confirm_password.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="font-semibold text-xs mt-2"
                  disabled={isPasswordSubmitting}
                >
                  {isPasswordSubmitting ? "Updating..." : "Update Security Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
