import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";

const { SUPABASE_URL, SUPABASE_ANON_KEY } = getPublicEnv();

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
