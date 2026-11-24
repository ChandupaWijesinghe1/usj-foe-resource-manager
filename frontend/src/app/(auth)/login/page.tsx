"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Landmark,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid institutional email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginContent() {
  const { login, getDashboardUrl } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");

  const [serverError, setServerError] = useState<string | null>(null);
  const [isUnverified, setIsUnverified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    setIsUnverified(false);
    try {
      const loggedInUser = await login(values.email, values.password);
      if (redirectUrl) {
        router.push(redirectUrl);
      } else {
        router.push(getDashboardUrl(loggedInUser));
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        "Authentication failed. Please check credentials.";
      setServerError(msg);
      if (typeof msg === "string" && msg.toLowerCase().includes("verified")) {
        setIsUnverified(true);
      }
    }
  };

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
                  USJ Resource Portal
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FDB913]/20 text-[#78350F] border border-[#FDB913]/30">
                    FOE
                  </span>
                </h1>
                <p className="text-xs text-muted-foreground">
                  Faculty of Engineering · USJ
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Welcome Back
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in with your institutional account to continue
              </p>
            </div>

            {/* Dedicated Gateway Portals */}
            <div className="grid grid-cols-2 gap-2">
              <Link href="/lecture" className="block">
                <div className="h-full rounded-xl border border-primary/30 bg-primary/5 p-2.5 hover:bg-primary/10 transition-colors cursor-pointer text-left space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-base">👨‍🏫</span>
                    <span className="text-[10px] font-bold text-primary uppercase">Portal</span>
                  </div>
                  <p className="text-xs font-bold text-foreground">Lecturer Sign In</p>
                  <p className="text-[10px] text-muted-foreground">localhost/lecture</p>
                </div>
              </Link>
              <Link href="/admin" className="block">
                <div className="h-full rounded-xl border border-secondary/40 bg-secondary/10 p-2.5 hover:bg-secondary/20 transition-colors cursor-pointer text-left space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-base">🛡️</span>
                    <span className="text-[10px] font-bold text-secondary uppercase">Portal</span>
                  </div>
                  <p className="text-xs font-bold text-foreground">Admin Portal</p>
                  <p className="text-[10px] text-muted-foreground">localhost/admin</p>
                </div>
              </Link>
            </div>

            {/* Quick Demo Fill Buttons */}
            <div className="rounded-xl border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Seed Credentials:
                </p>
                <span className="text-[10px] text-muted-foreground">Click to populate</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setValue("email", "kamal@eng.sjp.ac.lk");
                    setValue("password", "Lecturer@USJ2026!");
                  }}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
                >
                  <span>👨‍🏫</span> Lecturer (Dr. Kamal)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setValue("email", "student@eng.sjp.ac.lk");
                    setValue("password", "Student@USJ2026!");
                  }}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-accent/20 text-[#78350F] hover:bg-accent/30 transition-colors flex items-center gap-1"
                >
                  <span>🎓</span> Student
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setValue("email", "admin@eng.sjp.ac.lk");
                    setValue("password", "Admin@USJ2026!");
                  }}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-secondary/15 text-foreground hover:bg-secondary/25 transition-colors flex items-center gap-1"
                >
                  <span>🛡️</span> Super Admin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setValue("email", "facility.admin@eng.sjp.ac.lk");
                    setValue("password", "Facility@USJ2026!");
                  }}
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors flex items-center gap-1"
                >
                  <span>🏛️</span> Facility Admin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setValue("email", "lab.admin@eng.sjp.ac.lk");
                    setValue("password", "LabAdmin@USJ2026!");
                  }}
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors flex items-center gap-1"
                >
                  <span>🔬</span> Lab Admin
                </button>
              </div>
            </div>

            {serverError && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
                {isUnverified && (
                  <div className="pt-1">
                    <Link
                      href="/verify-email"
                      className="inline-block font-semibold underline hover:opacity-80"
                    >
                      Click here to activate / verify your account
                    </Link>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-foreground"
                >
                  Institutional Email
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
                    placeholder="name@eng.sjp.ac.lk"
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
                    placeholder="Enter your password"
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
                disabled={isSubmitting}
                className="h-11 w-full rounded-lg font-bold gap-2 text-sm shadow-elevation-md"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="pt-2 text-center text-xs text-muted-foreground">
              <span>New student? </span>
              <Link
                href="/register"
                className="font-semibold text-primary hover:underline"
              >
                Register as Student
              </Link>
              <p className="text-[11px] text-muted-foreground/80 mt-1">
                (Staff &amp; Administrator accounts are pre-provisioned via seed credentials)
              </p>
            </div>

            <div className="pt-4 border-t text-center text-[11px] text-muted-foreground space-y-1">
              <p>University of Sri Jayewardenepura · Faculty of Engineering</p>
              <p>
                For support, contact{" "}
                <a
                  href="mailto:support@foe.sjp.ac.lk"
                  className="font-semibold text-primary hover:underline"
                >
                  support@foe.sjp.ac.lk
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* Right Hero Section with Faculty Building Backdrop */}
        <aside
          className="relative hidden lg:flex lg:w-[50%] overflow-hidden items-center justify-center text-white"
          aria-label="Faculty of Engineering, University of Sri Jayewardenepura"
        >
          {/* Faculty building photo */}
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
            {/* University Crest */}
            <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-[2rem] bg-white/10 backdrop-blur-md p-2.5 shadow-elevation-lg ring-2 ring-white/30">
              <img
                src="/logo.jpg"
                alt="University of Sri Jayewardenepura Crest"
                className="h-full w-full object-cover rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur border border-white/25 text-[#FDB913]">
                <Sparkles className="h-3.5 w-3.5" />
                Faculty of Engineering
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight drop-shadow-md">
                Resource &amp; Facility Management
              </h2>
              <p className="text-sm text-white/85 leading-relaxed">
                Single sign-on access to engineering lecture halls, consultation scheduling, laboratory equipment loaning, and 3D printing fabrication services.
              </p>
            </div>

            {/* University Info Footnote */}
            <div className="pt-6 border-t border-white/15 flex items-center justify-center gap-6 text-xs text-white/75">
              <div>
                <p className="font-bold text-white text-base">5</p>
                <p>Departments</p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div>
                <p className="font-bold text-white text-base">12+</p>
                <p>Lecture Theatres</p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div>
                <p className="font-bold text-white text-base">80+</p>
                <p>Lab Instruments</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
