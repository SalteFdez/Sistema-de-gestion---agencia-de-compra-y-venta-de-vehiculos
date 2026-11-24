import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Encabezado } from './ui/Encabezado';

describe('Encabezado: debajo del notch', () => {
  it('el padding superior es el de zona segura si es mayor, y el normal (0,75 rem) si no hay notch', () => {
    render(<Encabezado titulo="Caja" onVolver={vi.fn()} />);

    expect(screen.getByRole('banner')).toHaveClass('pt-[max(0.75rem,env(safe-area-inset-top))]');
  });
});
