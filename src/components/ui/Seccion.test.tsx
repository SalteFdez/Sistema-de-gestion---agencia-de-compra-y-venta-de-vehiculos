import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Seccion } from './Seccion';

describe('Seccion', () => {
  it('cerrada por defecto, con el título en un área de 44 px; un toque la abre y otro la cierra', () => {
    const { container } = render(
      <Seccion titulo="Gastos">
        <p>Contenido de gastos</p>
      </Seccion>
    );

    const resumen = screen.getByText('Gastos').closest('summary');
    expect(resumen).toHaveClass('min-h-11');
    const detalle = container.querySelector('details');
    expect(detalle).not.toHaveAttribute('open');

    fireEvent.click(resumen!);
    expect(detalle).toHaveAttribute('open');

    fireEvent.click(resumen!);
    expect(detalle).not.toHaveAttribute('open');
  });

  it('con abierta, arranca abierta', () => {
    const { container } = render(
      <Seccion titulo="Datos" abierta>
        <p>Fecha de ingreso</p>
      </Seccion>
    );

    expect(container.querySelector('details')).toHaveAttribute('open');
  });
});
