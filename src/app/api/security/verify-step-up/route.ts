import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { listMfaFactors } from "@/lib/auth/security";

const verifySchema = z.object({
  method: z.enum(["totp", "email_otp"]),
  code: z.string().min(1).max(10),
  challenge_id: z.string().optional(),
  factor_id: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { method, code, challenge_id, factor_id } = parsed.data;

    if (method === "totp") {
      let fid = factor_id;
      let cid = challenge_id;

      if (!fid) {
        const factors = await listMfaFactors();
        if (factors.totp.length === 0) {
          return NextResponse.json({ error: "No verified TOTP factor found" }, { status: 400 });
        }
        fid = factors.totp[0].id;

        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: fid,
        });

        if (challengeError) {
          return NextResponse.json({ error: "Failed to create challenge" }, { status: 500 });
        }
        cid = challenge.id;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: fid!,
        challengeId: cid!,
        code,
      });

      if (verifyError) {
        return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
      }

      return NextResponse.json({ verified: true });
    }

    if (method === "email_otp") {
      const email = user.email;
      if (!email) {
        return NextResponse.json({ error: "No email on account" }, { status: 400 });
      }

      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });

      if (verifyError) {
        return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
      }

      return NextResponse.json({ verified: true, session: !!data.session });
    }

    return NextResponse.json({ error: "Unsupported method" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
