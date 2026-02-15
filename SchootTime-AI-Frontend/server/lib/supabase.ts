import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using service role key.
 * This bypasses RLS, so NEVER expose this key to the browser.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "[server/lib/supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. " +
      "Timetable generation API will not be able to talk to the database."
  );
}

export const serverSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
});



