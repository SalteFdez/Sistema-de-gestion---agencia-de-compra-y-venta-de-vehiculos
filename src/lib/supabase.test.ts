import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('supabase client configuration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('indica si Supabase está configurado o si faltan las variables de entorno', async () => {
    vi.stubEnv('PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('PUBLIC_SUPABASE_ANON_KEY', '');

    const { isSupabaseConfigured, getSupabaseClient } = await import('./supabase');

    expect(isSupabaseConfigured()).toBe(false);
    expect(getSupabaseClient()).toBeNull();
  });

  it('crea el cliente correctamente si las variables están presentes', async () => {
    vi.stubEnv('PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');

    const { isSupabaseConfigured, getSupabaseClient } = await import('./supabase');

    expect(isSupabaseConfigured()).toBe(true);
    expect(getSupabaseClient()).not.toBeNull();
  });
});
