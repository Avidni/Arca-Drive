import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateFileSchema } from "@/lib/validators/files";
import { checkStepUpRequirement } from "@/lib/auth/step-up";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateFileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id, ...updates } = parsed.data;

  // Verify ownership
  const { data: existing } = await supabase
    .from("files")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  }

  if ("visibility" in updates) {
    const stepUp = await checkStepUpRequirement("change_visibility");
    if (stepUp.required) {
      return NextResponse.json({
        error: "Step-up verification required",
        stepUpRequired: true,
        allowedMethods: stepUp.allowedMethods,
        reason: stepUp.reason,
      }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from("files")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("File update error:", error);
    return NextResponse.json({ error: "Failed to update file" }, { status: 500 });
  }

  return NextResponse.json(data);
}
