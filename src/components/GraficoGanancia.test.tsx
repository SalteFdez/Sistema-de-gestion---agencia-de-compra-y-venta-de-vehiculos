import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { GraficoGanancia } from './GraficoGanancia';
import type { MesGraficado } from '../lib/reportes/ganancia';

const seisMeses: MesGraficado[] = [
  { mes: '2026-06-01', etiqueta: 'jun', ganancia: 1200000 },
  { mes: '2026-07-01', etiqueta: 'jul', ganancia: 850000 },
  { mes: '2026-08-01', etiqueta: 'ago', ganancia: -300000 },
  { mes: '2026-09-01', etiqueta: 'sep', ganancia: 400000 },
  { mes: '2026-10-01', etiqueta: 'oct', ganancia: 600000 },
  { mes: '2026-11-01', etiqueta: 'nov', ganancia: 250000 },
];

const barra = (container: HTMLElement, mes: string) =>
  container.querySelector(`rect[data-mes="${mes}"]`) as SVGRectElement;

describe('GraficoGanancia', () => {
  it('una barra por mes, verde si la ganancia es 0 o más y roja si es negativa', () => {
    const { container } = render(<GraficoGanancia meses={seisMeses} />);

    expect(container.querySelectorAll('rect')).toHaveLength(6);
    expect(barra(container, '2026-06-01')).toHaveClass('fill-green-600');
    expect(barra(container, '2026-07-01')).toHaveClass('fill-green-600');
    expect(barra(container, '2026-08-01')).toHaveClass('fill-red-600');
    expect(barra(container, '2026-11-01')).toHaveClass('fill-green-600');
  });

  it('la altura de cada barra es proporcional a su monto (el doble de ganancia, el doble de alta)', () => {
    const { container } = render(<GraficoGanancia meses={seisMeses} />);

    const alturaJunio = Number(barra(container, '2026-06-01').getAttribute('height')); // 1.200.000
    const alturaOctubre = Number(barra(container, '2026-10-01').getAttribute('height')); // 600.000
    const alturaAgosto = Number(barra(container, '2026-08-01').getAttribute('height')); // -300.000

    expect(alturaJunio / alturaOctubre).toBeCloseTo(2, 1);
    expect(alturaAgosto / alturaJunio).toBeCloseTo(0.25, 1);
  });

  it('las positivas suben desde la línea base y las negativas bajan desde ella', () => {
    const { container } = render(<GraficoGanancia meses={seisMeses} />);
    const base = Number(screen.getByTestId('linea-base').getAttribute('y1'));

    const junio = barra(container, '2026-06-01');
    expect(Number(junio.getAttribute('y')) + Number(junio.getAttribute('height'))).toBeCloseTo(base, 1);

    const agosto = barra(container, '2026-08-01');
    expect(Number(agosto.getAttribute('y'))).toBeCloseTo(base, 1);
  });

  it('un mes en 0 no tiene barra, pero sí su monto "$ 0" y su nombre corto', () => {
    const conCero: MesGraficado[] = [...seisMeses.slice(0, 4), { mes: '2026-10-01', etiqueta: 'oct', ganancia: 0 }, seisMeses[5]];
    const { container } = render(<GraficoGanancia meses={conCero} />);

    expect(barra(container, '2026-10-01')).toBeNull();
    expect(container.querySelectorAll('rect')).toHaveLength(5);
    expect(screen.getByText('$ 0')).toBeInTheDocument();
    expect(screen.getByText('oct')).toBeInTheDocument();
  });

  it('el aria-label enumera cada mes con su monto completo', () => {
    render(<GraficoGanancia meses={seisMeses} />);

    expect(
      screen.getByRole('img', {
        name:
          'Ganancia de los últimos 6 meses: junio $ 1.200.000, julio $ 850.000, agosto $ −300.000, ' +
          'septiembre $ 400.000, octubre $ 600.000, noviembre $ 250.000',
      })
    ).toBeInTheDocument();
  });
});
