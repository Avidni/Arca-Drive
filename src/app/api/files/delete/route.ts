import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteR2Object } from "@/lib/r2/delete";
import { deleteFileSchema } from "@/lib/validators/files";
import { checkStepUpRequirement } from "@/lib/auth/step-up";

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = deleteFileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id } = parsed.data;

  // Verify ownership and get R2 key
  const { data: file } = await supabase
    .from("files")
    .select("user_id, r2_key")
    .eq("id", id)
    .single();

  if (!file || file.user_id !== user.id) {
    return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  }

  const stepUp = await checkStepUpRequirement("delete_file");
  if (stepUp.required) {
    return NextResponse.json({
      error: "Step-up verification required",
      stepUpRequired: true,
      allowedMethods: stepUp.allowedMethods,
      reason: stepUp.reason,
    }, { status: 403 });
  }

  // Delete from R2
  try {
    await deleteR2Object(file.r2_key);
  } catch (err) {
    console.error("R2 delete error:", err);
    // Continue with metadata deletion even if R2 fails
  }

  // Delete metadata (file_tags cascade)
  const { error: dbError } = await supabase.from("files").delete().eq("id", id);

  if (dbError) {
    console.error("DB delete error:", dbError);
    return NextResponse.json({ error: "Failed to delete file record" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
