import { createClient } from "@/lib/supabase/server";

export async function getAuthenticatorAssuranceLevel() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return { aal: null, nextAal: null };
  return { aal: data.currentLevel, nextAal: data.nextLevel ?? null };
}

export async function listMfaFactors() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return { totp: [], all: [], error };
  const totp = data.all.filter((f) => f.factor_type === "totp" && f.status === "verified");
  return { totp, all: data.all, error: null };
}

export async function startTotpChallenge() {
  const supabase = await createClient();
  const factors = await listMfaFactors();
  if (factors.totp.length === 0) return { error: new Error("No verified TOTP factor found") };
  const { data, error } = await supabase.auth.mfa.challenge({
    factorId: factors.totp[0].id,
  });
  if (error) return { error };
  return { challengeId: data.id, factorId: factors.totp[0].id, error: null };
}

export async function verifyTotpChallenge(factorId: string, challengeId: string, code: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  });
  if (error) return { error };
  return { data, error: null };
}

export async function sendEmailOtp(email: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  return { error };
}

export async function verifyEmailOtp(email: string, token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error) return { error };
  return { data, error: null };
}

export async function getUserSecuritySettings() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_security_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function upsertSecuritySettings(settings: {
  require_mfa_for_sensitive_actions?: boolean;
  require_mfa_for_private_files?: boolean;
  require_email_otp_for_sensitive_actions?: boolean;
  default_upload_visibility?: "public" | "private";
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Not authenticated") };

  const { data, error } = await supabase
    .from("user_security_settings")
    .upsert({ user_id: user.id, ...settings, updated_at: new Date().toISOString() })
    .select()
    .single();

  return { data, error };
}

export async function requireStepUp(options: {
  requireMfa?: boolean;
  requireEmailOtp?: boolean;
}) {
  if (options.requireMfa) {
    const { aal } = await getAuthenticatorAssuranceLevel();
    if (aal !== "aal2") {
      return { required: true as const, method: "totp" as const };
    }
  }
  if (options.requireEmailOtp) {
    return { required: true as const, method: "email_otp" as const };
  }
  return { required: false as const };
}
