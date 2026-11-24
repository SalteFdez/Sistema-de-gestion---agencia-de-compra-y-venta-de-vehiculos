import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import React from 'react';
import { VehiculoDetalleView } from './VehiculoDetalleView';
import { VenderVehiculoView } from './VenderVehiculoView';
import type { DetalleVehiculo, VehiculoItem } from '../lib/vehiculos/vehiculos-service';
import type { CuentaItem } from '../lib/cuentas/cuentas-service';

const vendido: DetalleVehiculo = {
  id: 'v14', codigo: 'MC-014', marca: 'Peugeot', modelo: '208', anio: 2018, color: null, patente: null,
  estado: 'vendido', origen: 'compra', fechaIngreso: '2026-11-01', vendedor: null,
  valorIngreso: 4000000, gastosAsignados: 0, costoReal: 4000000, pagos: [], gastos: [],
  venta: {
    ventaId: 'ven1', fecha: '2026-11-18', comprador: 'Pedro', precioVenta: 5000000, ganancia: 1000000,
    cobros: [{ cuentaNombre: 'Caja efectivo', monto: 3000000 }],
    financiacion: {
      monto: 2000000,
      cantidadCuotas: 4,
      fechaPrimera: '2026-12-15',
      faltaCobrar: 2000000,
      cuotas: [
        { numero: 1, monto: 500000, fechaVencimiento: '2026-12-15', estado: 'pendiente' },
        { numero: 2, monto: 500000, fechaVencimiento: '2027-01-15', estado: 'pendiente' },
        { numero: 3, monto: 500000, fechaVencimiento: '2027-02-15', estado: 'pendiente' },
        { numero: 4, monto: 500000, fechaVencimiento: '2027-03-15', estado: 'pendiente' },
      ],
    },
  },
};

describe('VehiculoDetalleView: financiación', () => {
  it('muestra la financiación con sus cuotas en "Pendiente", "Falta cobrar" y la ganancia', () => {
    render(<VehiculoDetalleView detalle={vendido} fotoUrl={null} onVolver={vi.fn()} />);

    expect(screen.getByText('Financiación $ 2.000.000 en 4 cuotas')).toBeInTheDocument();
    const lista = screen.getByRole('list', { name: 'Cuotas financiadas' });
    expect(within(lista).getByText('1 · 15/12/2026 · $ 500.000 · Pendiente')).toBeInTheDocument();
    expect(within(lista).getByText('4 · 15/03/2027 · $ 500.000 · Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Falta cobrar $ 2.000.000')).toBeInTheDocument();
    expect(screen.getByText('Ganancia')).toBeInTheDocument();
    expect(screen.getByText('$ 1.000.000')).toBeInTheDocument();
  });

  it('una venta sin financiación no muestra el bloque', () => {
    const sinFinanciacion: DetalleVehiculo = {
      ...vendido,
      venta: { ...vendido.venta!, financiacion: undefined },
    };
    render(<VehiculoDetalleView detalle={sinFinanciacion} fotoUrl={null} onVolver={vi.fn()} />);

    expect(screen.queryByRole('list', { name: 'Cuotas financiadas' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Falta cobrar/)).not.toBeInTheDocument();
  });
});

describe('VehiculoDetalleView: anular una venta financiada', () => {
  it('el aviso dice cuántas cuotas se anulan y cuánto queda por cobrar', () => {
    render(<VehiculoDetalleView detalle={vendido} fotoUrl={null} onVolver={vi.fn()} onAnularVenta={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Anular venta' }));

    expect(screen.getByRole('dialog')).toHaveTextContent('Se anulan 4 cuotas por $ 2.000.000 por cobrar');
  });
});

describe('VehiculoDetalleView: cobros de cuotas al anular la venta', () => {
  it('el aviso lista los cobros de cuotas que salen de las cuentas', () => {
    render(
      <VehiculoDetalleView
        detalle={vendido}
        fotoUrl={null}
        onVolver={vi.fn()}
        onAnularVenta={vi.fn()}
        cobrosCuotas={{ cantidad: 2, total: 1000000 }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Anular venta' }));

    expect(screen.getByRole('dialog')).toHaveTextContent('2 cobros de cuotas por $ 1.000.000 salen de las cuentas');
  });
});

describe('VenderVehiculoView: resumen con financiación', () => {
  it('el resumen dice cuánto queda por cobrar, en cuántas cuotas y cuándo empieza', async () => {
    const vehiculos: VehiculoItem[] = [
      { id: 'v14', codigo: 'MC-014', marca: 'Peugeot', modelo: '208', anio: 2018, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-01' },
    ];
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo', saldo: 9000000 }] as unknown as CuentaItem[];
    const onRegistrar = vi.fn().mockResolvedValue({ success: true, codigo: 'MC-014', ganancia: 1000000, permutas: [] });
    render(<VenderVehiculoView vehiculos={vehiculos} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={onRegistrar} />);

    fireEvent.click(screen.getByText('MC-014'));
    fireEvent.change(screen.getByLabelText(/precio de venta/i), { target: { value: '5000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Financiación: Sí' }));
    fireEvent.change(screen.getByLabelText('Monto financiado ($)'), { target: { value: '2000000' } });
    fireEvent.change(screen.getByLabelText('Cantidad de cuotas'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Fecha de la primera cuota'), { target: { value: '2030-12-15' } });
    fireEvent.change(screen.getByLabelText('Monto pago 1'), { target: { value: '3000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar venta/i }));

    expect(await screen.findByText(/Queda por cobrar \$ 2\.000\.000 en 4 cuotas de \$ 500\.000 \(primera el 15\/12\)/)).toBeInTheDocument();
  });
});
