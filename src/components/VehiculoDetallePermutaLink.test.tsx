import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import React from 'react';
import { VehiculoDetalleView } from './VehiculoDetalleView';
import type { DetalleVehiculo } from '../lib/vehiculos/vehiculos-service';

const enPermuta: DetalleVehiculo = {
  id: 'v31',
  codigo: 'MC-031',
  marca: 'Honda',
  modelo: '110cc',
  anio: 2015,
  color: null,
  patente: null,
  estado: 'en_stock',
  origen: 'permuta',
  fechaIngreso: '2026-11-17',
  vendedor: 'Pedro',
  valorIngreso: 1000000,
  gastosAsignados: 0,
  costoReal: 1000000,
  pagos: [],
  venta: null,
  gastos: [],
  permutaDeVenta: 'MC-014',
  permutaDeVentaId: 'v14',
};

describe('VehiculoDetalleView: permuta con link a la venta de origen', () => {
  it('en Datos, el origen dice "Permuta en la venta de MC-014" como link al auto vendido', () => {
    const onVerRecibido = vi.fn();
    render(<VehiculoDetalleView detalle={enPermuta} fotoUrl={null} onVolver={vi.fn()} onVerRecibido={onVerRecibido} />);

    const datos = screen.getByRole('heading', { name: 'Datos' }).closest('details') as HTMLElement;
    const link = within(datos).getByRole('button', { name: 'Permuta en la venta de MC-014' });
    fireEvent.click(link);

    expect(onVerRecibido).toHaveBeenCalledWith('v14');
  });

  it('el aviso de permuta aparece una sola vez, dentro de Datos', () => {
    render(<VehiculoDetalleView detalle={enPermuta} fotoUrl={null} onVolver={vi.fn()} onVerRecibido={vi.fn()} />);

    expect(screen.getAllByText('Permuta en la venta de MC-014')).toHaveLength(1);
  });

  it('sin id de la venta, el origen es solo texto, sin link', () => {
    render(
      <VehiculoDetalleView
        detalle={{ ...enPermuta, permutaDeVentaId: null }}
        fotoUrl={null}
        onVolver={vi.fn()}
        onVerRecibido={vi.fn()}
      />
    );

    const datos = screen.getByRole('heading', { name: 'Datos' }).closest('details') as HTMLElement;
    expect(within(datos).getByText('Permuta en la venta de MC-014')).toBeVisible();
    expect(within(datos).queryByRole('button', { name: 'Permuta en la venta de MC-014' })).not.toBeInTheDocument();
  });
});
