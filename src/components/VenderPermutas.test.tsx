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

const abrirVenta = (precio: string) => {
  fireEvent.click(screen.getByText('MC-014'));
  fireEvent.change(screen.getByLabelText(/precio de venta/i), { target: { value: precio } });
};

const cardsPermuta = () => screen.queryAllByLabelText('Marca');

describe('VenderVehiculoView: permutas', () => {
  it('"Sí" muestra una tarjeta por recibido; se agregan y se quitan, y el total se ve en vivo', () => {
    render(<VenderVehiculoView vehiculos={vehiculos} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={vi.fn()} />);

    abrirVenta('8000000');
    fireEvent.click(screen.getByRole('button', { name: /^sí$/i }));
    expect(cardsPermuta()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /agregar otro vehículo recibido/i }));
    expect(cardsPermuta()).toHaveLength(2);

    fireEvent.change(screen.getAllByLabelText('Valor pactado ($)')[0], { target: { value: '1000000' } });
    expect(screen.getByText(/Permutas \$ 1\.000\.000/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Quitar vehículo recibido 2' }));
    expect(cardsPermuta()).toHaveLength(1);
  });

  it('el reparto en cuentas pide precio − permutas', () => {
    render(<VenderVehiculoView vehiculos={vehiculos} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={vi.fn()} />);

    abrirVenta('8000000');
    fireEvent.click(screen.getByRole('button', { name: /^sí$/i }));
    fireEvent.change(screen.getByLabelText('Marca'), { target: { value: 'Honda' } });
    fireEvent.change(screen.getByLabelText('Modelo'), { target: { value: '110cc' } });
    fireEvent.change(screen.getByLabelText('Año'), { target: { value: '2015' } });
    fireEvent.change(screen.getByLabelText('Valor pactado ($)'), { target: { value: '1000000' } });

    expect(screen.getByLabelText('Monto pago 1')).toHaveValue('$ 7.000.000');
  });

  it('muestra la ecuación en vivo: precio = permutas + cobrado, con lo que falta o sobra', () => {
    render(<VenderVehiculoView vehiculos={vehiculos} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={vi.fn()} />);

    abrirVenta('8000000');
    fireEvent.click(screen.getByRole('button', { name: /^sí$/i }));
    fireEvent.change(screen.getByLabelText('Marca'), { target: { value: 'Honda' } });
    fireEvent.change(screen.getByLabelText('Modelo'), { target: { value: '110cc' } });
    fireEvent.change(screen.getByLabelText('Año'), { target: { value: '2015' } });
    fireEvent.change(screen.getByLabelText('Valor pactado ($)'), { target: { value: '1000000' } });
    fireEvent.change(screen.getByLabelText('Monto pago 1'), { target: { value: '6500000' } });

    expect(screen.getByText('Precio $ 8.000.000 = permutas $ 1.000.000 + cobrado $ 6.500.000 · Faltan $ 500.000')).toBeInTheDocument();
  });

  it('Confirmar queda deshabilitado si las permutas superan el precio', () => {
    render(<VenderVehiculoView vehiculos={vehiculos} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={vi.fn()} />);

    abrirVenta('3000000');
    fireEvent.click(screen.getByRole('button', { name: /^sí$/i }));
    fireEvent.change(screen.getByLabelText('Marca'), { target: { value: 'Honda' } });
    fireEvent.change(screen.getByLabelText('Modelo'), { target: { value: '110cc' } });
    fireEvent.change(screen.getByLabelText('Año'), { target: { value: '2015' } });
    fireEvent.change(screen.getByLabelText('Valor pactado ($)'), { target: { value: '3500000' } });

    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
  });

  it('Confirmar queda deshabilitado con un valor pactado 0 o con datos del recibido sin completar', () => {
    render(<VenderVehiculoView vehiculos={vehiculos} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={vi.fn()} />);

    abrirVenta('8000000');
    fireEvent.click(screen.getByRole('button', { name: /^sí$/i }));
    fireEvent.change(screen.getByLabelText('Marca'), { target: { value: 'Honda' } });
    fireEvent.change(screen.getByLabelText('Modelo'), { target: { value: '110cc' } });
    fireEvent.change(screen.getByLabelText('Año'), { target: { value: '2015' } });
    fireEvent.change(screen.getByLabelText('Valor pactado ($)'), { target: { value: '0' } });
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Valor pactado ($)'), { target: { value: '1000000' } });
    fireEvent.change(screen.getByLabelText('Marca'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
  });

  it('si las permutas cubren todo el precio, se puede confirmar sin cobros', () => {
    render(<VenderVehiculoView vehiculos={vehiculos} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={vi.fn()} />);

    abrirVenta('1000000');
    fireEvent.click(screen.getByRole('button', { name: /^sí$/i }));
    fireEvent.change(screen.getByLabelText('Marca'), { target: { value: 'Honda' } });
    fireEvent.change(screen.getByLabelText('Modelo'), { target: { value: '110cc' } });
    fireEvent.change(screen.getByLabelText('Año'), { target: { value: '2015' } });
    fireEvent.change(screen.getByLabelText('Valor pactado ($)'), { target: { value: '1000000' } });

    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled();
  });

  it('al confirmar manda las permutas y el resumen nombra todos los códigos que entran', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({
      success: true,
      ventaId: 'ven1',
      codigo: 'MC-014',
      ganancia: 1000000,
      permutas: [
        { id: 'v31', codigo: 'MC-031' },
        { id: 'v32', codigo: 'MC-032' },
      ],
      avisosFoto: [],
    });
    render(<VenderVehiculoView vehiculos={vehiculos} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={onRegistrar} />);

    abrirVenta('8000000');
    fireEvent.click(screen.getByRole('button', { name: /^sí$/i }));
    fireEvent.change(screen.getAllByLabelText('Marca')[0], { target: { value: 'Honda' } });
    fireEvent.change(screen.getAllByLabelText('Modelo')[0], { target: { value: '110cc' } });
    fireEvent.change(screen.getAllByLabelText('Año')[0], { target: { value: '2015' } });
    fireEvent.change(screen.getAllByLabelText('Valor pactado ($)')[0], { target: { value: '1000000' } });
    fireEvent.click(screen.getByRole('button', { name: /agregar otro vehículo recibido/i }));
    fireEvent.change(screen.getAllByLabelText('Marca')[1], { target: { value: 'Fiat' } });
    fireEvent.change(screen.getAllByLabelText('Modelo')[1], { target: { value: 'Utilitario' } });
    fireEvent.change(screen.getAllByLabelText('Año')[1], { target: { value: '2012' } });
    fireEvent.change(screen.getAllByLabelText('Valor pactado ($)')[1], { target: { value: '2500000' } });
    fireEvent.change(screen.getByLabelText('Monto pago 1'), { target: { value: '4500000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(onRegistrar).toHaveBeenCalledWith(expect.objectContaining({
      vehiculoId: 'v14',
      precio: 8000000,
      permutas: [
        expect.objectContaining({ marca: 'Honda', valorPactado: 1000000 }),
        expect.objectContaining({ marca: 'Fiat', valorPactado: 2500000 }),
      ],
    }));
    expect(await screen.findByText(/Vendiste MC-014 en \$ 8\.000\.000 · Entran \$ 4\.500\.000 hoy · Entran MC-031 y MC-032 al stock por \$ 3\.500\.000/)).toBeInTheDocument();
  });

  it('con "No" no aparecen las tarjetas de permutas', () => {
    render(<VenderVehiculoView vehiculos={vehiculos} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={vi.fn()} />);

    abrirVenta('8000000');
    fireEvent.click(screen.getByRole('button', { name: /^no$/i }));

    expect(cardsPermuta()).toHaveLength(0);
  });
});
