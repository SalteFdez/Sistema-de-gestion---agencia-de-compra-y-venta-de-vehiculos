import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { RegistrarGastoView } from './RegistrarGastoView';

const cuentas = [
  { id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 },
  { id: 'c2', nombre: 'Banco', tipo: 'banco' as const, saldo: 5000000 },
];
const categorias = [{ id: 'k1', nombre: 'Combustible' }];
const vehiculos = [
  { id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-01' },
] as any[];

describe('Registrar gasto: Cargar otro', () => {
  it('después de confirmar, "Cargar otro" vuelve al formulario vacío con la misma cuenta, y el servicio se llamó una sola vez', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({ success: true });
    render(<RegistrarGastoView categorias={categorias} cuentas={cuentas} onVolver={vi.fn()} onIrACuentas={vi.fn()} onRegistrar={onRegistrar} />);

    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '100000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Combustible' }));
    fireEvent.click(screen.getByRole('button', { name: /banco/i }));
    fireEvent.click(screen.getByRole('button', { name: /general del negocio/i }));
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    expect(await screen.findByRole('button', { name: /cargar otro/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cargar otro/i }));

    expect(screen.getByLabelText(/monto/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: /banco/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Combustible' })).toHaveAttribute('aria-pressed', 'false');
    expect(onRegistrar).toHaveBeenCalledTimes(1);
  });

  it('si el gasto venía de un auto, "Cargar otro" conserva ese auto', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({ success: true, vehiculoCodigo: 'MC-001' });
    render(
      <RegistrarGastoView
        categorias={categorias}
        cuentas={cuentas}
        vehiculos={vehiculos}
        vehiculoPreseleccionado="v1"
        onVolver={vi.fn()}
        onIrACuentas={vi.fn()}
        onRegistrar={onRegistrar}
      />
    );

    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '50000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Combustible' }));
    fireEvent.click(screen.getByRole('button', { name: /caja efectivo/i }));
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /cargar otro/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /cargar otro/i }));

    expect(screen.getByRole('button', { name: /un vehículo/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('MC-001')).toBeInTheDocument();
  });
});
