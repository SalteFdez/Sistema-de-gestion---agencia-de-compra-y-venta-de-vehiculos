import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import React from 'react';
import { GananciaMensualView } from './GananciaMensualView';
import type { MesGanancia } from '../lib/vehiculos/vehiculos-service';

const noviembre: MesGanancia = {
  mes: '2026-11-01', ventas: 8000000, cantidadVendidos: 2, costoVendido: 5000000,
  gastosGenerales: 500000, gastosSinAsignar: 200000, ingresos: 100000, ganancia: 2400000,
};
const octubre: MesGanancia = {
  mes: '2026-10-01', ventas: 1000000, cantidadVendidos: 1, costoVendido: 1500000,
  gastosGenerales: 0, gastosSinAsignar: 0, ingresos: 0, ganancia: -500000,
};

describe('GananciaMensualView', () => {
  it('cada mes muestra ventas, costo, gastos, ingresos y la ganancia en número grande', () => {
    render(<GananciaMensualView meses={[noviembre]} onVerMes={vi.fn()} onVolver={vi.fn()} />);

    const tarjeta = screen.getByRole('heading', { name: 'Noviembre 2026' }).closest('article') as HTMLElement;
    expect(within(tarjeta).getByText(/Ventas \$ 8\.000\.000 \(2 autos\)/)).toBeInTheDocument();
    expect(within(tarjeta).getByText(/Costo de lo vendido \$ 5\.000\.000/)).toBeInTheDocument();
    expect(within(tarjeta).getByText(/Gastos \$ 700\.000/)).toBeInTheDocument();
    expect(within(tarjeta).getByText(/Ingresos generales \$ 100\.000/)).toBeInTheDocument();
    expect(within(tarjeta).getByText('$ 2.400.000')).toBeInTheDocument();
  });

  it('la leyenda de sin asignar aparece solo cuando hay', () => {
    render(<GananciaMensualView meses={[noviembre, octubre]} onVerMes={vi.fn()} onVolver={vi.fn()} />);

    const nov = screen.getByRole('heading', { name: 'Noviembre 2026' }).closest('article') as HTMLElement;
    const oct = screen.getByRole('heading', { name: 'Octubre 2026' }).closest('article') as HTMLElement;
    expect(within(nov).getByText('Incluye $ 200.000 de gastos sin asignar')).toBeInTheDocument();
    expect(within(oct).queryByText(/Incluye/)).not.toBeInTheDocument();
  });

  it('una pérdida se ve en rojo', () => {
    render(<GananciaMensualView meses={[octubre]} onVerMes={vi.fn()} onVolver={vi.fn()} />);

    expect(screen.getByText('$ −500.000')).toHaveClass('text-red-600');
  });

  it('sin meses dice que todavía no hay ventas ni gastos para mostrar', () => {
    render(<GananciaMensualView meses={[]} onVerMes={vi.fn()} onVolver={vi.fn()} />);

    expect(screen.getByText('Todavía no hay ventas ni gastos para mostrar')).toBeInTheDocument();
  });

  it('tocar un mes lo abre', () => {
    const onVerMes = vi.fn();
    render(<GananciaMensualView meses={[noviembre]} onVerMes={onVerMes} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByRole('heading', { name: 'Noviembre 2026' }).closest('article') as HTMLElement);

    expect(onVerMes).toHaveBeenCalledWith('2026-11-01');
  });
});
