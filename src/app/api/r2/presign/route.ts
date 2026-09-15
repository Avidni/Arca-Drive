import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePresignedUploadUrl } from "@/lib/r2/presign";
import { presignSchema } from "@/lib/validators/files";
import { limitsFromSettings, UPLOAD_LIMIT_COLUMNS } from "@/lib/upload-limits";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = presignSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { category, fileName, fileSize, mimeType } = parsed.data;

  const allowedMimePrefixes: Record<string, string[]> = {
    image: ["image/"],
    video: ["video/"],
    document: ["application/", "text/"],
    files: ["application/"],
  };

  const allowed = allowedMimePrefixes[category];
  const isValid = allowed?.some((prefix) => mimeType.startsWith(prefix));
  if (!isValid) {
    return NextResponse.json(
      { error: `Invalid MIME type for category ${category}` },
      { status: 400 }
    );
  }

  // Enforce upload size limit server-side (client-side dropzone check is UX only,
  // and can be bypassed by calling this endpoint directly). Limits are the
  // user's configured Settings values; defaults apply until they change them.
  const { data: settingsRow } = await supabase
    .from("user_security_settings")
    .select(Object.values(UPLOAD_LIMIT_COLUMNS).join(","))
    .eq("user_id", user.id)
    .maybeSingle();

  const limitMb = limitsFromSettings(settingsRow as Record<string, unknown> | null)[category];
  const maxBytes = limitMb * 1024 * 1024;
  if (fileSize > maxBytes) {
    return NextResponse.json(
      { error: `File exceeds ${limitMb} MB limit for ${category}` },
      { status: 413 }
    );
  }

  try {
    const result = await generatePresignedUploadUrl({
      category,
      userId: user.id,
      fileName,
      mimeType,
      fileSize,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Presign error:", err);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
