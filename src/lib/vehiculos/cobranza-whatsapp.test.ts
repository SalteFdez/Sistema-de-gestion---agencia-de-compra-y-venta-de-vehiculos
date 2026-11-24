import { describe, it, expect } from 'vitest';
import { linkWhatsApp, mensajeCuota } from './cobranza-whatsapp';
import type { CuotaPorCobrar } from './vehiculos-service';

const cuotaBase: CuotaPorCobrar = {
  cuotaId: 'cu1',
  ventaId: 'ven1',
  numero: 2,
  totalCuotas: 4,
  monto: 500000,
  cobrado: 0,
  saldo: 500000,
  estado: 'pendiente',
  vencimiento: '2026-12-15',
  vehiculoCodigo: 'MC-014',
  comprador: 'Juan Pérez',
  compradorTelefono: '11 1234 5678',
};

describe('linkWhatsApp', () => {
  it('arma el link de wa.me con 549 y el número de 10 dígitos', () => {
    expect(linkWhatsApp('1112345678', 'Hola')).toBe('https://wa.me/5491112345678?text=Hola');
  });

  it('codifica el mensaje para la URL (espacios y tildes)', () => {
    expect(linkWhatsApp('3874123456', 'Hola Juan Pérez')).toBe(
      'https://wa.me/5493874123456?text=Hola%20Juan%20P%C3%A9rez'
    );
  });
});

describe('mensajeCuota', () => {
  it('una cuota sin cobrar dice el monto completo, la cuota de cuántas y la fecha dd/mm', () => {
    expect(mensajeCuota(cuotaBase)).toBe(
      'Hola Juan Pérez, te escribo por la cuota 2 de 4 de $ 500.000 que vence el 15/12'
    );
  });

  it('una cuota parcial dice lo que falta cobrar (el saldo), no el monto', () => {
    const parcial: CuotaPorCobrar = { ...cuotaBase, cobrado: 200000, saldo: 300000, estado: 'parcial' };

    expect(mensajeCuota(parcial)).toBe(
      'Hola Juan Pérez, te escribo por la cuota 2 de 4 de $ 300.000 que vence el 15/12'
    );
  });
});
