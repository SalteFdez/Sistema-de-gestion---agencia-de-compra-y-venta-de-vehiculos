import { createClient } from '@supabase/supabase-js';
import type { SupabaseAuthClient } from './auth/device-auth';

// Leemos las variables públicas según Vite/Astro
const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.PUBLIC_SUPABASE_URL) ||
  'https://placeholder-project.supabase.co';

const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.PUBLIC_SUPABASE_ANON_KEY) ||
  'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const supabaseAuthAdapter: SupabaseAuthClient = {
  async signInWithPassword(credentials) {
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    return {
      data: {
        user: data.user
          ? {
              id: data.user.id,
              email: data.user.email,
            }
          : null,
      },
      error: error ? new Error(error.message) : null,
    };
  },

  async getUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) {
        return null;
      }
      return data as { id: string; nombre: string };
    } catch {
      return null;
    }
  },

  async signOut() {
    await supabase.auth.signOut();
  },
};
