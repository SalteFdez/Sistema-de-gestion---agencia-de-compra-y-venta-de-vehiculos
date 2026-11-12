import { describe, it, expect } from 'vitest';
import { generateSalt, hashPin, verifyPin } from './pin-crypto';

describe('pin-crypto', () => {
  it('genera una sal aleatoria en formato hex', () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();

    expect(salt1).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(salt2).toHaveLength(32);
    expect(salt1).not.toBe(salt2);
  });

  it('hashea un PIN de 4 dígitos con sal usando SHA-256', async () => {
    const pin = '1234';
    const salt = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

    const hash = await hashPin(pin, salt);

    expect(typeof hash).toBe('string');
    expect(hash).toHaveLength(64); // SHA-256 en hex son 64 caracteres
    // Determinístico con la misma sal
    const hashSame = await hashPin(pin, salt);
    expect(hash).toBe(hashSame);

    // Distinto con distinta sal o distinto pin
    const hashDiffPin = await hashPin('4321', salt);
    expect(hash).not.toBe(hashDiffPin);
  });

  it('verifica correctamente un PIN válido e invalida uno incorrecto', async () => {
    const pin = '5678';
    const salt = generateSalt();
    const validHash = await hashPin(pin, salt);

    const isMatch = await verifyPin(pin, salt, validHash);
    expect(isMatch).toBe(true);

    const isWrong = await verifyPin('9999', salt, validHash);
    expect(isWrong).toBe(false);
  });
});
