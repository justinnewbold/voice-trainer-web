import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Guard: if env vars aren't set, supabase calls will fail gracefully
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,       // for magic link / OAuth redirects
        storageKey: 'vt_supabase_auth',  // namespaced to avoid collisions
      },
    })
  : null;

/**
 * Returns true if Supabase is configured and available.
 * Use this before any supabase call to fall back to localStorage gracefully.
 */
export function isSupabaseConfigured() {
  return supabase !== null;
}
