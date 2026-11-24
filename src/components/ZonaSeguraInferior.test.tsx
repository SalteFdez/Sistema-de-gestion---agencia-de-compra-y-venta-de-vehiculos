import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BarraNavegacion } from './ui/BarraNavegacion';
import registrarGastoSrc from './RegistrarGastoView.tsx?raw';

describe('zona segura inferior: arriba de la barra de gestos', () => {
  it('la barra de pestañas suma el alto de la zona segura inferior', () => {
    render(<BarraNavegacion pestanaActiva="home" onSeleccionar={vi.fn()} />);

    expect(screen.getByRole('navigation')).toHaveClass('pb-[env(safe-area-inset-bottom)]');
  });

  it('el Confirmar fijo de Registrar gasto suma la zona segura inferior', () => {
    expect(registrarGastoSrc).toContain('env(safe-area-inset-bottom');
  });
});
