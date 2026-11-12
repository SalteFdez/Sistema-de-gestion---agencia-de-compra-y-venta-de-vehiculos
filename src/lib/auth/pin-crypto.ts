/**
 * Módulo de funciones criptográficas para el PIN.
 * Utiliza WebCrypto nativo (disponible en navegadores modernos y Node 20+).
 */

export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${pin}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPin(pin: string, salt: string, expectedHash: string): Promise<boolean> {
  const computedHash = await hashPin(pin, salt);
  return computedHash === expectedHash;
}
