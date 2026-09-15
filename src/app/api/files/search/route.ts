import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchSchema } from "@/lib/validators/files";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = searchSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid search parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { category, query, folder_id, tag_id, visibility, is_favorite, sort, page, limit } =
    parsed.data;

  let q = supabase
    .from("files")
    .select("*, file_tags(tag_id)", { count: "exact" })
    .eq("user_id", user.id);

  if (category) q = q.eq("file_type", category);
  if (folder_id !== undefined) q = q.eq("folder_id", folder_id);
  if (visibility) q = q.eq("visibility", visibility);
  if (is_favorite !== undefined) q = q.eq("is_favorite", is_favorite);
  if (tag_id) q = q.contains("file_tags", [{ tag_id }]);
  if (query) {
    q = q.or(`name.ilike.%${query}%,original_name.ilike.%${query}%`);
  }

  switch (sort) {
    case "oldest": q = q.order("created_at", { ascending: true }); break;
    case "name_az": q = q.order("name", { ascending: true }); break;
    case "largest": q = q.order("size", { ascending: false }); break;
    case "smallest": q = q.order("size", { ascending: true }); break;
    case "file_type": q = q.order("file_type"); break;
    default: q = q.order("created_at", { ascending: false });
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  q = q.range(from, to);

  const { data, count, error } = await q;

  if (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  return NextResponse.json({ files: data, total: count ?? 0, page, limit });
}
