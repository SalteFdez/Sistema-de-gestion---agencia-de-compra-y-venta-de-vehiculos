import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AsignarGastoView } from './AsignarGastoView';
import type { PendienteAsignar, VehiculoItem } from '../lib/vehiculos/vehiculos-service';

const gasto: PendienteAsignar = {
  gastoId: 'g1', fecha: '2026-11-14', categoria: 'Chapa y pintura', descripcion: 'Pintura puerta',
  montoTotal: 250000, pendiente: 100000, proveedorId: 'p1', proveedorNombre: 'Mecánico Juan',
};

const vehiculos: VehiculoItem[] = [
  { id: 'v10', codigo: 'MC-010', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-01' },
  { id: 'v12', codigo: 'MC-012', marca: 'Ford', modelo: 'Ka', anio: 2012, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-02' },
];

describe('AsignarGastoView', () => {
  it('la primera fila viene precargada con todo lo pendiente', () => {
    render(<AsignarGastoView gasto={gasto} vehiculos={vehiculos} onAsignar={vi.fn()} onVolver={vi.fn()} />);

    expect(screen.getByLabelText('Monto del vehículo')).toHaveValue('$ 100.000');
    expect(screen.getByText(/Asignado \$ 100\.000/)).toBeInTheDocument();
    expect(screen.getByText(/Queda pendiente \$ 0/)).toBeInTheDocument();
  });

  it('asignar todo confirma con las asignaciones y el pendiente que vio', () => {
    const onAsignar = vi.fn().mockResolvedValue({ success: true });
    render(<AsignarGastoView gasto={gasto} vehiculos={vehiculos} onAsignar={onAsignar} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar asignación' }));

    expect(onAsignar).toHaveBeenCalledWith({
      gastoId: 'g1',
      pendiente: 100000,
      asignaciones: [{ vehiculoId: 'v10', monto: 100000 }],
    });
  });

  it('asignar parte deja lo que falta y se puede confirmar', () => {
    const onAsignar = vi.fn().mockResolvedValue({ success: true });
    render(<AsignarGastoView gasto={gasto} vehiculos={vehiculos} onAsignar={onAsignar} onVolver={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Monto del vehículo'), { target: { value: '40000' } });

    expect(screen.getByText(/Queda pendiente \$ 60\.000/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar asignación' })).toBeEnabled();
  });

  it('si lo asignado supera lo pendiente, Confirmar queda deshabilitado', () => {
    render(<AsignarGastoView gasto={gasto} vehiculos={vehiculos} onAsignar={vi.fn()} onVolver={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Monto del vehículo'), { target: { value: '150000' } });

    expect(screen.getByText(/Sobran \$ 50\.000/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar asignación' })).toBeDisabled();
  });

  it('un monto 0 o un vehículo repetido deshabilitan Confirmar', () => {
    render(<AsignarGastoView gasto={gasto} vehiculos={vehiculos} onAsignar={vi.fn()} onVolver={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Monto del vehículo'), { target: { value: '0' } });
    expect(screen.getByRole('button', { name: 'Confirmar asignación' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Monto del vehículo'), { target: { value: '50000' } });
    fireEvent.click(screen.getByRole('button', { name: /agregar otro vehículo/i }));
    expect(screen.getByRole('button', { name: 'Confirmar asignación' })).toBeDisabled();
  });

  it('si otro socio ya asignó y no alcanza, muestra el error y deja lo cargado', async () => {
    const onAsignar = vi.fn().mockResolvedValue({
      success: false,
      error: 'El pendiente cambió: otro socio ya asignó parte de este gasto. No se asignó nada.',
    });
    render(<AsignarGastoView gasto={gasto} vehiculos={vehiculos} onAsignar={onAsignar} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar asignación' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/otro socio ya asignó/i);
    expect(screen.getByLabelText('Monto del vehículo')).toHaveValue('$ 100.000');
  });
});
