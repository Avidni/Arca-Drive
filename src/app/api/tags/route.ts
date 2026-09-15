import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTagSchema, deleteTagSchema, addFileTagSchema, removeFileTagSchema } from "@/lib/validators/files";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("user_id", user.id)
    .order("name");

  if (error) {
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Check if it's a file-tag association
  if (body.file_id && body.tag_id) {
    const parsed = addFileTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { data, error } = await supabase.from("file_tags").insert(parsed.data).select();
    if (error) return NextResponse.json({ error: "Failed to add tag" }, { status: 500 });
    return NextResponse.json(data);
  }

  // Create tag
  const parsed = createTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tags")
    .insert({ name: parsed.data.name, user_id: user.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create tag" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Check if it's a file-tag removal
  if (body.file_id && body.tag_id) {
    const parsed = removeFileTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { error } = await supabase
      .from("file_tags")
      .delete()
      .eq("file_id", parsed.data.file_id)
      .eq("tag_id", parsed.data.tag_id);
    if (error) return NextResponse.json({ error: "Failed to remove tag" }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Delete entire tag
  const parsed = deleteTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("tags")
    .select("user_id")
    .eq("id", parsed.data.id)
    .single();

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase.from("tags").delete().eq("id", parsed.data.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
