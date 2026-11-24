import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { VenderVehiculoView } from './VenderVehiculoView';
import type { VehiculoItem } from '../lib/vehiculos/vehiculos-service';
import type { CuentaItem } from '../lib/cuentas/cuentas-service';

const vehiculos: VehiculoItem[] = [
  { id: 'v14', codigo: 'MC-014', marca: 'Peugeot', modelo: '208', anio: 2018, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-01' },
];

const cuentas = [
  { id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo', saldo: 9000000 },
] as unknown as CuentaItem[];

const FECHA = '2030-12-15';

const abrirVenta = (precio: string) => {
  fireEvent.click(screen.getByText('MC-014'));
  fireEvent.change(screen.getByLabelText(/precio de venta/i), { target: { value: precio } });
};

const elegirFinanciacion = () => fireEvent.click(screen.getByRole('button', { name: 'Financiación: Sí' }));

const llenarFinanciacion = (monto: string, cuotas: string, fecha = FECHA) => {
  fireEvent.change(screen.getByLabelText('Monto financiado ($)'), { target: { value: monto } });
  fireEvent.change(screen.getByLabelText('Cantidad de cuotas'), { target: { value: cuotas } });
  fireEvent.change(screen.getByLabelText('Fecha de la primera cuota'), { target: { value: fecha } });
};

describe('VenderVehiculoView: financiación', () => {
  it('"Sí" muestra monto, cantidad, fecha y la lista de cuotas en vivo', () => {
    render(<VenderVehiculoView vehiculos={vehiculos} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={vi.fn()} />);

    abrirVenta('5000000');
    elegirFinanciacion();
    llenarFinanciacion('2000000', '4');

    const lista = screen.getByRole('list', { name: 'Cuotas' });
    expect(within(lista).getAllByRole('listitem')).toHaveLength(4);
    expect(within(lista).getByText('1 · 15/12/2030 · $ 500.000')).toBeInTheDocument();
    expect(within(lista).getByText('4 · 15/03/2031 · $ 500.000')).toBeInTheDocument();
  });

  it('los botones rápidos 3, 6 y 12 cargan la cantidad de cuotas', () => {
    render(<VenderVehiculoView vehiculos={vehiculos} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={vi.fn()} />);

    abrirVenta('5000000');
    elegirFinanciacion();
    fireEvent.change(screen.getByLabelText('Monto financiado ($)'), { target: { value: '1200000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cuotas 6' }));

    expect(screen.getByLabelText('Cantidad de cuotas')).toHaveValue('6');
    expect(within(screen.getByRole('list', { name: 'Cuotas' })).getAllByRole('listitem')).toHaveLength(6);
  });

  it('el reparto en cuentas pide precio − permutas − financiado', () => {
    render(<VenderVehiculoView vehiculos={vehiculos} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={vi.fn()} />);

    abrirVenta('5000000');
    elegirFinanciacion();
    llenarFinanciacion('2000000', '4');

    expect(screen.getByLabelText('Monto pago 1')).toHaveValue('$ 3.000.000');
  });

  it('Confirmar queda deshabilitado si el financiado supera lo que queda, o si la cantidad de cuotas es 0', () => {
    render(<VenderVehiculoView vehiculos={vehiculos} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={vi.fn()} />);

    abrirVenta('5000000');
    elegirFinanciacion();
    llenarFinanciacion('6000000', '4');
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();

    llenarFinanciacion('2000000', '0');
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it('Confirmar queda deshabilitado si la primera cuota es anterior a hoy', () => {
    render(<VenderVehiculoView vehiculos={vehiculos} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={vi.fn()} />);

    abrirVenta('5000000');
    elegirFinanciacion();
    llenarFinanciacion('2000000', '4', '2020-01-01');

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it('con financiación válida confirma con financiación y teléfono del comprador', () => {
    const onRegistrar = vi.fn().mockResolvedValue({ success: true, codigo: 'MC-014', ganancia: 0, permutas: [] });
    render(<VenderVehiculoView vehiculos={vehiculos} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={onRegistrar} />);

    abrirVenta('5000000');
    elegirFinanciacion();
    llenarFinanciacion('2000000', '4');
    fireEvent.change(screen.getByLabelText('Teléfono del comprador (opcional)'), { target: { value: '1155' } });
    fireEvent.change(screen.getByLabelText('Monto pago 1'), { target: { value: '3000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar venta/i }));

    expect(onRegistrar).toHaveBeenCalledWith(expect.objectContaining({
      precio: 5000000,
      compradorTelefono: '1155',
      financiacion: { monto: 2000000, cantidadCuotas: 4, fechaPrimera: FECHA },
    }));
  });

  it('si permutas y financiado cubren todo, se puede confirmar sin cobros', () => {
    render(<VenderVehiculoView vehiculos={vehiculos} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={vi.fn()} />);

    abrirVenta('3000000');
    fireEvent.click(screen.getByRole('button', { name: /^sí$/i }));
    fireEvent.change(screen.getByLabelText('Marca'), { target: { value: 'Honda' } });
    fireEvent.change(screen.getByLabelText('Modelo'), { target: { value: '110cc' } });
    fireEvent.change(screen.getByLabelText('Año'), { target: { value: '2015' } });
    fireEvent.change(screen.getByLabelText('Valor pactado ($)'), { target: { value: '1000000' } });
    elegirFinanciacion();
    llenarFinanciacion('2000000', '2');

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled();
  });
});
