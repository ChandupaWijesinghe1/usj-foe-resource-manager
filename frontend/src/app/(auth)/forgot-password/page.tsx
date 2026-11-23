"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AlertCircle, CheckCircle2, GraduationCap, KeyRound, Mail } from "lucide-react";
import { authService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid institutional email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    token?: string | null;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setServerError(null);
    try {
      const res = await authService.forgotPassword(values.email);
      setSuccessInfo({
        message: res.message || "If an active account exists, password recovery instructions have been dispatched.",
        token: res.token,
      });
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        "Failed to initiate password recovery.";
      setServerError(msg);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50 dark:bg-background">
      <Card className="w-full max-w-md shadow-elevation-lg border-t-4 border-t-primary rounded-card">
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-1 shadow-elevation-sm ring-1 ring-border">
            <img
              src="/logo.jpg"
              alt="University of Sri Jayewardenepura Crest"
              className="h-full w-full object-cover rounded-xl"
            />
          </div>
          <div>
            <CardTitle className="text-2xl font-extrabold tracking-tight">Account Recovery</CardTitle>
            <CardDescription className="text-xs mt-1">
              Faculty of Engineering · University of Sri Jayewardenepura
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {serverError && (
            <div className="mb-4 rounded-md bg-destructive/15 p-3 text-xs font-medium text-destructive flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {successInfo ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Recovery Link Dispatched</p>
                  <p>{successInfo.message}</p>
                </div>
              </div>

              {successInfo.token && (
                <div className="rounded-lg bg-muted/60 p-4 text-xs space-y-2 border">
                  <p className="font-semibold text-foreground">Reset Token Generated</p>
                  <p className="text-muted-foreground text-[11px]">
                    In demo and sandbox mode, your token is provided below:
                  </p>
                  <Link
                    href={`/reset-password?token=${encodeURIComponent(successInfo.token)}`}
                    className="inline-block mt-2"
                  >
                    <Button variant="usj" size="sm" className="font-semibold text-xs">
                      Set New Password
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Institutional Email Address
                </label>
                <Input
                  type="email"
                  placeholder="name@eng.sjp.ac.lk"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-[11px] text-destructive">{errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="usj"
                className="w-full font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending Recovery Link..." : "Send Reset Instructions"}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="border-t pt-4 text-center text-xs text-muted-foreground justify-center">
          Remember your password?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline ml-1">
            Back to Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
