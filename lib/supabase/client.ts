import { createBrowserClient } from "@supabase/ssr";
import { supabaseUrl, supabaseKey, isConfigured } from "./config";
let client: ReturnType<typeof createBrowserClient> | undefined;
export function getSupabase() {
  if (!isConfigured)
    throw new Error(
      "Supabase is not configured. Add the project URL and publishable key to .env.local.",
    );
  return (client ??= createBrowserClient(supabaseUrl, supabaseKey));
}
