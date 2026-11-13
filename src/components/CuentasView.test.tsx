import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { CuentasView } from './CuentasView';
import type { CuentaItem, CuentasService } from '../lib/cuentas/cuentas-service';

describe('CuentasView', () => {
  const cuentasIniciales: CuentaItem[] = [
    { id: '1', nombre: 'Caja efectivo', tipo: 'efectivo', saldo: 1500000 },
  ];

  it('muestra la lista de cuentas existentes con su saldo formateado', () => {
    render(
      <CuentasView
        cuentasIniciales={cuentasIniciales}
        cuentasService={{} as CuentasService}
        onVolver={() => {}}
      />
    );

    expect(screen.getByText('Caja efectivo')).toBeInTheDocument();
    expect(screen.getByText('$ 1.500.000')).toBeInTheDocument();
  });

  it('valida en frontend si el nombre está vacío', async () => {
    const mockService = {
      crearCuenta: vi.fn(),
    };

    render(
      <CuentasView
        cuentasIniciales={cuentasIniciales}
        cuentasService={mockService as unknown as CuentasService}
        onVolver={() => {}}
      />
    );

    // Intentamos guardar sin nombre
    fireEvent.click(screen.getByRole('button', { name: /guardar cuenta/i }));

    expect(await screen.findByText(/el nombre no puede estar vacío/i)).toBeInTheDocument();
    expect(mockService.crearCuenta).not.toHaveBeenCalled();
  });

  it('valida en frontend si el nombre ya existe (sin importar mayúsculas)', async () => {
    const mockService = {
      crearCuenta: vi.fn(),
    };

    render(
      <CuentasView
        cuentasIniciales={cuentasIniciales}
        cuentasService={mockService as unknown as CuentasService}
        onVolver={() => {}}
      />
    );

    // Escribimos "caja efectivo" (mismo nombre con minúsculas)
    fireEvent.change(screen.getByLabelText(/nombre de la cuenta/i), {
      target: { value: 'caja efectivo' },
    });

    fireEvent.click(screen.getByRole('button', { name: /guardar cuenta/i }));

    expect(await screen.findByText(/ya existe una cuenta con ese nombre/i)).toBeInTheDocument();
    expect(mockService.crearCuenta).not.toHaveBeenCalled();
  });

  it('crea una cuenta exitosamente y la agrega a la lista', async () => {
    const mockService = {
      crearCuenta: vi.fn().mockResolvedValue({
        success: true,
        cuenta: { id: '2', nombre: 'Banco Santander', tipo: 'banco', saldo: 2500000 },
      }),
    };

    render(
      <CuentasView
        cuentasIniciales={cuentasIniciales}
        cuentasService={mockService as unknown as CuentasService}
        onVolver={() => {}}
      />
    );

    fireEvent.change(screen.getByLabelText(/nombre de la cuenta/i), {
      target: { value: 'Banco Santander' },
    });
    fireEvent.change(screen.getByLabelText(/tipo de cuenta/i), {
      target: { value: 'banco' },
    });
    fireEvent.change(screen.getByLabelText(/saldo inicial/i), {
      target: { value: '2500000' },
    });

    fireEvent.click(screen.getByRole('button', { name: /guardar cuenta/i }));

    await waitFor(() => {
      expect(mockService.crearCuenta).toHaveBeenCalledWith({
        nombre: 'Banco Santander',
        tipo: 'banco',
        saldoInicial: 2500000,
      });
    });

    expect(await screen.findByText('Banco Santander')).toBeInTheDocument();
    expect(screen.getByText('$ 2.500.000')).toBeInTheDocument();
  });
});
