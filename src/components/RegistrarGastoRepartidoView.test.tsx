import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { RegistrarGastoView } from './RegistrarGastoView';
import type { CuentaItem } from '../lib/cuentas/cuentas-service';
import type { VehiculoItem } from '../lib/vehiculos/vehiculos-service';

const cuentas = [
  { id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo', saldo: 3000000 },
  { id: 'c2', nombre: 'Banco', tipo: 'banco', saldo: 1500000 },
] as unknown as CuentaItem[];

const categorias = [{ id: 'cat1', nombre: 'Chapa y pintura' }];

const vehiculos: VehiculoItem[] = [
  { id: 'v10', codigo: 'MC-010', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-01' },
  { id: 'v12', codigo: 'MC-012', marca: 'Ford', modelo: 'Ka', anio: 2012, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-02' },
];

const abrirVarios = () => {
  fireEvent.click(screen.getByRole('button', { name: /varios vehículos/i }));
};

const llenarBasico = () => {
  fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '300000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Chapa y pintura' }));
  fireEvent.click(screen.getByRole('button', { name: /caja efectivo/i }));
};

describe('RegistrarGastoView: Varios vehículos', () => {
  it('confirma el reparto con cada vehículo y monto, y dice cuánto queda sin asignar', async () => {
    const onRegistrarRepartido = vi.fn().mockResolvedValue({ success: true });
    render(
      <RegistrarGastoView
        categorias={categorias}
        cuentas={cuentas}
        vehiculos={vehiculos}
        onVolver={vi.fn()}
        onRegistrarRepartido={onRegistrarRepartido}
      />
    );

    llenarBasico();
    abrirVarios();
    fireEvent.click(screen.getByRole('button', { name: /agregar otro vehículo/i }));
    fireEvent.change(screen.getByLabelText('Vehículo'), { target: { value: 'v10' } });
    fireEvent.change(screen.getAllByLabelText('Monto del vehículo')[0], { target: { value: '250000' } });
    fireEvent.click(screen.getByRole('button', { name: /agregar otro vehículo/i }));
    fireEvent.change(screen.getAllByLabelText('Vehículo')[1], { target: { value: 'v12' } });
    fireEvent.change(screen.getAllByLabelText('Monto del vehículo')[1], { target: { value: '50000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(onRegistrarRepartido).toHaveBeenCalledWith(
      expect.objectContaining({
        monto: 300000,
        asignaciones: [
          { vehiculoId: 'v10', monto: 250000 },
          { vehiculoId: 'v12', monto: 50000 },
        ],
      })
    );
    expect(await screen.findByText(/Gasto de \$ 300\.000 · Chapa y pintura · \$ 250\.000 a MC-010, \$ 50\.000 a MC-012/)).toBeInTheDocument();
  });

  it('con sobrante, Confirmar queda deshabilitado', () => {
    render(
      <RegistrarGastoView categorias={categorias} cuentas={cuentas} vehiculos={vehiculos} onVolver={vi.fn()} onRegistrarRepartido={vi.fn()} />
    );

    llenarBasico();
    abrirVarios();
    fireEvent.click(screen.getByRole('button', { name: /agregar otro vehículo/i }));
    fireEvent.change(screen.getAllByLabelText('Monto del vehículo')[0], { target: { value: '400000' } });

    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
  });

  it('sin ningún vehículo se puede confirmar: el gasto queda sin asignar', async () => {
    const onRegistrarRepartido = vi.fn().mockResolvedValue({ success: true });
    render(
      <RegistrarGastoView categorias={categorias} cuentas={cuentas} vehiculos={vehiculos} onVolver={vi.fn()} onRegistrarRepartido={onRegistrarRepartido} />
    );

    llenarBasico();
    abrirVarios();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(onRegistrarRepartido).toHaveBeenCalledWith(expect.objectContaining({ asignaciones: [] }));
    expect(await screen.findByText(/Quedan \$ 300\.000 sin asignar/)).toBeInTheDocument();
  });
});
