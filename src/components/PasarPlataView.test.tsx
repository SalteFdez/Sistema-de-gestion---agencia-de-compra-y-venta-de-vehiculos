import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import React from 'react';
import { PasarPlataView } from './PasarPlataView';

const cuentas = [
  { id: 'c1', nombre: 'Caja efectivo', saldo: 3000000 },
  { id: 'c2', nombre: 'Banco', saldo: 1500000 },
];

describe('PasarPlataView', () => {
  it('en "hacia" no aparece la cuenta que ya se eligió en "desde"', () => {
    render(<PasarPlataView cuentas={cuentas} onRegistrar={vi.fn()} onVolver={vi.fn()} />);

    fireEvent.click(within(screen.getByRole('group', { name: 'Desde' })).getByRole('button', { name: /caja efectivo/i }));

    const hacia = screen.getByRole('group', { name: 'Hacia' });
    expect(within(hacia).queryByRole('button', { name: /caja efectivo/i })).not.toBeInTheDocument();
    expect(within(hacia).getByRole('button', { name: /banco/i })).toBeInTheDocument();
  });

  it('confirma con monto, desde, hacia y descripción, y lo manda a registrar', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({ success: true });
    render(<PasarPlataView cuentas={cuentas} onRegistrar={onRegistrar} onVolver={vi.fn()} />);

    fireEvent.click(within(screen.getByRole('group', { name: 'Desde' })).getByRole('button', { name: /caja efectivo/i }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Hacia' })).getByRole('button', { name: /banco/i }));
    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '1000000' } });
    fireEvent.change(screen.getByLabelText(/descripción/i), { target: { value: 'Depósito del efectivo' } });
    fireEvent.click(screen.getByRole('button', { name: /pasar plata/i }));

    expect(onRegistrar).toHaveBeenCalledWith({
      origenId: 'c1',
      destinoId: 'c2',
      monto: 1000000,
      descripcion: 'Depósito del efectivo',
    });
  });

  it('si el origen va a quedar en negativo, avisa y no registra hasta confirmar', () => {
    const onRegistrar = vi.fn().mockResolvedValue({ success: true });
    render(<PasarPlataView cuentas={cuentas} onRegistrar={onRegistrar} onVolver={vi.fn()} />);

    fireEvent.click(within(screen.getByRole('group', { name: 'Desde' })).getByRole('button', { name: /caja efectivo/i }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Hacia' })).getByRole('button', { name: /banco/i }));
    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '4000000' } });
    fireEvent.click(screen.getByRole('button', { name: /pasar plata/i }));

    expect(onRegistrar).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveTextContent('La cuenta Caja efectivo va a quedar en $ −1.000.000');

    fireEvent.click(screen.getByRole('button', { name: /confirmar igual/i }));
    expect(onRegistrar).toHaveBeenCalledWith(expect.objectContaining({ origenId: 'c1', destinoId: 'c2', monto: 4000000 }));
  });

  it('si el registro falla, muestra el error y conserva lo cargado', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({
      success: false,
      error: 'Sin conexión. No se pudo confirmar si se pasó la plata: revisá antes de reintentar.',
    });
    render(<PasarPlataView cuentas={cuentas} onRegistrar={onRegistrar} onVolver={vi.fn()} />);

    fireEvent.click(within(screen.getByRole('group', { name: 'Desde' })).getByRole('button', { name: /caja efectivo/i }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Hacia' })).getByRole('button', { name: /banco/i }));
    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '1000000' } });
    fireEvent.click(screen.getByRole('button', { name: /pasar plata/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo confirmar/i);
    expect(screen.getByLabelText(/monto/i)).toHaveValue('$ 1.000.000');
    expect(within(screen.getByRole('group', { name: 'Desde' })).getByRole('button', { name: /caja efectivo/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('si el pase sale bien, muestra el resumen "Pasaste $ 1.000.000 de Caja efectivo a Banco"', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({ success: true });
    render(<PasarPlataView cuentas={cuentas} onRegistrar={onRegistrar} onVolver={vi.fn()} />);

    fireEvent.click(within(screen.getByRole('group', { name: 'Desde' })).getByRole('button', { name: /caja efectivo/i }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Hacia' })).getByRole('button', { name: /banco/i }));
    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '1000000' } });
    fireEvent.click(screen.getByRole('button', { name: /pasar plata/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('Pasaste $ 1.000.000 de Caja efectivo a Banco');
  });

  it('con monto 0 no registra y lo dice en pantalla', () => {
    const onRegistrar = vi.fn();
    render(<PasarPlataView cuentas={cuentas} onRegistrar={onRegistrar} onVolver={vi.fn()} />);

    fireEvent.click(within(screen.getByRole('group', { name: 'Desde' })).getByRole('button', { name: /caja efectivo/i }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Hacia' })).getByRole('button', { name: /banco/i }));
    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /pasar plata/i }));

    expect(onRegistrar).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/mayor que 0/i);
  });
});
