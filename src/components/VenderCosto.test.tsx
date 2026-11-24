import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { VenderVehiculoView } from './VenderVehiculoView';
import type { VehiculoItem } from '../lib/vehiculos/vehiculos-service';

const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 9000000 }];
const base = { codigo: 'MC-014', marca: 'Peugeot', modelo: '208', anio: 2018, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-01' };
const sinCosto = { id: 'v14', ...base } as VehiculoItem;
const conCosto = { id: 'v14', ...base, costoReal: 6500000 } as VehiculoItem;

const elegirAuto = () => fireEvent.click(screen.getByText('MC-014'));
const escribirPrecio = (valor: string) => fireEvent.change(screen.getByLabelText(/precio de venta/i), { target: { value: valor } });

describe('Vender: costo real y ganancia estimada', () => {
  it('muestra el costo real que trae la lista, y la ganancia = precio − costo, en rojo si es negativa', () => {
    render(<VenderVehiculoView vehiculos={[conCosto]} cuentas={cuentas} onVolver={vi.fn()} />);
    elegirAuto();

    expect(screen.getByText('Costo real $ 6.500.000')).toBeInTheDocument();
    expect(screen.queryByText(/ganancia estimada/i)).not.toBeInTheDocument();

    escribirPrecio('8000000');
    expect(screen.getByText('Ganancia estimada $ 1.500.000')).toBeInTheDocument();

    escribirPrecio('6000000');
    const negativa = screen.getByText('Ganancia estimada $ −500.000');
    expect(negativa).toHaveClass('text-red-600');
  });

  it('si la lista no trae el costo, lo pide con obtenerDetalle mientras muestra "Calculando costo…"', async () => {
    const onObtenerCosto = vi.fn(() => new Promise<number>((resolver) => setTimeout(() => resolver(6500000), 0)));
    render(<VenderVehiculoView vehiculos={[sinCosto]} cuentas={cuentas} onVolver={vi.fn()} onObtenerCosto={onObtenerCosto} />);
    elegirAuto();

    expect(screen.getByText(/calculando costo/i)).toBeInTheDocument();
    expect(await screen.findByText('Costo real $ 6.500.000')).toBeInTheDocument();
    expect(onObtenerCosto).toHaveBeenCalledWith('v14');
  });

  it('si no se puede calcular el costo, avisa y no muestra ganancia, pero la venta sigue disponible', async () => {
    const onObtenerCosto = vi.fn().mockRejectedValue(new Error('sin conexión'));
    render(<VenderVehiculoView vehiculos={[sinCosto]} cuentas={cuentas} onVolver={vi.fn()} onObtenerCosto={onObtenerCosto} />);
    elegirAuto();

    expect(await screen.findByText(/no se pudo calcular el costo/i)).toBeInTheDocument();
    escribirPrecio('8000000');
    expect(screen.queryByText(/ganancia estimada/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/precio de venta/i)).toHaveValue('$ 8.000.000');
  });
});
