"use client";

import { useState, useCallback } from "react";
import { X, Shield, Mail, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { StepUpMethod } from "@/types";

interface StepUpVerificationDialogProps {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
  allowedMethods: StepUpMethod[];
  reason: string;
}

type Step = "choose" | "totp" | "email_otp" | "verifying" | "success" | "error";

export function StepUpVerificationDialog({
  open, onClose, onVerified, allowedMethods, reason,
}: StepUpVerificationDialogProps) {
  const [step, setStep] = useState<Step>("choose");
  const [method, setMethod] = useState<StepUpMethod | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const supabase = createClient();

  const handleSendEmailOtp = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user?.email) {
        setError("No email on account");
        setLoading(false);
        return;
      }
      const { error: sendError } = await supabase!.auth.signInWithOtp({
        email: user.email,
        options: { shouldCreateUser: false },
      });
      if (sendError) {
        setError("Check your email for the code. If it doesn't arrive, try again.");
      }
      setEmailCooldown(60);
      const interval = setInterval(() => {
        setEmailCooldown((prev) => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
      setStep("email_otp");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const handleVerify = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!method || !code.trim()) return;
    setLoading(true);
    setError("");

    try {
      if (method === "totp") {
        const { data: mfaData } = await supabase!.auth.mfa.listFactors();
        const verifiedTotp = mfaData?.all.find(
          (f) => f.factor_type === "totp" && f.status === "verified"
        );
        if (!verifiedTotp) {
          setError("No verified authenticator app found");
          setLoading(false);
          return;
        }
        const { data: challenge, error: challengeError } = await supabase!.auth.mfa.challenge({
          factorId: verifiedTotp.id,
        });
        if (challengeError) {
          setError("Failed to start verification");
          setLoading(false);
          return;
        }
        const { error: verifyError } = await supabase!.auth.mfa.verify({
          factorId: verifiedTotp.id,
          challengeId: challenge.id,
          code: code.trim(),
        });
        if (verifyError) {
          setError("Invalid code. Please try again.");
          setLoading(false);
          return;
        }
      } else {
        const { data: { user } } = await supabase!.auth.getUser();
        if (!user?.email) {
          setError("No email on account");
          setLoading(false);
          return;
        }
        const { error: verifyError } = await supabase!.auth.verifyOtp({
          email: user.email,
          token: code.trim(),
          type: "email",
        });
        if (verifyError) {
          setError("Invalid code. Please try again.");
          setLoading(false);
          return;
        }
      }

      setStep("success");
    } catch {
      setError("Verification failed");
    } finally {
      setLoading(false);
    }
  }, [method, code, supabase]);

  const handleClose = () => {
    setStep("choose");
    setMethod(null);
    setCode("");
    setError("");
    setLoading(false);
    setEmailCooldown(0);
    onClose();
  };

  const handleSuccess = () => {
    handleClose();
    onVerified();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Additional verification required</h2>
          <button onClick={handleClose} className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-6">
          {(step === "choose" || step === "totp" || step === "email_otp") && (
            <p className="mb-4 text-sm text-muted-foreground">{reason}</p>
          )}

          {/* Choose method */}
          {step === "choose" && (
            <div className="space-y-3">
              {allowedMethods.includes("totp") && (
                <button onClick={() => { setMethod("totp"); setStep("totp"); }}
                  disabled={loading}
                  className="flex w-full items-center gap-3 rounded-lg border border-border p-4 text-left hover:bg-accent disabled:opacity-50">
                  <Shield className="h-5 w-5 text-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Authenticator app</p>
                    <p className="text-xs text-muted-foreground">Use a six-digit code from your authenticator app</p>
                  </div>
                </button>
              )}
              {allowedMethods.includes("email_otp") && (
                <button onClick={() => { setMethod("email_otp"); handleSendEmailOtp(); }}
                  disabled={loading}
                  className="flex w-full items-center gap-3 rounded-lg border border-border p-4 text-left hover:bg-accent disabled:opacity-50">
                  <Mail className="h-5 w-5 text-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Email verification code</p>
                    <p className="text-xs text-muted-foreground">Receive a code at your email address</p>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* TOTP code entry */}
          {step === "totp" && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <input
                  type="text" value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-center text-lg tracking-widest text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="000000" inputMode="numeric" autoComplete="one-time-code"
                  maxLength={6} autoFocus
                />
              </div>
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep("choose")}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">Back</button>
                <button type="submit" disabled={loading || code.length !== 6}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {loading ? "Verifying..." : "Verify"}
                </button>
              </div>
            </form>
          )}

          {/* Email OTP entry */}
          {step === "email_otp" && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <input
                  type="text" value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-center text-lg tracking-widest text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Enter code" inputMode="numeric" autoComplete="one-time-code"
                  maxLength={8} autoFocus
                />
              </div>
              {emailCooldown > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Resend code in {emailCooldown}s
                </p>
              )}
              {emailCooldown === 0 && (
                <button type="button" onClick={handleSendEmailOtp} disabled={loading}
                  className="text-xs text-muted-foreground hover:text-foreground">
                  Resend code
                </button>
              )}
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep("choose")}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">Back</button>
                <button type="submit" disabled={loading || !code.trim()}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {loading ? "Verifying..." : "Verify"}
                </button>
              </div>
            </form>
          )}

          {/* Success */}
          {step === "success" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium text-foreground">Verified</p>
              <button onClick={handleSuccess}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Continue
              </button>
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <button onClick={() => setStep("choose")}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
