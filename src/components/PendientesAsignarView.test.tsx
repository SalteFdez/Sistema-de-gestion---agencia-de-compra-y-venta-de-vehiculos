import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import React from 'react';
import { PendientesAsignarView } from './PendientesAsignarView';
import type { PendientesResult } from '../lib/vehiculos/vehiculos-service';

const conDatos: PendientesResult = {
  total: 190000,
  grupos: [
    {
      proveedorId: 'p1',
      proveedorNombre: 'Mecánico Juan',
      subtotal: 160000,
      gastos: [
        { gastoId: 'g1', fecha: '2026-11-14', categoria: 'Chapa y pintura', descripcion: 'Pintura puerta', montoTotal: 250000, pendiente: 100000, proveedorId: 'p1', proveedorNombre: 'Mecánico Juan' },
        { gastoId: 'g2', fecha: '2026-11-13', categoria: 'Mecánica', descripcion: null, montoTotal: 60000, pendiente: 60000, proveedorId: 'p1', proveedorNombre: 'Mecánico Juan' },
      ],
    },
    {
      proveedorId: null,
      proveedorNombre: 'Sin proveedor',
      subtotal: 30000,
      gastos: [
        { gastoId: 'g3', fecha: '2026-11-12', categoria: 'Varios', descripcion: 'Estacionamiento', montoTotal: 30000, pendiente: 30000, proveedorId: null, proveedorNombre: null },
      ],
    },
  ],
};

describe('PendientesAsignarView', () => {
  it('agrupa por proveedor con su subtotal, y los sin proveedor van en su grupo', () => {
    render(<PendientesAsignarView pendientes={conDatos} onAsignar={vi.fn()} onVolver={vi.fn()} />);

    const grupoJuan = screen.getByRole('heading', { name: /Mecánico Juan/ }).closest('section') as HTMLElement;
    expect(within(grupoJuan).getByText(/\$ 160\.000/)).toBeInTheDocument();
    expect(within(grupoJuan).getAllByRole('button')).toHaveLength(2);

    const grupoSin = screen.getByRole('heading', { name: 'Sin proveedor' }).closest('section') as HTMLElement;
    expect(within(grupoSin).getByRole('heading', { name: 'Sin proveedor' })).toBeInTheDocument();
    expect(within(grupoSin).getAllByText('$ 30.000').length).toBeGreaterThanOrEqual(1);
  });

  it('cada gasto muestra fecha, categoría, descripción, total y cuánto falta asignar', () => {
    render(<PendientesAsignarView pendientes={conDatos} onAsignar={vi.fn()} onVolver={vi.fn()} />);

    const tarjeta = screen.getByRole('button', { name: /Pintura puerta/ });
    expect(tarjeta).toHaveTextContent('14/11/2026');
    expect(tarjeta).toHaveTextContent('Chapa y pintura');
    expect(tarjeta).toHaveTextContent('$ 250.000');
    expect(tarjeta).toHaveTextContent('Falta asignar $ 100.000');
  });

  it('tocar un gasto lo abre para asignar', () => {
    const onAsignar = vi.fn();
    render(<PendientesAsignarView pendientes={conDatos} onAsignar={onAsignar} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Pintura puerta/ }));

    expect(onAsignar).toHaveBeenCalledWith(expect.objectContaining({ gastoId: 'g1', pendiente: 100000 }));
  });

  it('sin pendientes dice que no hay gastos pendientes de asignar', () => {
    render(
      <PendientesAsignarView pendientes={{ grupos: [], total: 0 }} onAsignar={vi.fn()} onVolver={vi.fn()} />
    );

    expect(screen.getByText('No hay gastos pendientes de asignar')).toBeInTheDocument();
  });
});
