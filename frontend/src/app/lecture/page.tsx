"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  LogOut,
  Mail,
  Shield,
  ShieldAlert,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const lecturerLoginSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid university institutional email address")
    .regex(
      /^[a-zA-Z0-9._%+-]+@(eng\.)?sjp\.ac\.lk$/i,
      "Faculty email must end with @eng.sjp.ac.lk or @sjp.ac.lk"
    ),
  password: z.string().min(1, "Password is required"),
});

type LecturerLoginFormValues = z.infer<typeof lecturerLoginSchema>;

function LecturerLoginContent() {
  const { user, login, logout, getDashboardUrl } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard/lecturer";

  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [quickLoggingIn, setQuickLoggingIn] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LecturerLoginFormValues>({
    resolver: zodResolver(lecturerLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // If already logged in as a Lecturer, offer immediate redirection
  useEffect(() => {
    if (user && user.role === "LECTURER") {
      const timer = setTimeout(() => {
        router.push(redirectUrl);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [user, redirectUrl, router]);

  const onSubmit = async (values: LecturerLoginFormValues) => {
    setServerError(null);
    try {
      const loggedInUser = await login(values.email, values.password);
      if (loggedInUser.role !== "LECTURER") {
        setServerError(
          `Logged in as ${loggedInUser.full_name} (${loggedInUser.role}), but this portal is reserved for Academic Lecturers. Please visit your dedicated dashboard.`
        );
        return;
      }
      router.push(redirectUrl);
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        "Authentication failed. Please verify your academic credentials.";
      setServerError(msg);
    }
  };

  const handleQuickSeedLogin = async () => {
    setValue("email", "kamal@eng.sjp.ac.lk");
    setValue("password", "Lecturer@USJ2026!");
    setServerError(null);
    setQuickLoggingIn(true);
    try {
      const loggedInUser = await login("kamal@eng.sjp.ac.lk", "Lecturer@USJ2026!");
      router.push(redirectUrl);
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        "Quick seed sign-in failed.";
      setServerError(msg);
    } finally {
      setQuickLoggingIn(false);
    }
  };

  // If already logged in as Lecturer
  if (user && user.role === "LECTURER") {
    return (
      <div className="min-h-screen bg-[#f7f8fa] dark:bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-elevation-lg border-t-4 border-t-primary">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Lecturer Session Active
            </CardTitle>
            <CardDescription className="text-xs">
              Faculty of Engineering · University of Sri Jayewardenepura
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-muted/40 p-4 text-center space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Signed in as
              </p>
              <p className="text-lg font-bold text-foreground">{user.full_name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <div className="pt-2">
                <Badge variant="gold" className="text-xs">
                  Academic Faculty Member
                </Badge>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Redirecting you to the Lecturer Operations Dashboard...
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="usj"
                className="w-full font-bold"
                onClick={() => router.push(redirectUrl)}
              >
                Go to Lecturer Dashboard Now
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
              <Button
                variant="outline"
                className="w-full text-xs text-muted-foreground hover:text-destructive"
                onClick={logout}
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="min-h-screen lg:h-screen bg-card flex">
      <div className="flex w-full min-h-screen lg:min-h-0 lg:h-screen lg:flex-row-reverse">
        {/* Left Form Section */}
        <section className="flex w-full justify-center px-6 py-8 sm:px-12 lg:w-[50%] lg:px-14 lg:py-6 lg:overflow-y-auto">
          <div className="my-auto w-full max-w-[440px] space-y-4">
            {/* Header with University Badge */}
            <div className="flex items-center gap-3.5">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white p-1 shadow-elevation-sm ring-1 ring-border">
                <img
                  src="/logo.jpg"
                  alt="University of Sri Jayewardenepura Crest"
                  className="h-full w-full object-cover rounded-xl"
                />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                  Lecturer Portal
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#FDB913]/20 text-[#78350F] border border-[#FDB913]/30">
                    ACADEMIC
                  </span>
                </h1>
                <p className="text-xs text-muted-foreground">
                  Faculty of Engineering · USJ
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Academic Staff Sign In
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Access consultation schedules, student appointments, and lecture hall booking privileges
              </p>
            </div>

            {/* Institutional Security Notice */}
            <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs">
              <Shield className="h-4 w-4 shrink-0 text-primary" />
              <p className="text-muted-foreground">
                <span className="font-bold text-primary">Pre-provisioned accounts only.</span>{" "}
                Self-registration is disabled for lecturer accounts.
              </p>
            </div>

            {/* Quick 1-Click Seed Lecturer Login */}
            <div className="rounded-xl border bg-muted/40 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-secondary" />
                  Seed Lecturer Account
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  One-click Sign In
                </span>
              </div>

              <div className="rounded-lg border bg-card p-3 space-y-1.5 hover:border-primary/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👨‍🏫</span>
                    <div>
                      <p className="text-xs font-bold text-foreground">Dr. Kamal Perera</p>
                      <p className="text-[11px] text-muted-foreground">Senior Lecturer · Dept. of Electrical &amp; Electronic Eng.</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t text-[11px] text-muted-foreground">
                  <code>kamal@eng.sjp.ac.lk</code>
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Seed</span>
                </div>
                <Button
                  type="button"
                  variant="usj"
                  size="sm"
                  disabled={isSubmitting || quickLoggingIn}
                  onClick={handleQuickSeedLogin}
                  className="w-full mt-2 font-semibold text-xs h-8"
                >
                  {quickLoggingIn ? "Signing In as Dr. Kamal..." : "Sign In with Seed Credentials"}
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            </div>

            {/* If logged in with wrong role */}
            {user && user.role !== "LECTURER" && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>Logged in as {user.role.replace("_", " ")}</span>
                </div>
                <p>
                  You are currently authenticated as <strong>{user.full_name}</strong>. This portal is for Faculty Lecturers only.
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={logout}
                  >
                    Switch Account
                  </Button>
                  <Link href={getDashboardUrl(user)}>
                    <Button variant="default" size="sm" className="h-7 text-xs">
                      Go to Your Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {serverError && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive flex items-center gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Manual Sign-in Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-foreground"
                >
                  Academic Email
                </label>
                <div className="relative">
                  <Mail
                    aria-hidden="true"
                    className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="kamal@eng.sjp.ac.lk"
                    {...register("email")}
                    className="h-11 rounded-lg pl-10 text-sm"
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock
                    aria-hidden="true"
                    className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter academic password"
                    {...register("password")}
                    className="h-11 rounded-lg pl-10 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[11px] text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="usj"
                disabled={isSubmitting || quickLoggingIn}
                className="h-11 w-full rounded-lg font-bold gap-2 text-sm shadow-elevation-md"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Authenticating Lecturer...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In to Lecturer Portal
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Other Portals Switcher */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2 border-t">
              <Link
                href="/admin"
                className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                <Shield className="h-3.5 w-3.5 text-primary" />
                Administrator Portal
              </Link>
              <Link
                href="/login"
                className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                <GraduationCap className="h-3.5 w-3.5 text-secondary" />
                Student Login
              </Link>
            </div>

            <div className="text-center text-[11px] text-muted-foreground pt-1">
              University of Sri Jayewardenepura · Faculty of Engineering
            </div>
          </div>
        </section>

        {/* Right Hero Section with Faculty Building Backdrop */}
        <aside
          className="relative hidden lg:flex lg:w-[50%] overflow-hidden items-center justify-center text-white"
          aria-label="Faculty of Engineering Lecturer Portal"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/faculty-building-wide.webp')" }}
          />

          {/* USJ Brand Crimson Gradient Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(196,30,58,0.92)_0%,rgba(139,14,79,0.85)_48%,rgba(17,26,58,0.92)_100%)]" />

          {/* Dot matrix texture */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1.5px)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative z-10 max-w-md px-8 text-center space-y-6">
            <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-[2rem] bg-white/10 backdrop-blur-md p-2.5 shadow-elevation-lg ring-2 ring-white/30">
              <img
                src="/logo.jpg"
                alt="University Crest"
                className="h-full w-full object-cover rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur border border-white/25 text-[#FDB913]">
                <Sparkles className="h-3.5 w-3.5" />
                Academic Operations Hub
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight drop-shadow-md">
                Faculty Lecturer Portal
              </h2>
              <p className="text-sm text-white/85 leading-relaxed">
                Coordinate academic consultations, verify student attendance, and book department lecture halls with automated calendar sync.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 text-left">
              <div className="rounded-xl bg-white/10 backdrop-blur border border-white/15 p-3 space-y-1">
                <Clock className="h-5 w-5 text-[#FDB913]" />
                <p className="text-xs font-bold">Office Hours</p>
                <p className="text-[11px] text-white/75">
                  Publish availability slots for student consultations
                </p>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur border border-white/15 p-3 space-y-1">
                <CalendarDays className="h-5 w-5 text-[#FDB913]" />
                <p className="text-xs font-bold">Hall Bookings</p>
                <p className="text-[11px] text-white/75">
                  Reserve lecture theatres with priority faculty approval
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function LecturerLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <LecturerLoginContent />
    </Suspense>
  );
}
