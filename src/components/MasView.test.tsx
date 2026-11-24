import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MasView } from './MasView';

describe('MasView', () => {
  const defaultProps = {
    onBalances: vi.fn(),
    onMoverPlata: vi.fn(),
    onCuotas: vi.fn(),
    onPendientes: vi.fn(),
    onGanancia: vi.fn(),
    onCuentas: vi.fn(),
    onChangePin: vi.fn(),
    onBloquear: vi.fn(),
    onDesvincular: vi.fn(),
  };

  it('muestra los 9 accesos esperados', () => {
    render(<MasView {...defaultProps} />);

    expect(screen.getByRole('button', { name: /balances/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mover plata/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cuotas por cobrar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pendientes de asignar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ganancia por mes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cuentas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cambiar pin/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bloquear/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /desvincular dispositivo/i })).toBeInTheDocument();
  });

  it('Bloquear llama inmediatamente a onBloquear', () => {
    const onBloquear = vi.fn();
    render(<MasView {...defaultProps} onBloquear={onBloquear} />);

    fireEvent.click(screen.getByRole('button', { name: /bloquear/i }));
    expect(onBloquear).toHaveBeenCalledTimes(1);
  });

  it('Desvincular abre diálogo de confirmación y solo desvincula si se confirma', () => {
    const onDesvincular = vi.fn();
    render(<MasView {...defaultProps} onDesvincular={onDesvincular} />);

    // Tocar desvincular abre diálogo
    fireEvent.click(screen.getByRole('button', { name: /desvincular dispositivo/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/vas a tener que volver a ingresar/i)).toBeInTheDocument();

    // Tocar Volver dentro del diálogo no desvincula y cierra el diálogo
    const botonVolver = screen.getByRole('button', { name: 'Volver' });
    fireEvent.click(botonVolver);
    expect(onDesvincular).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Abrir de nuevo y confirmar
    fireEvent.click(screen.getByRole('button', { name: /desvincular dispositivo/i }));
    const botonConfirmar = screen.getByRole('button', { name: 'Desvincular' });
    fireEvent.click(botonConfirmar);
    expect(onDesvincular).toHaveBeenCalledTimes(1);
  });
});
