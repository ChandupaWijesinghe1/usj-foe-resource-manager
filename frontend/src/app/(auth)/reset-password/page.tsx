"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AlertCircle, CheckCircle2, KeyRound, Lock } from "lucide-react";
import { authService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset security token is required"),
    new_password: z.string().min(8, "New password must be at least 8 characters"),
    confirm_password: z.string().min(8, "Confirm password is required"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") || "";

  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: initialToken,
      new_password: "",
      confirm_password: "",
    },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setServerError(null);
    try {
      await authService.resetPassword(values.token, values.new_password);
      setIsSuccess(true);
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        "Failed to reset password. Token may be invalid or expired.";
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
            <CardTitle className="text-2xl font-extrabold tracking-tight">Set New Password</CardTitle>
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

          {isSuccess ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Password Updated Successfully</p>
                  <p>Your password has been changed. You can now sign in with your new password.</p>
                </div>
              </div>
              <Link href="/login" className="block pt-2">
                <Button variant="usj" className="w-full font-semibold">
                  Sign In with New Password
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" /> Reset Security Token
                </label>
                <Input placeholder="Paste reset token here..." {...register("token")} />
                {errors.token && (
                  <p className="text-[11px] text-destructive">{errors.token.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> New Password
                </label>
                <Input
                  type="password"
                  placeholder="Min. 8 characters"
                  {...register("new_password")}
                />
                {errors.new_password && (
                  <p className="text-[11px] text-destructive">{errors.new_password.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Confirm New Password
                </label>
                <Input
                  type="password"
                  placeholder="Repeat new password"
                  {...register("confirm_password")}
                />
                {errors.confirm_password && (
                  <p className="text-[11px] text-destructive">
                    {errors.confirm_password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="usj"
                className="w-full font-semibold mt-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Updating Password..." : "Save New Password"}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="border-t pt-4 text-center text-xs text-muted-foreground justify-center">
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Back to Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Loading security token...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
