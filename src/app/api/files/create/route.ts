import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createFileSchema } from "@/lib/validators/files";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createFileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("files")
    .insert({
      ...parsed.data,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("File create error:", error);
    return NextResponse.json({ error: "Failed to create file record" }, { status: 500 });
  }

  return NextResponse.json(data);
}
