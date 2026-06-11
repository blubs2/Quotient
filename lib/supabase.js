import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Null when env vars are missing: the app then runs in guest mode
// (everything works, nothing persists). Lets you develop before configuring.
export const supabase = url && key ? createClient(url, key) : null;
