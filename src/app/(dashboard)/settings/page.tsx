"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPublicEnv } from "@/lib/env";
import { formatBytes } from "@/lib/utils";
import { calculateStorageSummary } from "@/lib/files/storage";
import {
  DEFAULT_UPLOAD_LIMITS_MB, limitsFromSettings, UPLOAD_CATEGORIES,
  UPLOAD_LIMIT_COLUMNS, MIN_UPLOAD_LIMIT_MB, MAX_UPLOAD_LIMIT_MB,
  type UploadLimitsMb,
} from "@/lib/upload-limits";
import type { CategoryType } from "@/types";
import {
  HardDrive, Globe, Database, Sun, Moon, Shield, Key, Mail, Eye, EyeOff, Loader2,
  Smartphone, Check, X, ChevronRight, AlertTriangle, Lock, UploadCloud,
} from "lucide-react";
import { useTheme } from "next-themes";
import { TotpEnrollmentDialog } from "@/components/security/TotpEnrollmentDialog";
import type { StorageSummary } from "@/types";

const env = getPublicEnv();

export default function SettingsPage() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [storage, setStorage] = useState<StorageSummary | null>(null);
  const { theme, setTheme } = useTheme();

  // Security state
  const [mfaFactors, setMfaFactors] = useState<Array<{ id: string; factor_type: string; status: string; friendly_name?: string }>>([]);
  const [verifiedTotp, setVerifiedTotp] = useState(false);
  const [totpLoading, setTotpLoading] = useState(false);
  const [showTotpEnrollment, setShowTotpEnrollment] = useState(false);
  const [disablingTotp, setDisablingTotp] = useState(false);

  // Security settings
  const [requireMfaSensitive, setRequireMfaSensitive] = useState(false);
  const [requireMfaPrivate, setRequireMfaPrivate] = useState(false);
  const [requireEmailOtp, setRequireEmailOtp] = useState(false);
  const [defaultVisibility, setDefaultVisibility] = useState<"public" | "private">("public");
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Upload limits (MB per category), configured here and enforced server-side.
  const [uploadLimits, setUploadLimits] = useState<UploadLimitsMb>(DEFAULT_UPLOAD_LIMITS_MB);
  const [savingLimits, setSavingLimits] = useState(false);
  const [limitsMessage, setLimitsMessage] = useState<string | null>(null);

  // Step-up state for changing security settings
  const [stepUpRequired, setStepUpRequired] = useState(false);
  const [stepUpReason, setStepUpReason] = useState("");
  const [pendingSettingsChange, setPendingSettingsChange] = useState<Record<string, unknown> | null>(null);

  const supabase = createClient();

  const loadMfaStatus = useCallback(async () => {
    if (!supabase) return;
    setTotpLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (!error && data) {
        setMfaFactors(data.all);
        setVerifiedTotp(data.all.some((f) => f.factor_type === "totp" && f.status === "verified"));
      }
    } finally {
      setTotpLoading(false);
    }
  }, [supabase]);

  const loadSecuritySettings = useCallback(async () => {
    if (!supabase) return;
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/security/settings");
      if (res.ok) {
        const data = await res.json();
        setRequireMfaSensitive(data.require_mfa_for_sensitive_actions ?? false);
        setRequireMfaPrivate(data.require_mfa_for_private_files ?? false);
        setRequireEmailOtp(data.require_email_otp_for_sensitive_actions ?? false);
        setDefaultVisibility(data.default_upload_visibility ?? "public");
        setUploadLimits(limitsFromSettings(data));
      }
    } finally {
      setSettingsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const sb = createClient();
    if (!sb) return;

    sb.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      if (!u) return;
      sb.from("files")
        .select("file_type, size")
        .eq("user_id", u.id)
        .then(({ data: files }) => {
          if (files) setStorage(calculateStorageSummary(files));
        });
    });
    loadMfaStatus();
    loadSecuritySettings();
  }, [loadMfaStatus, loadSecuritySettings]);

  const updateSecuritySetting = async (key: string, value: unknown) => {
    const res = await fetch("/api/security/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    return res.ok;
  };

  const handleToggle = async (key: string, current: boolean, setter: (v: boolean) => void) => {
    const newValue = !current;

    if (newValue === false) {
      const ok = await updateSecuritySetting(key, false);
      if (ok) setter(false);
      return;
    }

    setPendingSettingsChange({ [key]: newValue });
    setStepUpReason("Changing security settings requires additional verification.");
    setStepUpRequired(true);
  };

  const handleStepUpVerified = async () => {
    if (!pendingSettingsChange) return;
    const key = Object.keys(pendingSettingsChange)[0];
    const value = pendingSettingsChange[key];
    const ok = await updateSecuritySetting(key, value);

    if (ok) {
      if (value === true || value === false) {
        const setters: Record<string, (v: boolean) => void> = {
          require_mfa_for_sensitive_actions: setRequireMfaSensitive,
          require_mfa_for_private_files: setRequireMfaPrivate,
          require_email_otp_for_sensitive_actions: setRequireEmailOtp,
        };
        setters[key]?.(value as boolean);
      }
    }
    setPendingSettingsChange(null);
    setStepUpRequired(false);
  };

  const handleDefaultVisibilityChange = async (v: "public" | "private") => {
    if (v === "public") {
      const ok = await updateSecuritySetting("default_upload_visibility", "public");
      if (ok) setDefaultVisibility("public");
      return;
    }
    setPendingSettingsChange({ default_upload_visibility: v });
    setStepUpReason("Changing upload visibility requires additional verification.");
    setStepUpRequired(true);
  };

  const handleLimitChange = (category: CategoryType, raw: string) => {
    const parsed = parseInt(raw, 10);
    const value = Number.isFinite(parsed) ? parsed : MIN_UPLOAD_LIMIT_MB;
    setUploadLimits((prev) => ({ ...prev, [category]: value }));
    setLimitsMessage(null);
  };

  const saveUploadLimits = async () => {
    // Clamp to the allowed range before sending so the UI matches what the
    // server (and DB check constraint) will accept.
    const clamped: UploadLimitsMb = { ...uploadLimits };
    const payload: Record<string, number> = {};
    for (const category of UPLOAD_CATEGORIES) {
      const v = Math.min(Math.max(Math.floor(uploadLimits[category] || MIN_UPLOAD_LIMIT_MB), MIN_UPLOAD_LIMIT_MB), MAX_UPLOAD_LIMIT_MB);
      clamped[category] = v;
      payload[UPLOAD_LIMIT_COLUMNS[category]] = v;
    }
    setUploadLimits(clamped);
    setSavingLimits(true);
    setLimitsMessage(null);
    try {
      const res = await fetch("/api/security/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setUploadLimits(limitsFromSettings(data));
        setLimitsMessage("Saved");
      } else {
        setLimitsMessage("Failed to save");
      }
    } catch {
      setLimitsMessage("Failed to save");
    } finally {
      setSavingLimits(false);
    }
  };

  const handleDisableTotp = async () => {
    if (!supabase) return;
    setDisablingTotp(true);
    try {
      const verified = mfaFactors.find((f) => f.factor_type === "totp" && f.status === "verified");
      if (verified) {
        await supabase.auth.mfa.unenroll({ factorId: verified.id });
      }
      await loadMfaStatus();
    } finally {
      setDisablingTotp(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pb-8 sm:px-0">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Account, system, and security preferences
        </p>
      </div>

      {/* Account */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-4">
          <Shield className="h-4 w-4" />
          Account
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Email</span>
            <p className="text-foreground">{user?.email || "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">App</span>
            <p className="text-foreground">{env.APP_NAME}</p>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-4">
          <Lock className="h-4 w-4" />
          Security
        </div>

        <div className="space-y-4 divide-y divide-border">
          {/* Authenticator App */}
          <div className="flex items-center justify-between gap-4 pt-2 first:pt-0">
            <div className="flex items-start gap-3">
              <Smartphone className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Authenticator app</p>
                <p className="text-xs text-muted-foreground">
                  {totpLoading ? "Loading..." : verifiedTotp ? "Enabled" : "Not enabled"}
                </p>
              </div>
            </div>
            {verifiedTotp ? (
              <div className="flex gap-2">
                <button
                  onClick={handleDisableTotp} disabled={disablingTotp}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-accent disabled:opacity-50"
                >
                  {disablingTotp ? "Disabling..." : "Disable"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowTotpEnrollment(true)}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Set up
              </button>
            )}
          </div>

          {/* Email verification */}
          <div className="flex items-center justify-between gap-4 pt-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Email verification</p>
                <p className="text-xs text-muted-foreground">
                  Receive a code at your email address
                </p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{user?.email || "No email"}</span>
          </div>

          {/* Sensitive actions */}
          <div className="space-y-3 pt-4">
            <p className="text-sm font-medium text-foreground">Sensitive actions</p>
            <p className="text-xs text-muted-foreground">
              Require extra verification before sensitive actions.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-foreground">Require email code for sensitive actions</span>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={requireEmailOtp}
                    onChange={() => handleToggle("require_email_otp_for_sensitive_actions", requireEmailOtp, setRequireEmailOtp)}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-9 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-muted-foreground after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:bg-primary-foreground" />
                </label>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-foreground">Require MFA for sensitive actions</span>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={requireMfaSensitive}
                    onChange={() => handleToggle("require_mfa_for_sensitive_actions", requireMfaSensitive, setRequireMfaSensitive)}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-9 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-muted-foreground after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:bg-primary-foreground" />
                </label>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-foreground">Require MFA for private files</span>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={requireMfaPrivate}
                    onChange={() => handleToggle("require_mfa_for_private_files", requireMfaPrivate, setRequireMfaPrivate)}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-9 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-muted-foreground after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:bg-primary-foreground" />
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Default Upload Visibility */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-4">
          <Eye className="h-4 w-4" />
          Default upload visibility
        </div>
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["public", "private"] as const).map((v) => (
              <button
                key={v}
                onClick={() => handleDefaultVisibilityChange(v)}
                className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                  defaultVisibility === v
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:border-input"
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Public files can be opened by anyone with the URL. Use Private for sensitive documents or images.
            </p>
          </div>
        </div>
      </section>

      {/* Upload limits */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-4">
          <UploadCloud className="h-4 w-4" />
          Upload limits
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Maximum file size per category, in megabytes ({MIN_UPLOAD_LIMIT_MB}–{MAX_UPLOAD_LIMIT_MB} MB). Enforced on every upload.
        </p>
        <div className="space-y-3">
          {(UPLOAD_CATEGORIES).map((category) => {
            const labels: Record<CategoryType, string> = {
              image: "Images", video: "Videos", document: "Documents", files: "Files",
            };
            return (
              <div key={category} className="flex items-center justify-between gap-4">
                <label htmlFor={`limit-${category}`} className="text-sm text-foreground">{labels[category]}</label>
                <div className="flex items-center gap-2">
                  <input
                    id={`limit-${category}`}
                    type="number"
                    min={MIN_UPLOAD_LIMIT_MB}
                    max={MAX_UPLOAD_LIMIT_MB}
                    value={uploadLimits[category]}
                    onChange={(e) => handleLimitChange(category, e.target.value)}
                    disabled={settingsLoading || savingLimits}
                    className="w-24 rounded-lg border border-input bg-background px-3 py-1.5 text-right text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  />
                  <span className="text-xs text-muted-foreground">MB</span>
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-end gap-3 pt-1">
            {limitsMessage && (
              <span className={`text-xs ${limitsMessage === "Saved" ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                {limitsMessage}
              </span>
            )}
            <button
              onClick={saveUploadLimits}
              disabled={settingsLoading || savingLimits}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {savingLimits ? "Saving..." : "Save limits"}
            </button>
          </div>
        </div>
      </section>

      {/* Storage */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-4">
          <HardDrive className="h-4 w-4" />
          Storage
        </div>
        {storage ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium text-foreground">{formatBytes(storage.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Images</span>
              <span className="text-foreground">{formatBytes(storage.images)} ({storage.imageCount} files)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Videos</span>
              <span className="text-foreground">{formatBytes(storage.videos)} ({storage.videoCount} files)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Documents</span>
              <span className="text-foreground">{formatBytes(storage.documents)} ({storage.documentCount} files)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Files</span>
              <span className="text-foreground">{formatBytes(storage.files)} ({storage.fileCount} files)</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">0 B used</p>
        )}
      </section>

      {/* Media domain */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-4">
          <Globe className="h-4 w-4" />
          Media domain
        </div>
        <p className="text-sm text-foreground">{env.MEDIA_BASE_URL || "Not configured"}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Public URLs are generated using this base URL combined with the R2 object key.
        </p>
      </section>

      {/* Service status */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-4">
          <Database className="h-4 w-4" />
          Services
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${env.SUPABASE_URL ? "bg-green-400" : "bg-red-400"}`} />
            <span className="text-muted-foreground">Supabase {env.SUPABASE_URL ? "configured" : "not configured"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            <span className="text-muted-foreground">Upload limits: {uploadLimits.image}MB images, {uploadLimits.video}MB videos, {uploadLimits.document}MB documents, {uploadLimits.files}MB files</span>
          </div>
        </div>
      </section>

      {/* Theme */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-4">
          {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          Theme
        </div>
        <div className="flex gap-2">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                theme === t
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:border-input"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {/* TOTP Enrollment Dialog */}
      <TotpEnrollmentDialog
        open={showTotpEnrollment}
        onClose={() => setShowTotpEnrollment(false)}
        onComplete={() => { loadMfaStatus(); }}
      />

      {/* Step-up verification dialog for settings changes */}
      {stepUpRequired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">Verification required</h2>
              <button onClick={() => { setStepUpRequired(false); setPendingSettingsChange(null); }}
                className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-6">
              <p className="mb-4 text-sm text-muted-foreground">{stepUpReason}</p>
              <StepUpVerifyButtons
                onVerified={handleStepUpVerified}
                onCancel={() => { setStepUpRequired(false); setPendingSettingsChange(null); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepUpVerifyButtons({ onVerified, onCancel }: { onVerified: () => void; onCancel: () => void }) {
  const [method, setMethod] = useState<"totp" | "email_otp" | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const supabase = createClient();

  const sendEmailCode = async () => {
    setLoading(true);
    setError("");
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user?.email) { setError("No email on account"); setLoading(false); return; }
    const { error: sendError } = await supabase!.auth.signInWithOtp({
      email: user.email,
      options: { shouldCreateUser: false },
    });
    if (sendError) {
      setError("Check your email for the code. If it doesn't arrive, try again.");
    }
    setCooldown(60);
    const interval = setInterval(() => {
      setCooldown((p) => { if (p <= 1) { clearInterval(interval); return 0; } return p - 1; });
    }, 1000);
    setLoading(false);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!method || !code.trim()) return;
    setLoading(true);
    setError("");
    try {
      if (method === "totp") {
        const { data: mfa } = await supabase!.auth.mfa.listFactors();
        const f = mfa?.all.find((x) => x.factor_type === "totp" && x.status === "verified");
        if (!f) { setError("No verified authenticator app found"); setLoading(false); return; }
        const { data: c } = await supabase!.auth.mfa.challenge({ factorId: f.id });
        if (!c) { setError("Failed to create challenge"); setLoading(false); return; }
        const { error: ve } = await supabase!.auth.mfa.verify({ factorId: f.id, challengeId: c.id, code: code.trim() });
        if (ve) { setError("Invalid code"); setLoading(false); return; }
      } else {
        const { data: { user } } = await supabase!.auth.getUser();
        if (!user?.email) { setError("No email"); setLoading(false); return; }
        const { error: ve } = await supabase!.auth.verifyOtp({ email: user.email, token: code.trim(), type: "email" });
        if (ve) { setError("Invalid code"); setLoading(false); return; }
      }
      onVerified();
    } catch { setError("Verification failed"); } finally { setLoading(false); }
  };

  if (method) {
    return (
      <form onSubmit={verify} className="space-y-4">
        <input
          type="text" value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, method === "totp" ? 6 : 8))}
          className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-center text-lg tracking-widest text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder={method === "totp" ? "000000" : "00000000"} inputMode="numeric" maxLength={method === "totp" ? 6 : 8} autoFocus
        />
        {cooldown > 0 && method === "email_otp" && (
          <p className="text-xs text-muted-foreground text-center">Resend in {cooldown}s</p>
        )}
        {cooldown === 0 && method === "email_otp" && (
          <button type="button" onClick={sendEmailCode} disabled={loading}
            className="w-full text-xs text-muted-foreground hover:text-foreground">
            Resend code
          </button>
        )}
        {error && <p className="text-sm text-amber-600 dark:text-amber-400">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={() => setMethod(null)} className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">Back</button>
          <button type="submit" disabled={loading || (method === "totp" ? code.length !== 6 : code.length < 4)} className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {loading ? "Verifying..." : "Verify"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <button onClick={() => { setMethod("totp"); }} className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent">
        <Smartphone className="h-5 w-5 text-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">Authenticator app</p>
          <p className="text-xs text-muted-foreground">Use a six-digit code</p>
        </div>
      </button>
      <button onClick={() => { sendEmailCode(); setMethod("email_otp"); }} className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent">
        <Mail className="h-5 w-5 text-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">Email verification code</p>
          <p className="text-xs text-muted-foreground">Receive a code at your email</p>
        </div>
      </button>
      <button onClick={onCancel} className="w-full rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">Cancel</button>
    </div>
  );
}
