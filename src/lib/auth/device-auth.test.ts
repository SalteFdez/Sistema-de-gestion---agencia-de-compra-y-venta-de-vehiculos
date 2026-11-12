import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeviceAuthService, type SupabaseAuthClient } from './device-auth';

describe('DeviceAuthService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockSupabase: SupabaseAuthClient = {
    signInWithPassword: vi.fn(),
    getUserProfile: vi.fn(),
    signOut: vi.fn(),
  };

  it('indica que el dispositivo no está vinculado inicialmente', () => {
    const service = new DeviceAuthService(mockSupabase);
    expect(service.isDeviceLinked()).toBe(false);
    expect(service.getLinkedUser()).toBeNull();
  });

  it('falla si los dos PINs ingresados no coinciden', async () => {
    const service = new DeviceAuthService(mockSupabase);
    const result = await service.linkDevice({
      email: 'agustin@machoman.local',
      password: 'secretPassword123',
      pin: '1234',
      confirmPin: '9999',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/los pines no coinciden/i);
    expect(service.isDeviceLinked()).toBe(false);
  });

  it('falla si el PIN no tiene exactamente 4 dígitos', async () => {
    const service = new DeviceAuthService(mockSupabase);
    const result = await service.linkDevice({
      email: 'agustin@machoman.local',
      password: 'secretPassword123',
      pin: '123',
      confirmPin: '123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/4 dígitos/i);
  });

  it('falla si las credenciales de Supabase son incorrectas', async () => {
    mockSupabase.signInWithPassword = vi.fn().mockResolvedValue({
      error: new Error('Invalid login credentials'),
      data: { user: null },
    });

    const service = new DeviceAuthService(mockSupabase);
    const result = await service.linkDevice({
      email: 'agustin@machoman.local',
      password: 'wrongPassword',
      pin: '1234',
      confirmPin: '1234',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/credenciales incorrectas/i);
    expect(service.isDeviceLinked()).toBe(false);
  });

  it('vincula exitosamente guardando el hash del PIN (nunca en plano) y datos del socio', async () => {
    mockSupabase.signInWithPassword = vi.fn().mockResolvedValue({
      error: null,
      data: { user: { id: 'user-uuid-1', email: 'agustin@machoman.local' } },
    });
    mockSupabase.getUserProfile = vi.fn().mockResolvedValue({
      id: 'user-uuid-1',
      nombre: 'Agustín Fernandez',
    });

    const service = new DeviceAuthService(mockSupabase);
    const result = await service.linkDevice({
      email: 'agustin@machoman.local',
      password: 'validPassword123',
      pin: '1234',
      confirmPin: '1234',
    });

    expect(result.success).toBe(true);
    expect(service.isDeviceLinked()).toBe(true);

    const user = service.getLinkedUser();
    expect(user?.nombre).toBe('Agustín Fernandez');

    // Comprobamos que el PIN no está guardado en texto plano en localStorage
    const allStored = JSON.stringify(localStorage);
    expect(allStored).not.toContain('1234');
    expect(allStored).not.toContain('validPassword123');
  });

  it('verifica el PIN ingresado con éxito', async () => {
    mockSupabase.signInWithPassword = vi.fn().mockResolvedValue({
      error: null,
      data: { user: { id: 'user-uuid-1', email: 'agustin@machoman.local' } },
    });
    mockSupabase.getUserProfile = vi.fn().mockResolvedValue({
      id: 'user-uuid-1',
      nombre: 'Agustín Fernandez',
    });

    const service = new DeviceAuthService(mockSupabase);
    await service.linkDevice({
      email: 'agustin@machoman.local',
      password: 'validPassword123',
      pin: '1234',
      confirmPin: '1234',
    });

    const isValid = await service.validatePin('1234');
    expect(isValid).toBe(true);

    const isInvalid = await service.validatePin('0000');
    expect(isInvalid).toBe(false);
  });

  it('olvidé el PIN (unlink) borra credenciales locales y sesión', async () => {
    mockSupabase.signInWithPassword = vi.fn().mockResolvedValue({
      error: null,
      data: { user: { id: 'user-uuid-1' } },
    });
    mockSupabase.getUserProfile = vi.fn().mockResolvedValue({
      id: 'user-uuid-1',
      nombre: 'Agustín Fernandez',
    });
    mockSupabase.signOut = vi.fn().mockResolvedValue(undefined);

    const service = new DeviceAuthService(mockSupabase);
    await service.linkDevice({
      email: 'agustin@machoman.local',
      password: 'validPassword123',
      pin: '1234',
      confirmPin: '1234',
    });

    await service.unlinkDevice();

    expect(service.isDeviceLinked()).toBe(false);
    expect(service.getLinkedUser()).toBeNull();
    expect(mockSupabase.signOut).toHaveBeenCalled();
  });
});
