import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * True when real Supabase credentials are present.
 * When false the app runs entirely on mock / localStorage data.
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  supabaseAnonKey !== 'placeholder_anon_key_replace_with_real'
);

export const supabase = createClient<Database>(
  supabaseUrl      ?? 'https://placeholder.supabase.co',
  supabaseAnonKey  ?? 'placeholder_anon_key',
  {
    auth: {
      persistSession:    true,
      autoRefreshToken:  true,
      detectSessionInUrl: true,
    },
  }
);
