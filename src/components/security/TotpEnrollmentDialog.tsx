"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Shield, Copy, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface TotpEnrollmentDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type Step = "intro" | "qr" | "verify" | "success" | "error";

export function TotpEnrollmentDialog({ open, onClose, onComplete }: TotpEnrollmentDialogProps) {
  const [step, setStep] = useState<Step>("intro");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [showSecret, setShowSecret] = useState(false);
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const supabase = createClient();

  const startEnroll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: enrollError } = await supabase!.auth.mfa.enroll({
        factorType: "totp",
      });
      if (enrollError) {
        setError(enrollError.message);
        setStep("error");
        return;
      }
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setStep("qr");
    } catch {
      setError("Failed to start enrollment");
      setStep("error");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const startChallenge = useCallback(async () => {
    if (!factorId) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: challengeError } = await supabase!.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) {
        setError("Failed to create verification challenge");
        return;
      }
      setChallengeId(data.id);
      setStep("verify");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [factorId, supabase]);

  const verifyCode = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || !challengeId || code.length !== 6) return;
    setLoading(true);
    setError("");

    try {
      const { error: verifyError } = await supabase!.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      });
      if (verifyError) {
        setError(verifyError.message === "Token has expired or is invalid"
          ? "Code expired. Please go back and try again."
          : "Invalid code. Please check your authenticator app and try again.");
        setLoading(false);
        return;
      }
      setStep("success");
    } catch {
      setError("Verification failed");
    } finally {
      setLoading(false);
    }
  }, [factorId, challengeId, code, supabase]);

  const handleClose = () => {
    setStep("intro");
    setFactorId(null);
    setQrCode("");
    setSecret("");
    setShowSecret(false);
    setCode("");
    setChallengeId(null);
    setError("");
    setLoading(false);
    setCopiedSecret(false);
    onClose();
  };

  const handleComplete = () => {
    handleClose();
    onComplete();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Set up authenticator app</h2>
          <button onClick={handleClose} className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-6">
          {/* Intro */}
          {step === "intro" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent">
                <Shield className="h-8 w-8 text-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Use an authenticator app like Google Authenticator, Authy, or 1Password to generate six-digit codes.
              </p>
              <button
                onClick={startEnroll} disabled={loading}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? "Preparing..." : "Get started"}
              </button>
            </div>
          )}

          {/* QR Code */}
          {step === "qr" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Scan this QR code with your authenticator app.
              </p>
              <div className="flex justify-center">
                {qrCode ? (
                  <img src={qrCode} alt="QR code for authenticator app" className="h-48 w-48 rounded-lg border border-border" />
                ) : (
                  <div className="h-48 w-48 animate-pulse rounded-lg bg-muted" />
                )}
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Setup key</span>
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                    aria-label={showSecret ? "Hide setup key" : "Show setup key"}
                  >
                    {showSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs text-foreground">
                    {showSecret ? secret : secret.replace(/./g, "•")}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(secret); setCopiedSecret(true); }}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Copy setup key"
                  >
                    {copiedSecret ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                After scanning, click continue to verify your authenticator app is working.
              </p>

              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

              <div className="flex gap-2">
                <button onClick={handleClose} className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">
                  Cancel
                </button>
                <button onClick={startChallenge} disabled={loading}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Continue"}
                </button>
              </div>
            </div>
          )}

          {/* Verify */}
          {step === "verify" && (
            <form onSubmit={verifyCode} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Enter the six-digit code from your authenticator app.
              </p>
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
                <button type="button" onClick={() => setStep("qr")}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">
                  Back
                </button>
                <button type="submit" disabled={loading || code.length !== 6}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify"}
                </button>
              </div>
            </form>
          )}

          {/* Success */}
          {step === "success" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <p className="font-medium text-foreground">Authenticator app enabled</p>
              <p className="text-sm text-muted-foreground">
                Two-factor authentication is now active. You will be asked for a code when signing in.
              </p>
              <button onClick={handleComplete}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Done
              </button>
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <div className="flex gap-2">
                <button onClick={handleClose} className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">
                  Cancel
                </button>
                <button onClick={startEnroll}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
