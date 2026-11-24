import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { VehiculosView } from './VehiculosView';
import { MovimientosView } from './MovimientosView';
import { CuotasPorCobrarView } from './CuotasPorCobrarView';
import { PendientesAsignarView } from './PendientesAsignarView';
import { GananciaMensualView } from './GananciaMensualView';
import { BalancesView } from './BalancesView';

describe('Vehículos: carga', () => {
  it('mientras carga, muestra "Cargando…" y no la lista vacía', () => {
    render(<VehiculosView vehiculos={[]} onVolver={vi.fn()} cargando />);
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
    expect(screen.queryByText('No hay vehículos en stock')).not.toBeInTheDocument();
  });

  it('si falla la carga, muestra "No se pudo cargar" y Reintentar vuelve a pedir', () => {
    const onReintentar = vi.fn();
    render(<VehiculosView vehiculos={[]} onVolver={vi.fn()} errorCarga onReintentar={onReintentar} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onReintentar).toHaveBeenCalledTimes(1);
  });
});

describe('Movimientos: carga', () => {
  it('mientras carga, muestra "Cargando…" y no una lista vacía', () => {
    render(<MovimientosView movimientos={[]} onVolver={vi.fn()} cargando />);
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
  });

  it('si falla la carga, muestra "No se pudo cargar" y Reintentar vuelve a pedir', () => {
    const onReintentar = vi.fn();
    render(<MovimientosView movimientos={[]} onVolver={vi.fn()} errorCarga onReintentar={onReintentar} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onReintentar).toHaveBeenCalledTimes(1);
  });
});

describe('Cuotas por cobrar: carga', () => {
  it('mientras carga, muestra "Cargando…" y no "No hay cuotas"', () => {
    render(<CuotasPorCobrarView cuotas={[]} onCobrar={vi.fn()} onVolver={vi.fn()} cargando />);
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
    expect(screen.queryByText('No hay cuotas por cobrar')).not.toBeInTheDocument();
  });

  it('si falla la carga, muestra "No se pudo cargar" y Reintentar vuelve a pedir', () => {
    const onReintentar = vi.fn();
    render(<CuotasPorCobrarView cuotas={[]} onCobrar={vi.fn()} onVolver={vi.fn()} errorCarga onReintentar={onReintentar} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onReintentar).toHaveBeenCalledTimes(1);
  });
});

describe('Pendientes de asignar: carga', () => {
  it('mientras carga, muestra "Cargando…" y no "No hay gastos pendientes"', () => {
    render(<PendientesAsignarView pendientes={{ grupos: [], total: 0 }} onAsignar={vi.fn()} onVolver={vi.fn()} cargando />);
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
    expect(screen.queryByText('No hay gastos pendientes de asignar')).not.toBeInTheDocument();
  });

  it('si falla la carga, muestra "No se pudo cargar" y Reintentar vuelve a pedir', () => {
    const onReintentar = vi.fn();
    render(
      <PendientesAsignarView pendientes={{ grupos: [], total: 0 }} onAsignar={vi.fn()} onVolver={vi.fn()} errorCarga onReintentar={onReintentar} />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onReintentar).toHaveBeenCalledTimes(1);
  });
});

describe('Ganancia por mes: carga', () => {
  it('mientras carga, muestra "Cargando…" y no "Todavía no hay ventas"', () => {
    render(<GananciaMensualView meses={[]} onVerMes={vi.fn()} onVolver={vi.fn()} cargando />);
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
    expect(screen.queryByText(/Todavía no hay ventas/)).not.toBeInTheDocument();
  });

  it('si falla la carga, muestra "No se pudo cargar" y Reintentar vuelve a pedir', () => {
    const onReintentar = vi.fn();
    render(<GananciaMensualView meses={[]} onVerMes={vi.fn()} onVolver={vi.fn()} errorCarga onReintentar={onReintentar} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onReintentar).toHaveBeenCalledTimes(1);
  });
});

describe('Balances: carga', () => {
  it('mientras cargan las cuentas, no muestra "$ 0" en Dinero disponible', () => {
    render(<BalancesView totalDisponible={0} cuentas={[]} onVolver={vi.fn()} onIrACuentas={vi.fn()} cargandoCuentas />);
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
    expect(screen.queryByTestId('total-disponible')).not.toBeInTheDocument();
  });

  it('si falla la carga de cuentas, muestra "No se pudo cargar" y Reintentar vuelve a pedir', () => {
    const onReintentar = vi.fn();
    render(
      <BalancesView totalDisponible={0} cuentas={[]} onVolver={vi.fn()} onIrACuentas={vi.fn()} errorCuentas onReintentar={onReintentar} />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onReintentar).toHaveBeenCalledTimes(1);
  });
});
