import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import React from 'react';
import { MovimientosView } from './MovimientosView';
import type { MovimientoItem } from '../lib/vehiculos/vehiculos-service';

const mov = (id: string, fecha: string, extra: Partial<MovimientoItem> = {}): MovimientoItem => ({
  id,
  fecha,
  tipo: 'ingreso_otro',
  monto: 80000,
  descripcion: `Movimiento ${id}`,
  cuentaNombre: 'Banco',
  vehiculoId: null,
  vehiculoCodigo: null,
  categoriaNombre: 'Comisión',
  creadoPor: 'Lautaro',
  anulado: false,
  anuladoPor: null,
  anuladoEl: null,
  motivoAnulacion: null,
  gastoId: null,
  ventaId: null,
  ...extra,
});

describe('MovimientosView: agrupados por día', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('cada día tiene su encabezado (Hoy, Ayer o "lun 16/11") con sus movimientos adentro', () => {
    // Hoy en Buenos Aires: 24/11/2026
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-24T12:00:00-03:00'));
    const movimientos = [
      mov('m1', '2026-11-24', { descripcion: 'Del hoy' }),
      mov('m2', '2026-11-23', { descripcion: 'Del ayer' }),
      mov('m3', '2026-11-16', { descripcion: 'Del lunes' }),
      mov('m4', '2026-11-16', { descripcion: 'Otro del lunes' }),
    ];

    render(<MovimientosView movimientos={movimientos} onVolver={vi.fn()} />);

    const hoy = screen.getByRole('heading', { name: 'Hoy' }).closest('section') as HTMLElement;
    expect(within(hoy).getByText('Del hoy')).toBeInTheDocument();

    const ayer = screen.getByRole('heading', { name: 'Ayer' }).closest('section') as HTMLElement;
    expect(within(ayer).getByText('Del ayer')).toBeInTheDocument();

    const lunes = screen.getByRole('heading', { name: 'lun 16/11' }).closest('section') as HTMLElement;
    expect(within(lunes).getByText('Del lunes')).toBeInTheDocument();
    expect(within(lunes).getByText('Otro del lunes')).toBeInTheDocument();
  });
});

describe('MovimientosView: filtros de sentido y cuenta', () => {
  const cuentas = [
    { id: 'c1', nombre: 'Banco' },
    { id: 'c2', nombre: 'Caja efectivo' },
  ];

  it('elegir Salidas, y después una cuenta, avisa el filtro nuevo y lo muestra marcado', () => {
    const onCambiarFiltro = vi.fn();
    render(
      <MovimientosView
        movimientos={[mov('m1', '2026-11-14')]}
        cuentas={cuentas}
        onCambiarFiltro={onCambiarFiltro}
        onVolver={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Salidas' }));
    expect(onCambiarFiltro).toHaveBeenLastCalledWith(expect.objectContaining({ sentido: 'salidas' }));
    expect(screen.getByRole('button', { name: 'Salidas' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.change(screen.getByRole('combobox', { name: 'Cuenta' }), { target: { value: 'c2' } });
    expect(onCambiarFiltro).toHaveBeenLastCalledWith(expect.objectContaining({ sentido: 'salidas', cuentaId: 'c2' }));
  });

  it('sin movimientos con el filtro elegido, dice "No hay movimientos con este filtro"', () => {
    render(<MovimientosView movimientos={[]} filtro={{ sentido: 'salidas' }} onCambiarFiltro={vi.fn()} onVolver={vi.fn()} />);

    expect(screen.getByText('No hay movimientos con este filtro')).toBeInTheDocument();
  });

  it('con el filtro activo, un movimiento anulado sigue apareciendo tachado', () => {
    const anulado = mov('m5', '2026-11-14', { descripcion: 'Ingreso anulado', anulado: true, anuladoPor: 'Antonio', motivoAnulacion: 'mal cargado' });

    render(<MovimientosView movimientos={[anulado]} filtro={{ sentido: 'entradas' }} onCambiarFiltro={vi.fn()} onVolver={vi.fn()} />);

    expect(screen.getByText('Ingreso anulado').closest('li')).toHaveClass('line-through');
  });

  it('sin filtro y sin movimientos, no dice nada de filtros', () => {
    render(<MovimientosView movimientos={[]} onVolver={vi.fn()} />);

    expect(screen.queryByText('No hay movimientos con este filtro')).not.toBeInTheDocument();
  });
});
