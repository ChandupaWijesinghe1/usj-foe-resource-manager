"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, KeyRound, Mail, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const urlToken = searchParams.get("token") || "";

  const [token, setToken] = useState(urlToken);
  const [resendEmail, setResendEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "sent">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleVerify = async (tokenToVerify: string) => {
    if (!tokenToVerify.trim()) return;
    setStatus("loading");
    setMessage(null);

    try {
      const res = await api.post("/auth/verify-email", { token: tokenToVerify.trim() });
      setStatus("success");
      setMessage(res.data.message || "Email successfully verified! Your account is activated.");
    } catch (err: any) {
      setStatus("error");
      const detail = err.response?.data?.error?.message || err.response?.data?.detail || "Verification token is invalid or has expired.";
      setMessage(detail);
    }
  };

  useEffect(() => {
    if (urlToken) {
      setToken(urlToken);
      handleVerify(urlToken);
    }
  }, [urlToken]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResendStatus("loading");

    try {
      const res = await api.post("/auth/resend-verification", { email: resendEmail.trim() });
      setResendStatus("sent");
      if (res.data.token) {
        setToken(res.data.token);
      }
    } catch (err) {
      setResendStatus("idle");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center p-4">
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
            <CardTitle className="text-2xl font-extrabold tracking-tight">Email Verification</CardTitle>
            <CardDescription className="text-xs mt-1">
              Faculty of Engineering · University of Sri Jayewardenepura
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {message && (
            <div
              className={`rounded-md p-3 text-xs font-medium ${
                status === "success"
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                  : "bg-destructive/15 text-destructive"
              }`}
            >
              {message}
            </div>
          )}

          {status !== "success" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerify(token);
              }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" /> Verification Security Token
                </label>
                <Input
                  placeholder="Paste verification token here..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="usj"
                className="w-full font-semibold"
                disabled={status === "loading" || !token.trim()}
              >
                {status === "loading" ? "Verifying..." : "Verify & Activate Account"}
              </Button>
            </form>
          )}

          {status === "success" && (
            <div className="pt-2 text-center">
              <Link href="/login">
                <Button variant="usj" className="w-full font-semibold">
                  Sign In to Portal
                </Button>
              </Link>
            </div>
          )}

          {status !== "success" && (
            <div className="mt-6 border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <RefreshCw className="h-3.5 w-3.5" /> Didn&apos;t receive a verification link?
              </p>
              {resendStatus === "sent" ? (
                <p className="text-xs text-emerald-600 font-medium">
                  A new token has been dispatched. Check above to verify.
                </p>
              ) : (
                <form onSubmit={handleResend} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="name@eng.sjp.ac.lk"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="text-xs h-9"
                    required
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="text-xs shrink-0"
                    disabled={resendStatus === "loading"}
                  >
                    Resend
                  </Button>
                </form>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="border-t pt-4 text-center text-xs text-muted-foreground justify-center">
          <Link href="/login" className="hover:underline">
            Back to Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Loading verification screen...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
