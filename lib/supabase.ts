import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

let supabaseClient: SupabaseClient | null = null;

export function createClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  supabaseClient ??= createSupabaseClient(supabaseUrl, supabaseKey);

  return supabaseClient;
}
