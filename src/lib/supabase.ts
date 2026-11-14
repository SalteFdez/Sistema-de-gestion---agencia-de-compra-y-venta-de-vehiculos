import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseAuthClient } from './auth/device-auth';

// Leemos las variables públicas desde import.meta.env (Astro/Vite)
const getEnvVar = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) {
    return import.meta.env[key];
  }
  return '';
};

const supabaseUrl = getEnvVar('PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('PUBLIC_SUPABASE_ANON_KEY');

export function isSupabaseConfigured(): boolean {
  const url = getEnvVar('PUBLIC_SUPABASE_URL') || supabaseUrl;
  const key = getEnvVar('PUBLIC_SUPABASE_ANON_KEY') || supabaseAnonKey;
  return Boolean(url && key && !url.includes('placeholder-project') && !key.includes('placeholder'));
}

let _supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    console.error('Falta configurar la conexión con el servidor (PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY no configuradas).');
    return null;
  }
  if (!_supabaseInstance) {
    const url = getEnvVar('PUBLIC_SUPABASE_URL') || supabaseUrl;
    const key = getEnvVar('PUBLIC_SUPABASE_ANON_KEY') || supabaseAnonKey;
    _supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return _supabaseInstance;
}

export const supabase = isSupabaseConfigured() ? getSupabaseClient()! : (null as unknown as SupabaseClient);

export const supabaseAuthAdapter: SupabaseAuthClient = {
  async signInWithPassword(credentials) {
    const client = getSupabaseClient();
    if (!client) {
      return {
        data: { user: null },
        error: new Error('Falta configurar la conexión con el servidor'),
      };
    }
    const { data, error } = await client.auth.signInWithPassword(credentials);
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
    const client = getSupabaseClient();
    if (!client) return null;
    try {
      const { data, error } = await client
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
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
  },
};
