import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('supabase client configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('indica si Supabase está configurado o si faltan las variables de entorno', async () => {
    delete process.env.PUBLIC_SUPABASE_URL;
    delete process.env.PUBLIC_SUPABASE_ANON_KEY;

    const { isSupabaseConfigured, getSupabaseClient } = await import('./supabase');

    expect(isSupabaseConfigured()).toBe(false);
    expect(getSupabaseClient()).toBeNull();
  });

  it('crea el cliente correctamente si las variables están presentes', async () => {
    process.env.PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    const { isSupabaseConfigured, getSupabaseClient } = await import('./supabase');

    expect(isSupabaseConfigured()).toBe(true);
    expect(getSupabaseClient()).not.toBeNull();
  });
});
