import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { MIN_UPLOAD_LIMIT_MB, MAX_UPLOAD_LIMIT_MB } from "@/lib/upload-limits";

const uploadLimit = z
  .number()
  .int()
  .min(MIN_UPLOAD_LIMIT_MB)
  .max(MAX_UPLOAD_LIMIT_MB)
  .optional();

const upsertSchema = z.object({
  require_mfa_for_sensitive_actions: z.boolean().optional(),
  require_mfa_for_private_files: z.boolean().optional(),
  require_email_otp_for_sensitive_actions: z.boolean().optional(),
  default_upload_visibility: z.enum(["public", "private"]).optional(),
  max_image_upload_mb: uploadLimit,
  max_video_upload_mb: uploadLimit,
  max_document_upload_mb: uploadLimit,
  max_files_upload_mb: uploadLimit,
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_security_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
    }

    if (!data) {
      const { data: newData, error: insertError } = await supabase
        .from("user_security_settings")
        .insert({ user_id: user.id })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ error: "Failed to create settings" }, { status: 500 });
      }

      return NextResponse.json(newData);
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("user_security_settings")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      const { data: newData, error: insertError } = await supabase
        .from("user_security_settings")
        .insert({ user_id: user.id, ...parsed.data })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
      }

      return NextResponse.json(newData);
    }

    const { data, error } = await supabase
      .from("user_security_settings")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
