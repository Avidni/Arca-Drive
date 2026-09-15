import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getR2Client, getBucketName } from "@/lib/r2/client";
import { checkStepUpRequirement } from "@/lib/auth/step-up";

const schema = z.object({
  file_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { file_id } = parsed.data;

    const { data: file, error: fileError } = await supabase
      .from("files")
      .select("*")
      .eq("id", file_id)
      .eq("user_id", user.id)
      .single();

    if (fileError || !file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const stepUp = await checkStepUpRequirement("signed_url");
    if (stepUp.required) {
      return NextResponse.json({
        error: "Step-up verification required",
        stepUpRequired: true,
        allowedMethods: stepUp.allowedMethods,
        reason: stepUp.reason,
      }, { status: 403 });
    }

    const client = getR2Client();
    const bucket = getBucketName();

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: file.r2_key,
    });

    const signedUrl = await getSignedUrl(client, command, { expiresIn: 900 });

    const expiresAt = new Date(Date.now() + 900 * 1000).toISOString();

    return NextResponse.json({
      signedUrl,
      expiresIn: 900,
      expiresAt,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
