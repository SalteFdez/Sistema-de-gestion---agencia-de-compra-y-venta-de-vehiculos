import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CobrarCuotaView } from './CobrarCuotaView';
import { AsignarGastoView } from './AsignarGastoView';

const cuota = {
  cuotaId: 'q1', numero: 1, totalCuotas: 3, vehiculoCodigo: 'MC-001', comprador: 'Juan',
  saldo: 200000, fechaVencimiento: '2026-11-01',
} as any;
const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', saldo: 5000000 }];

const gasto = {
  gastoId: 'g1', fecha: '2026-11-10', categoria: 'Combustible', proveedorNombre: null, descripcion: 'Nafta',
  montoTotal: 300000, pendiente: 300000,
} as any;
const vehiculos = [
  { id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, patente: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-01' },
] as any[];

describe('CobrarCuotaView: Guardando…', () => {
  it('mientras guarda, Confirmar cobro queda deshabilitado con "Guardando…" y un segundo clic no vuelve a cobrar', () => {
    const onCobrar = vi.fn(() => new Promise<never>(() => {}));
    render(<CobrarCuotaView cuota={cuota} cuentas={cuentas} onCobrar={onCobrar} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /caja efectivo/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar cobro/i }));

    const guardando = screen.getByRole('button', { name: 'Guardando…' });
    expect(guardando).toBeDisabled();
    fireEvent.click(guardando);
    expect(onCobrar).toHaveBeenCalledTimes(1);
  });

  it('si falla, Confirmar cobro vuelve a habilitarse con su texto y el monto sigue cargado', async () => {
    const onCobrar = vi.fn().mockResolvedValue({ success: false, error: 'Sin conexión' });
    render(<CobrarCuotaView cuota={cuota} cuentas={cuentas} onCobrar={onCobrar} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /caja efectivo/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar cobro/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
    expect(screen.getByRole('button', { name: /confirmar cobro/i })).toBeEnabled();
    expect(screen.getByLabelText(/monto a cobrar/i)).toHaveValue('200000');
  });
});

describe('AsignarGastoView: Guardando…', () => {
  it('mientras guarda, Confirmar asignación queda deshabilitado con "Guardando…" y un segundo clic no vuelve a asignar', () => {
    const onAsignar = vi.fn(() => new Promise<never>(() => {}));
    render(<AsignarGastoView gasto={gasto} vehiculos={vehiculos} onAsignar={onAsignar} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /confirmar asignación/i }));

    const guardando = screen.getByRole('button', { name: 'Guardando…' });
    expect(guardando).toBeDisabled();
    fireEvent.click(guardando);
    expect(onAsignar).toHaveBeenCalledTimes(1);
  });

  it('si falla, Confirmar asignación vuelve a habilitarse con su texto', async () => {
    const onAsignar = vi.fn().mockResolvedValue({ success: false, error: 'Sin conexión' });
    render(<AsignarGastoView gasto={gasto} vehiculos={vehiculos} onAsignar={onAsignar} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /confirmar asignación/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
    expect(screen.getByRole('button', { name: /confirmar asignación/i })).toBeEnabled();
  });
});
