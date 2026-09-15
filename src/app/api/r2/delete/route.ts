import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { deleteR2Object } from "@/lib/r2/delete";

const schema = z.object({
  r2Key: z.string().min(1).max(1024),
});

// Deletes a single R2 object owned by the caller. R2 keys are laid out as
// `${category}/${userId}/${year}/${month}/${uuid}-${name}`, so we require the
// key's user segment to match the authenticated user. This makes the endpoint
// safe to use for upload rollback (orphaned objects that have no DB row yet)
// without trusting a client-supplied key to point at someone else's data.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing or invalid r2Key" }, { status: 400 });
  }

  const { r2Key } = parsed.data;
  const segments = r2Key.split("/");
  // segments[0] = category, segments[1] = userId
  if (segments.length < 3 || segments[1] !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await deleteR2Object(r2Key);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("R2 delete error:", err);
    return NextResponse.json({ error: "Failed to delete from R2" }, { status: 500 });
  }
}
