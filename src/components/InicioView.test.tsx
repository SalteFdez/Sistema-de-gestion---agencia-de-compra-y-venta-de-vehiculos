import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { InicioView } from './InicioView';

describe('InicioView', () => {
  const defaultProps = {
    nombreSocio: 'Agustín',
    totalDisponible: 1500000,
    cargandoPlata: false,
    errorPlata: false,
    onReintentarPlata: vi.fn(),
    cuotasVencidas: 3,
    pendientesTotal: 410000,
    onIrABalances: vi.fn(),
    onIrACuotas: vi.fn(),
    onIrAPendientes: vi.fn(),
    onComprar: vi.fn(),
    onVender: vi.fn(),
    onGasto: vi.fn(),
    onIngreso: vi.fn(),
  };

  it('no muestra "Dispositivo vinculado correctamente" y muestra el saludo chico', () => {
    render(<InicioView {...defaultProps} />);

    expect(screen.queryByText(/dispositivo vinculado correctamente/i)).not.toBeInTheDocument();
    expect(screen.getByText(/hola, agustín/i)).toBeInTheDocument();
  });

  it('muestra la tarjeta de dinero disponible, formatea con miles y tocarla lleva a Balances', () => {
    const onIrABalances = vi.fn();
    render(<InicioView {...defaultProps} onIrABalances={onIrABalances} />);

    expect(screen.getByText('$ 1.500.000')).toBeInTheDocument();
    const tarjeta = screen.getByRole('button', { name: /dinero disponible/i });
    fireEvent.click(tarjeta);
    expect(onIrABalances).toHaveBeenCalledTimes(1);
  });

  it('muestra saldo negativo en rojo', () => {
    render(<InicioView {...defaultProps} totalDisponible={-300000} />);
    const saldo = screen.getByText('$ −300.000');
    expect(saldo).toHaveClass('text-red-600');
  });

  it('muestra Cargando o ErrorReintentar según el estado', () => {
    const onReintentar = vi.fn();
    const { rerender } = render(<InicioView {...defaultProps} cargandoPlata={true} />);

    expect(screen.getByText('Cargando…')).toBeInTheDocument();

    rerender(<InicioView {...defaultProps} cargandoPlata={false} errorPlata={true} onReintentarPlata={onReintentar} />);
    expect(screen.getByText(/no se pudo cargar/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onReintentar).toHaveBeenCalledTimes(1);
  });

  it('muestra chips de aviso si existen y navegan a su pantalla', () => {
    const onIrACuotas = vi.fn();
    const onIrAPendientes = vi.fn();
    const { rerender } = render(
      <InicioView
        {...defaultProps}
        cuotasVencidas={2}
        pendientesTotal={150000}
        onIrACuotas={onIrACuotas}
        onIrAPendientes={onIrAPendientes}
      />
    );

    const chipCuotas = screen.getByRole('button', { name: /2 cuotas vencidas/i });
    fireEvent.click(chipCuotas);
    expect(onIrACuotas).toHaveBeenCalledTimes(1);

    const chipPendientes = screen.getByRole('button', { name: /\$ 150\.000 sin asignar/i });
    fireEvent.click(chipPendientes);
    expect(onIrAPendientes).toHaveBeenCalledTimes(1);

    // Si están en 0, no se muestran
    rerender(
      <InicioView
        {...defaultProps}
        cuotasVencidas={0}
        pendientesTotal={0}
      />
    );
    expect(screen.queryByRole('button', { name: /cuotas vencidas/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sin asignar/i })).not.toBeInTheDocument();
  });

  it('la grilla 2x2 contiene Comprar, Vender, Gasto e Ingreso', () => {
    const onComprar = vi.fn();
    const onVender = vi.fn();
    const onGasto = vi.fn();
    const onIngreso = vi.fn();

    render(
      <InicioView
        {...defaultProps}
        onComprar={onComprar}
        onVender={onVender}
        onGasto={onGasto}
        onIngreso={onIngreso}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /comprar/i }));
    expect(onComprar).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /vender/i }));
    expect(onVender).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /gasto/i }));
    expect(onGasto).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /ingreso/i }));
    expect(onIngreso).toHaveBeenCalledTimes(1);
  });
});
