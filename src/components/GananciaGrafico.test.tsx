import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { GananciaMensualView } from './GananciaMensualView';
import type { MesGanancia } from '../lib/vehiculos/vehiculos-service';

const noviembre: MesGanancia = {
  mes: '2026-11-01',
  ventas: 5000000,
  cantidadVendidos: 2,
  costoVendido: 3500000,
  gastosGenerales: 300000,
  gastosSinAsignar: 0,
  ingresos: 0,
  ganancia: 1200000,
};

const grafico = () => screen.queryByRole('img', { name: /^Ganancia de los últimos 6 meses/ });

describe('GananciaMensualView: el gráfico arriba de la lista', () => {
  it('con datos, el gráfico va arriba de la lista de meses', () => {
    render(<GananciaMensualView meses={[noviembre]} onVerMes={vi.fn()} onVolver={vi.fn()} />);

    const img = grafico() as HTMLElement;
    const titulo = screen.getByRole('heading', { name: 'Noviembre 2026' });
    expect(img).toBeInTheDocument();
    expect(img.compareDocumentPosition(titulo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('mientras carga no hay gráfico', () => {
    render(<GananciaMensualView meses={[]} cargando onVerMes={vi.fn()} onVolver={vi.fn()} />);

    expect(grafico()).not.toBeInTheDocument();
  });

  it('si falla la carga no hay gráfico, y se ve Reintentar', () => {
    render(<GananciaMensualView meses={[]} errorCarga onVerMes={vi.fn()} onVolver={vi.fn()} onReintentar={vi.fn()} />);

    expect(grafico()).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  });

  it('sin datos ni error, no hay gráfico: se ve el aviso de que no hay ventas', () => {
    render(<GananciaMensualView meses={[]} onVerMes={vi.fn()} onVolver={vi.fn()} />);

    expect(grafico()).not.toBeInTheDocument();
    expect(screen.getByText('Todavía no hay ventas ni gastos para mostrar')).toBeInTheDocument();
  });
});
