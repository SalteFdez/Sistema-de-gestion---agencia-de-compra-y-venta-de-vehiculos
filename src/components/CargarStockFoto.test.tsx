import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { CargarStockForm } from './CargarStockForm';

describe('CargarStockForm: foto', () => {
  it('el campo de foto abre la galería, no la cámara', () => {
    const { container } = render(<CargarStockForm />);

    const foto = container.querySelector('input[name="foto"]');
    expect(foto).toHaveAttribute('type', 'file');
    expect(foto).not.toHaveAttribute('capture');
  });
});
