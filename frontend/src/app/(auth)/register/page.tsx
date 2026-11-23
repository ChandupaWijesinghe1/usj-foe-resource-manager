"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Info,
  Lock,
  Mail,
  Phone,
  Shield,
  ShieldAlert,
  User,
  UserCheck,
} from "lucide-react";
import { authService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Zod schema for Student registration
export const studentRegisterSchema = z
  .object({
    full_name: z.string().min(2, "Full name must be at least 2 characters"),
    email: z
      .string()
      .email("Invalid email address")
      .regex(
        /^[a-zA-Z0-9._%+-]+@(eng\.)?sjp\.ac\.lk$/i,
        "Registration is restricted to university emails (@eng.sjp.ac.lk or @sjp.ac.lk)"
      ),
    registration_number: z
      .string()
      .regex(
        /^[A-Z]{2,4}\/\d{4}\/\d{3,5}$/i,
        "Registration format must be like 'EG/2021/4500'"
      ),
    phone_number: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(8, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type StudentRegisterFormValues = z.infer<typeof studentRegisterSchema>;

export default function RegisterPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    message: string;
    token?: string | null;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<StudentRegisterFormValues>({
    resolver: zodResolver(studentRegisterSchema),
    defaultValues: {
      full_name: "",
      email: "",
      registration_number: "",
      phone_number: "",
      password: "",
      confirm_password: "",
    },
  });

  const onSubmit = async (values: StudentRegisterFormValues) => {
    setServerError(null);
    try {
      const res = await authService.registerStudent({
        full_name: values.full_name,
        email: values.email,
        registration_number: values.registration_number.toUpperCase(),
        phone_number: values.phone_number || null,
        password: values.password,
      });
      setSuccessData({
        message:
          res.message ||
          "Registration successful! A verification token has been issued to your university inbox.",
        token: res.token,
      });
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        "Registration failed. Please check form details.";
      setServerError(msg);
    }
  };

  if (successData) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50 dark:bg-background">
        <Card className="w-full max-w-lg shadow-elevation-lg border-t-4 border-t-primary rounded-card">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mb-2 shadow-inner">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Student Registration Submitted!
            </CardTitle>
            <CardDescription className="text-sm">
              Faculty of Engineering, University of Sri Jayewardenepura
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 text-xs text-emerald-900 dark:text-emerald-200">
              <p className="font-semibold mb-1">Status Confirmation</p>
              <p>{successData.message}</p>
            </div>

            <div className="rounded-lg bg-muted/60 p-4 text-xs space-y-2 border">
              <p className="font-semibold text-foreground">Next Step: Verification</p>
              <p className="text-muted-foreground leading-relaxed">
                To prevent unauthorized access, students must verify their university email address
                prior to accessing faculty bookings.
              </p>
              {successData.token && (
                <div className="pt-2">
                  <Link href={`/verify-email?token=${encodeURIComponent(successData.token)}`}>
                    <Button variant="usj" size="sm" className="font-semibold text-xs">
                      Activate Account Instantly
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4 flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSuccessData(null);
                reset();
              }}
            >
              Register Another Account
            </Button>
            <Link href="/login">
              <Button variant="usj" size="sm">
                Proceed to Sign In
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50 dark:bg-background">
      <Card className="w-full max-w-lg shadow-elevation-lg border-t-4 border-t-primary rounded-card">
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-1 shadow-elevation-sm ring-1 ring-border">
            <img
              src="/logo.jpg"
              alt="University of Sri Jayewardenepura Crest"
              className="h-full w-full object-cover rounded-xl"
            />
          </div>
          <div>
            <CardTitle className="text-2xl font-extrabold tracking-tight">Student Registration</CardTitle>
            <CardDescription className="text-xs mt-1">
              Faculty of Engineering · University of Sri Jayewardenepura
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Institutional Policy Notice: No public registration for Lecturers & Admins */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-primary">
              <Info className="h-4 w-4 shrink-0" />
              <span>Staff &amp; Faculty Notice: No Self-Registration</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Lecturer and Administrative accounts are provisioned exclusively with official seed credentials. Public self-registration is reserved for students.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link href="/lecture" className="w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-[11px] font-semibold text-primary hover:bg-primary/10 border-primary/30"
                >
                  <span>👨‍🏫</span> Lecturer Portal (/lecture)
                </Button>
              </Link>
              <Link href="/admin" className="w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-[11px] font-semibold text-secondary hover:bg-secondary/10 border-secondary/30"
                >
                  <span>🛡️</span> Admin Portal (/admin)
                </Button>
              </Link>
            </div>
          </div>

          {serverError && (
            <div className="rounded-md bg-destructive/15 p-3 text-xs font-medium text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Full Name
              </label>
              <Input placeholder="e.g. Nuwan Bandara" {...register("full_name")} />
              {errors.full_name && (
                <p className="text-[11px] text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> University Student Email
              </label>
              <Input
                type="email"
                placeholder="e.g. nuwan@eng.sjp.ac.lk"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-[11px] text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" /> Registration Index Number
              </label>
              <Input
                placeholder="e.g. EG/2021/4500"
                {...register("registration_number")}
              />
              {errors.registration_number && (
                <p className="text-[11px] text-destructive">
                  {errors.registration_number.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Mobile Phone Number (Optional)
              </label>
              <Input placeholder="+94 77 123 4567" {...register("phone_number")} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Password
                </label>
                <Input
                  type="password"
                  placeholder="Min. 8 characters"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-[11px] text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Confirm Password
                </label>
                <Input
                  type="password"
                  placeholder="Repeat password"
                  {...register("confirm_password")}
                />
                {errors.confirm_password && (
                  <p className="text-[11px] text-destructive">
                    {errors.confirm_password.message}
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              variant="usj"
              className="w-full font-semibold mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting Student Registration..." : "Complete Student Registration"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="border-t pt-4 text-center text-xs text-muted-foreground justify-center">
          Already registered or using a seed user?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline ml-1">
            Sign In Here
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
