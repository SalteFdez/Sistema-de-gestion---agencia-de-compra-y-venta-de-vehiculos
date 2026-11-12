import { generateSalt, hashPin, verifyPin } from './pin-crypto';

export interface LinkedUser {
  id: string;
  email: string;
  nombre: string;
}

interface StoredDeviceAuth {
  salt: string;
  pinHash: string;
  user: LinkedUser;
}

export interface LinkDeviceParams {
  email: string;
  password: string;
  pin: string;
  confirmPin: string;
}

export interface LinkDeviceResult {
  success: boolean;
  error?: string;
  user?: LinkedUser;
}

export interface ChangePinParams {
  currentPin: string;
  newPin: string;
  confirmNewPin: string;
}

export interface ChangePinResult {
  success: boolean;
  error?: string;
}

export interface SupabaseAuthClient {
  signInWithPassword: (credentials: { email: string; password: string }) => Promise<{
    data: { user: { id: string; email?: string } | null };
    error: Error | null;
  }>;
  getUserProfile: (userId: string) => Promise<{ id: string; nombre: string } | null>;
  signOut: () => Promise<void>;
}

const STORAGE_KEY = 'machoman_device_auth';

export class DeviceAuthService {
  private supabase: SupabaseAuthClient;
  private storageKey: string;

  constructor(supabase: SupabaseAuthClient, storageKey = STORAGE_KEY) {
    this.supabase = supabase;
    this.storageKey = storageKey;
  }

  isDeviceLinked(): boolean {
    return this.getStoredData() !== null;
  }

  getLinkedUser(): LinkedUser | null {
    const data = this.getStoredData();
    return data ? data.user : null;
  }

  private getStoredData(): StoredDeviceAuth | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as StoredDeviceAuth;
    } catch {
      return null;
    }
  }

  async linkDevice(params: LinkDeviceParams): Promise<LinkDeviceResult> {
    const { email, password, pin, confirmPin } = params;

    // Validación de formato de PIN
    if (!/^\d{4}$/.test(pin) || !/^\d{4}$/.test(confirmPin)) {
      return { success: false, error: 'El PIN debe tener exactamente 4 dígitos' };
    }

    // Validación de coincidencia
    if (pin !== confirmPin) {
      return { success: false, error: 'Los PINes no coinciden' };
    }

    // Login en Supabase
    const { data, error } = await this.supabase.signInWithPassword({ email, password });
    if (error || !data.user) {
      return { success: false, error: 'Credenciales incorrectas' };
    }

    // Perfil del socio
    const profile = await this.supabase.getUserProfile(data.user.id);
    const nombre = profile?.nombre || email.split('@')[0];

    const linkedUser: LinkedUser = {
      id: data.user.id,
      email: data.user.email || email,
      nombre,
    };

    // Hashear PIN con sal y almacenar
    const salt = generateSalt();
    const pinHash = await hashPin(pin, salt);

    const stored: StoredDeviceAuth = {
      salt,
      pinHash,
      user: linkedUser,
    };

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(stored));
    }

    return { success: true, user: linkedUser };
  }

  async validatePin(pin: string): Promise<boolean> {
    const data = this.getStoredData();
    if (!data) return false;
    return verifyPin(pin, data.salt, data.pinHash);
  }

  async changePin(params: ChangePinParams): Promise<ChangePinResult> {
    const { currentPin, newPin, confirmNewPin } = params;

    const stored = this.getStoredData();
    if (!stored) {
      return { success: false, error: 'Dispositivo no vinculado' };
    }

    // 1. Validar PIN actual
    const isCurrentValid = await verifyPin(currentPin, stored.salt, stored.pinHash);
    if (!isCurrentValid) {
      return { success: false, error: 'PIN actual incorrecto' };
    }

    // 2. Validar formato de nuevo PIN
    if (!/^\d{4}$/.test(newPin) || !/^\d{4}$/.test(confirmNewPin)) {
      return { success: false, error: 'El nuevo PIN debe tener exactamente 4 dígitos' };
    }

    // 3. Validar coincidencia
    if (newPin !== confirmNewPin) {
      return { success: false, error: 'Los nuevos PINes no coinciden' };
    }

    // 4. Generar nueva sal y nuevo hash
    const newSalt = generateSalt();
    const newPinHash = await hashPin(newPin, newSalt);

    const updated: StoredDeviceAuth = {
      salt: newSalt,
      pinHash: newPinHash,
      user: stored.user,
    };

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(updated));
    }

    return { success: true };
  }

  async unlinkDevice(): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
    await this.supabase.signOut();
  }
}
