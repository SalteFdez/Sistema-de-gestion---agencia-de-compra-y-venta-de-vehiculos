import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import React from 'react';
import { CuotasPorCobrarView } from './CuotasPorCobrarView';
import type { CuotaPorCobrar } from '../lib/vehiculos/vehiculos-service';

const cuota = (over: Partial<CuotaPorCobrar>): CuotaPorCobrar => ({
  cuotaId: 'c1', ventaId: 'ven1', numero: 2, totalCuotas: 4, monto: 500000, cobrado: 0, saldo: 500000,
  estado: 'pendiente', vencimiento: '2026-12-15', vehiculoCodigo: 'MC-014', comprador: 'Juan Pérez',
  compradorTelefono: '11 1234 5678', ...over,
});

const tarjetaDe = (nombre: string) => screen.getByText(nombre).closest('article') as HTMLElement;

describe('CuotasPorCobrarView: Llamar y WhatsApp según el teléfono', () => {
  it('sin teléfono no aparecen ni Llamar ni WhatsApp, y Cobrar sigue', () => {
    render(<CuotasPorCobrarView cuotas={[cuota({ compradorTelefono: null })]} onCobrar={vi.fn()} onVolver={vi.fn()} />);

    const tarjeta = tarjetaDe('Juan Pérez');
    expect(within(tarjeta).queryByRole('link', { name: 'Llamar' })).not.toBeInTheDocument();
    expect(within(tarjeta).queryByRole('link', { name: 'WhatsApp' })).not.toBeInTheDocument();
    expect(within(tarjeta).getByRole('button', { name: 'Cobrar' })).toBeInTheDocument();
  });

  it('con un celular que se puede armar aparecen Llamar y WhatsApp', () => {
    render(<CuotasPorCobrarView cuotas={[cuota({})]} onCobrar={vi.fn()} onVolver={vi.fn()} />);

    const tarjeta = tarjetaDe('Juan Pérez');
    expect(within(tarjeta).getByRole('link', { name: 'Llamar' })).toBeInTheDocument();
    expect(within(tarjeta).getByRole('link', { name: 'WhatsApp' })).toBeInTheDocument();
  });

  it('con un teléfono que no se puede armar como celular, aparece solo Llamar', () => {
    render(<CuotasPorCobrarView cuotas={[cuota({ compradorTelefono: '1155' })]} onCobrar={vi.fn()} onVolver={vi.fn()} />);

    const tarjeta = tarjetaDe('Juan Pérez');
    expect(within(tarjeta).getByRole('link', { name: 'Llamar' })).toBeInTheDocument();
    expect(within(tarjeta).queryByRole('link', { name: 'WhatsApp' })).not.toBeInTheDocument();
  });
});

describe('CuotasPorCobrarView: botones de 44 px', () => {
  it('Cobrar es el botón principal de 44 px y abre el cobro; Llamar y WhatsApp son secundarios de 44 px', () => {
    const onCobrar = vi.fn();
    render(<CuotasPorCobrarView cuotas={[cuota({})]} onCobrar={onCobrar} onVolver={vi.fn()} />);

    const tarjeta = tarjetaDe('Juan Pérez');
    const cobrar = within(tarjeta).getByRole('button', { name: 'Cobrar' });
    expect(cobrar).toHaveClass('min-h-11', 'bg-marca');
    expect(within(tarjeta).getByRole('link', { name: 'Llamar' })).toHaveClass('min-h-11');
    expect(within(tarjeta).getByRole('link', { name: 'WhatsApp' })).toHaveClass('min-h-11');

    fireEvent.click(cobrar);
    expect(onCobrar).toHaveBeenCalledWith(expect.objectContaining({ cuotaId: 'c1' }));
  });
});

describe('CuotasPorCobrarView: el teléfono como texto', () => {
  it('el teléfono va como texto chico debajo del comprador, sin subrayado ni link', () => {
    render(<CuotasPorCobrarView cuotas={[cuota({})]} onCobrar={vi.fn()} onVolver={vi.fn()} />);

    const tarjeta = tarjetaDe('Juan Pérez');
    const telefono = within(tarjeta).getByText('11 1234 5678');
    const comprador = within(tarjeta).getByText('Juan Pérez');

    expect(within(tarjeta).queryByRole('link', { name: '11 1234 5678' })).not.toBeInTheDocument();
    expect(telefono).not.toHaveClass('underline');
    expect(telefono).toHaveClass('text-xs');
    expect(comprador.compareDocumentPosition(telefono) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('CuotasPorCobrarView: el href de Llamar y de WhatsApp', () => {
  it('Llamar marca el teléfono tal como se cargó, solo con dígitos y +', () => {
    render(
      <CuotasPorCobrarView
        cuotas={[cuota({ compradorTelefono: '+54 9 387 412 3456' })]}
        onCobrar={vi.fn()}
        onVolver={vi.fn()}
      />
    );

    expect(within(tarjetaDe('Juan Pérez')).getByRole('link', { name: 'Llamar' })).toHaveAttribute('href', 'tel:+5493874123456');
  });

  it('WhatsApp abre el chat del celular armado con el mensaje de la cuota, en otra pestaña', () => {
    render(<CuotasPorCobrarView cuotas={[cuota({})]} onCobrar={vi.fn()} onVolver={vi.fn()} />);

    const whatsapp = within(tarjetaDe('Juan Pérez')).getByRole('link', { name: 'WhatsApp' });
    expect(decodeURIComponent(whatsapp.getAttribute('href') ?? '')).toBe(
      'https://wa.me/5491112345678?text=Hola Juan Pérez, te escribo por la cuota 2 de 4 de $ 500.000 que vence el 15/12'
    );
    expect(whatsapp).toHaveAttribute('target', '_blank');
    expect(whatsapp).toHaveAttribute('rel', 'noopener');
  });
});
