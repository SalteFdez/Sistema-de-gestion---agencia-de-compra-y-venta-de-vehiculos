import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MoverPlataView } from './MoverPlataView';

describe('MoverPlataView', () => {
  it('muestra las tres opciones: Pasar entre cuentas, Aporte de socio y Retiro de socio', () => {
    render(<MoverPlataView onPasar={vi.fn()} onAporte={vi.fn()} onRetiro={vi.fn()} onVolver={vi.fn()} />);

    expect(screen.getByRole('button', { name: /pasar entre cuentas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /aporte de socio/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retiro de socio/i })).toBeInTheDocument();
  });
});
