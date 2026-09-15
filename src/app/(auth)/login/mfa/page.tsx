"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function MfaChallengeForm() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      const { data: mfaData, error: mfaError } = await supabase.auth.mfa.listFactors();
      if (mfaError || !mfaData) {
        setError("Unable to load security factors.");
        return;
      }
      const verifiedTotp = mfaData.all.find(
        (f) => f.factor_type === "totp" && f.status === "verified"
      );
      if (!verifiedTotp) {
        router.push("/dashboard");
        return;
      }
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: verifiedTotp.id,
      });
      if (challengeError) {
        setError("Unable to start verification. Try signing in again.");
        return;
      }
      setFactorId(verifiedTotp.id);
      setChallengeId(challenge.id);
      setReady(true);
    }
    init();
  }, [supabase, router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || !challengeId || !code.trim()) return;
    setError("");
    setLoading(true);

    const { error: verifyError } = await supabase!.auth.mfa.verify({
      factorId,
      challengeId,
      code: code.trim(),
    });

    if (verifyError) {
      setError(verifyError.message === "Token has expired or is invalid"
        ? "Code expired. Please try again."
        : "Invalid code. Please try again.");
      setLoading(false);
      return;
    }

    const raw = searchParams.get("redirect") || "/dashboard";
    const redirect = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
    router.push(redirect);
    router.refresh();
  };

  if (!ready && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
              <Shield className="h-6 w-6 text-foreground" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Two-factor authentication</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the six-digit code from your authenticator app.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="mfa-code" className="block text-sm font-medium text-foreground">
                Authentication code
              </label>
              <input
                id="mfa-code" type="text" value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-center text-lg tracking-widest text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="000000" inputMode="numeric" autoComplete="one-time-code"
                maxLength={6}
              />
            </div>

            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

            <button
              type="submit" disabled={loading || code.length !== 6}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>

          <div className="mt-6">
            <button
              onClick={() => { supabase?.auth.signOut(); router.push("/login"); }}
              className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MfaChallengePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    }>
      <MfaChallengeForm />
    </Suspense>
  );
}
