import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import React from 'react';
import { VehiculoDetalleView } from './VehiculoDetalleView';
import type { DetalleVehiculo } from '../lib/vehiculos/vehiculos-service';

const recibido: DetalleVehiculo = {
  id: 'v31', codigo: 'MC-031', marca: 'Honda', modelo: '110cc', anio: 2015, color: null, patente: null,
  estado: 'en_stock', origen: 'permuta', fechaIngreso: '2026-11-17', vendedor: 'Pedro',
  valorIngreso: 1000000, gastosAsignados: 0, costoReal: 1000000, pagos: [], venta: null, gastos: [],
  permutaDeVenta: 'MC-014',
};

describe('VehiculoDetalleView: permutas', () => {
  it('un recibido dice de qué venta entró y no ofrece "Anular alta"', () => {
    render(
      <VehiculoDetalleView detalle={recibido} fotoUrl={null} onVolver={vi.fn()} onAnularVehiculo={vi.fn()} />
    );

    expect(screen.getByText('Permuta en la venta de MC-014')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /anular/i })).not.toBeInTheDocument();
  });

  it('la venta lista cada permuta en "Cómo se cobró" y tocarla lleva a ese auto', () => {
    const onVerRecibido = vi.fn();
    const vendido: DetalleVehiculo = {
      ...recibido,
      id: 'v14', codigo: 'MC-014', origen: 'compra', estado: 'vendido', valorIngreso: 6000000, costoReal: 6000000,
      permutaDeVenta: null,
      venta: {
        ventaId: 'ven1', fecha: '2026-11-17', comprador: 'Pedro', precioVenta: 8000000, ganancia: 1000000,
        cobros: [{ cuentaNombre: 'Caja efectivo', monto: 4500000 }],
        permutas: [
          { vehiculoId: 'v31', codigo: 'MC-031', marca: 'Honda', modelo: '110cc', valorPactado: 1000000 },
        ],
      },
    };

    render(
      <VehiculoDetalleView detalle={vendido} fotoUrl={null} onVolver={vi.fn()} onVerRecibido={onVerRecibido} />
    );

    const seccion = screen.getByRole('heading', { name: 'Cómo se cobró' }).closest('section') as HTMLElement;
    expect(within(seccion).getByText('Caja efectivo')).toBeInTheDocument();
    fireEvent.click(within(seccion).getByRole('button', { name: /permuta: mc-031 honda 110cc/i }));

    const itemPermuta = screen.getByRole('button', { name: /permuta: mc-031/i }).closest('li') as HTMLElement;
    expect(within(itemPermuta).getByText('$ 1.000.000')).toBeInTheDocument();
    expect(onVerRecibido).toHaveBeenCalledWith('v31');
  });

  it('anular la venta avisa qué autos recibidos se anulan con ella y sus gastos', () => {
    const vendido: DetalleVehiculo = {
      ...recibido,
      id: 'v14', codigo: 'MC-014', origen: 'compra', estado: 'vendido', valorIngreso: 6000000, costoReal: 6000000,
      permutaDeVenta: null,
      venta: {
        ventaId: 'ven1', fecha: '2026-11-17', comprador: 'Pedro', precioVenta: 8000000, ganancia: 1000000,
        cobros: [{ cuentaNombre: 'Caja efectivo', monto: 4500000 }],
        permutas: [
          { vehiculoId: 'v31', codigo: 'MC-031', marca: 'Honda', modelo: '110cc', valorPactado: 1000000 },
          { vehiculoId: 'v32', codigo: 'MC-032', marca: 'Fiat', modelo: 'Utilitario', valorPactado: 2500000 },
        ],
      },
    };

    render(
      <VehiculoDetalleView
        detalle={vendido}
        fotoUrl={null}
        onVolver={vi.fn()}
        onAnularVenta={vi.fn()}
        vistaPreviaVenta={[
          { id: 'v31', codigo: 'MC-031', gastosQueSeAnulan: { cantidad: 0, total: 0 } },
          { id: 'v32', codigo: 'MC-032', gastosQueSeAnulan: { cantidad: 2, total: 80000 } },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Anular venta' }));
    const dialogo = screen.getByRole('dialog');

    expect(dialogo).toHaveTextContent('También se anulan MC-031 y MC-032, que entraron por permuta');
    expect(dialogo).toHaveTextContent('Se van a anular también 2 gastos por $ 80.000');
  });
});
