import { createClient } from "@/lib/supabase/server";
import { listMfaFactors, getAuthenticatorAssuranceLevel, getUserSecuritySettings } from "./security";

export type StepUpRequirement = {
  required: true;
  allowedMethods: ("totp" | "email_otp")[];
  reason: string;
} | {
  required: false;
};

export async function checkStepUpRequirement(
  action: "delete_file" | "view_private" | "signed_url" | "change_security" | "change_visibility"
): Promise<StepUpRequirement> {
  const settings = await getUserSecuritySettings();
  if (!settings) return { required: false };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { required: false };

  let needsMfa = false;
  let needsEmailOtp = false;
  let reason = "";

  if (action === "delete_file" || action === "change_security" || action === "change_visibility") {
    if (settings.require_mfa_for_sensitive_actions) {
      needsMfa = true;
      reason = "Sensitive action requires additional verification.";
    }
    if (settings.require_email_otp_for_sensitive_actions) {
      needsEmailOtp = true;
      reason = "Sensitive action requires email verification.";
    }
  }

  if (action === "view_private" || action === "signed_url") {
    if (settings.require_mfa_for_private_files) {
      needsMfa = true;
      reason = "Viewing private files requires additional verification.";
    }
  }

  if (!needsMfa && !needsEmailOtp) return { required: false };

  // If user already has AAL2 (verified TOTP this session), skip MFA step-up
  if (needsMfa) {
    const { aal } = await getAuthenticatorAssuranceLevel();
    if (aal === "aal2") {
      needsMfa = false;
    }
  }

  // If email OTP is required, check if user just verified via email OTP
  // (verifyOtp creates a new session with a fresh auth_time in the JWT)
  if (needsEmailOtp) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      try {
        const base64 = session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        const authTime = payload.auth_time as number | undefined;
        if (authTime && (Math.floor(Date.now() / 1000) - authTime) <= 300) {
          needsEmailOtp = false;
        }
      } catch {
        // JWT decode error — safe default is to require verification
      }
    }
  }

  if (!needsMfa && !needsEmailOtp) return { required: false };

  const allowedMethods: ("totp" | "email_otp")[] = [];
  if (needsMfa) {
    const factors = await listMfaFactors();
    if (factors.totp.length > 0) allowedMethods.push("totp");
  }
  if (needsEmailOtp) {
    allowedMethods.push("email_otp");
  }

  if (allowedMethods.length === 0) return { required: false };

  return { required: true, allowedMethods, reason };
}
