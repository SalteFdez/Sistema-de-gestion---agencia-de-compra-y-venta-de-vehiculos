import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React, { useState } from 'react';
import { FilasVehiculoMonto, type FilaVehiculo } from './FilasVehiculoMonto';
import type { VehiculoItem } from '../lib/vehiculos/vehiculos-service';

const vehiculos: VehiculoItem[] = [
  { id: 'v10', codigo: 'MC-010', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-01' },
  { id: 'v12', codigo: 'MC-012', marca: 'Ford', modelo: 'Ka', anio: 2012, color: null, estado: 'vendido', fotoUrl: null, fechaIngreso: '2026-11-02' },
  { id: 'v13', codigo: 'MC-013', marca: 'VW', modelo: 'Gol', anio: 2015, color: null, estado: 'reservado', fotoUrl: null, fechaIngreso: '2026-11-03' },
];

// Envoltorio controlado para probar el componente como lo usa la pantalla
const Controlado = ({ total, onCambio }: { total: number; onCambio?: (f: FilaVehiculo[]) => void }) => {
  const [filas, setFilas] = useState<FilaVehiculo[]>([]);
  return (
    <FilasVehiculoMonto
      total={total}
      vehiculos={vehiculos}
      filas={filas}
      onChange={(nuevas) => {
        setFilas(nuevas);
        onCambio?.(nuevas);
      }}
    />
  );
};

describe('FilasVehiculoMonto', () => {
  it('agrega filas, muestra asignado y sin asignar en vivo, y avisa cuando sobra', () => {
    render(<Controlado total={300000} />);

    expect(screen.getByText(/Asignado \$ 0/)).toBeInTheDocument();
    expect(screen.getByText(/Sin asignar \$ 300\.000/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /agregar otro vehículo/i }));
    fireEvent.change(screen.getByLabelText('Vehículo'), { target: { value: 'v10' } });
    fireEvent.change(screen.getByLabelText('Monto del vehículo'), { target: { value: '250000' } });

    expect(screen.getByText(/Asignado \$ 250\.000/)).toBeInTheDocument();
    expect(screen.getByText(/Sin asignar \$ 50\.000/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /agregar otro vehículo/i }));
    const filas = screen.getAllByLabelText('Monto del vehículo');
    fireEvent.change(filas[1], { target: { value: '100000' } });

    expect(screen.getByText(/Sobran \$ 50\.000/)).toBeInTheDocument();

    fireEvent.click(within(screen.getAllByRole('listitem')[1]).getByRole('button', { name: /quitar/i }));
    expect(screen.getByText(/Sin asignar \$ 50\.000/)).toBeInTheDocument();
  });

  it('no ofrece vehículos anulados (no llegan) y los vendidos van al final y marcados', () => {
    render(<Controlado total={300000} />);

    fireEvent.click(screen.getByRole('button', { name: /agregar otro vehículo/i }));
    const opciones = within(screen.getByLabelText('Vehículo')).getAllByRole('option').map((o) => o.textContent ?? '');

    expect(opciones[0]).toMatch(/MC-010/);
    expect(opciones[opciones.length - 1]).toMatch(/MC-012.*vendido/i);
    expect(opciones.some((o) => /MC-013.*vendido/i.test(o))).toBe(false);
  });
});
