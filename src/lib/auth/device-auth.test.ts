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

  it('falla si las credenciales de Supabase son incorrectas (invalid_credentials)', async () => {
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
    expect(result.error).toBe('Email o contraseña incorrectos');
    expect(service.isDeviceLinked()).toBe(false);
  });

  it('distingue error de red o servidor al validar credenciales y avisa revisar conexión', async () => {
    mockSupabase.signInWithPassword = vi.fn().mockResolvedValue({
      error: new Error('Failed to fetch'),
      data: { user: null },
    });

    const service = new DeviceAuthService(mockSupabase);
    const result = await service.validateCredentials('agustin@machoman.local', 'cualquiera');

    expect(result.success).toBe(false);
    expect(result.error).toBe('No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.');
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

  describe('changePin', () => {
    beforeEach(async () => {
      mockSupabase.signInWithPassword = vi.fn().mockResolvedValue({
        error: null,
        data: { user: { id: 'user-uuid-1', email: 'agustin@machoman.local' } },
      });
      mockSupabase.getUserProfile = vi.fn().mockResolvedValue({
        id: 'user-uuid-1',
        nombre: 'Agustín Fernandez',
      });
    });

    it('falla si el PIN actual es incorrecto y no cambia el PIN', async () => {
      const service = new DeviceAuthService(mockSupabase);
      await service.linkDevice({
        email: 'agustin@machoman.local',
        password: 'validPassword123',
        pin: '1234',
        confirmPin: '1234',
      });

      const result = await service.changePin({
        currentPin: '9999',
        newPin: '5678',
        confirmNewPin: '5678',
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/pin actual incorrecto/i);
      // El PIN viejo sigue siendo el válido
      expect(await service.validatePin('1234')).toBe(true);
      expect(await service.validatePin('5678')).toBe(false);
    });

    it('falla si los nuevos PINs no coinciden o no tienen 4 dígitos', async () => {
      const service = new DeviceAuthService(mockSupabase);
      await service.linkDevice({
        email: 'agustin@machoman.local',
        password: 'validPassword123',
        pin: '1234',
        confirmPin: '1234',
      });

      const mismatch = await service.changePin({
        currentPin: '1234',
        newPin: '5678',
        confirmNewPin: '9999',
      });
      expect(mismatch.success).toBe(false);
      expect(mismatch.error).toMatch(/no coinciden/i);

      const invalidLength = await service.changePin({
        currentPin: '1234',
        newPin: '56',
        confirmNewPin: '56',
      });
      expect(invalidLength.success).toBe(false);
      expect(invalidLength.error).toMatch(/4 dígitos/i);

      // El PIN viejo sigue intacto
      expect(await service.validatePin('1234')).toBe(true);
    });

    it('cambia el PIN con éxito: genera nueva sal/hash y a partir de ahí solo valida el nuevo', async () => {
      const service = new DeviceAuthService(mockSupabase);
      await service.linkDevice({
        email: 'agustin@machoman.local',
        password: 'validPassword123',
        pin: '1234',
        confirmPin: '1234',
      });

      const result = await service.changePin({
        currentPin: '1234',
        newPin: '5678',
        confirmNewPin: '5678',
      });

      expect(result.success).toBe(true);
      // El viejo ya no sirve
      expect(await service.validatePin('1234')).toBe(false);
      // El nuevo es el válido
      expect(await service.validatePin('5678')).toBe(true);
      // El usuario sigue siendo el mismo vinculado
      expect(service.getLinkedUser()?.nombre).toBe('Agustín Fernandez');
    });
  });
});
