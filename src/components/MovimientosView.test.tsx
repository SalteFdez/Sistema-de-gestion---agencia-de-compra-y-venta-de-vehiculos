import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import React from 'react';
import { MovimientosView } from './MovimientosView';
import type { MovimientoItem } from '../lib/vehiculos/vehiculos-service';

const base: MovimientoItem = {
  id: 'm1', fecha: '2026-11-14', tipo: 'ingreso_otro', monto: 80000, descripcion: 'Comisión por intermediación',
  cuentaNombre: 'Banco', vehiculoId: null, vehiculoCodigo: null, categoriaNombre: 'Comisión', creadoPor: 'Lautaro',
  anulado: false, anuladoPor: null, anuladoEl: null, motivoAnulacion: null, gastoId: null, ventaId: null,
};

describe('MovimientosView', () => {
  it('muestra cada movimiento con fecha, tipo en palabras, cuenta, monto con signo y quién lo cargó', () => {
    render(<MovimientosView movimientos={[base]} onVolver={vi.fn()} />);

    const fila = screen.getByText('Comisión por intermediación').closest('li') as HTMLElement;
    expect(within(fila).getByText('14/11/2026')).toBeInTheDocument();
    expect(within(fila).getByText('Ingreso')).toBeInTheDocument();
    expect(within(fila).getByText('Banco')).toBeInTheDocument();
    expect(within(fila).getByText('+ $ 80.000')).toHaveClass('text-green-700');
    expect(within(fila).getByText('Cargó Lautaro')).toBeInTheDocument();
  });

  it('un gasto (sale de la cuenta) va en rojo; un anulado aparece tachado con quién y por qué', () => {
    const gasto: MovimientoItem = {
      ...base, id: 'm2', tipo: 'gasto', monto: -250000, descripcion: 'Pintura puerta',
      categoriaNombre: 'Chapa y pintura', vehiculoCodigo: 'MC-010', anulado: true, anuladoPor: 'Antonio',
      motivoAnulacion: 'cargué mal el monto', gastoId: 'g1',
    };

    render(<MovimientosView movimientos={[gasto]} onVolver={vi.fn()} />);

    const fila = screen.getByText('Pintura puerta').closest('li') as HTMLElement;
    expect(within(fila).getByText('- $ 250.000')).toHaveClass('text-red-600');
    expect(fila).toHaveClass('line-through');
    expect(within(fila).getByText(/Anulado por Antonio/)).toBeInTheDocument();
    expect(within(fila).getByText(/cargué mal el monto/)).toBeInTheDocument();
  });

  it('un anulado muestra "Anulado por X el dd/mm" con el día de la anulación (hora de Buenos Aires)', () => {
    const anulado: MovimientoItem = {
      ...base, id: 'm9', anulado: true, anuladoPor: 'Antonio', anuladoEl: '2026-11-14T15:30:00+00:00',
      motivoAnulacion: 'cargué mal', descripcion: 'Comisión anulada',
    };

    render(<MovimientosView movimientos={[anulado]} onVolver={vi.fn()} />);

    expect(screen.getByText(/Anulado por Antonio el 14\/11/)).toBeInTheDocument();
  });

  it('al tocar un movimiento se ve su detalle: "Anular" si se puede, o de qué operación es parte', () => {
    const compra: MovimientoItem = {
      ...base, id: 'm7', tipo: 'compra', monto: -4500000, descripcion: 'Compra MC-007',
      vehiculoCodigo: 'MC-007', categoriaNombre: null, gastoId: null,
    };

    render(
      <MovimientosView movimientos={[base, compra]} onAnular={vi.fn()} onVolver={vi.fn()} />
    );

    fireEvent.click(screen.getByText('Comisión por intermediación'));
    expect(screen.getByRole('button', { name: /anular/i })).toBeInTheDocument();

    fireEvent.click(screen.getByText('Compra MC-007'));
    expect(screen.queryByRole('button', { name: /anular/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ver vehículo/i })).toBeInTheDocument();
  });

  it('un movimiento de compra o de cobro de venta ofrece "Ver vehículo", que lleva a su detalle', () => {
    const onVerVehiculo = vi.fn();
    const compra: MovimientoItem = {
      ...base, id: 'm11', tipo: 'compra', monto: -4500000, descripcion: 'Compra MC-007',
      vehiculoCodigo: 'MC-007', vehiculoId: 'v7', categoriaNombre: null, gastoId: null,
    };

    render(<MovimientosView movimientos={[compra]} onVerVehiculo={onVerVehiculo} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByText('Compra MC-007'));
    fireEvent.click(screen.getByRole('button', { name: /ver vehículo/i }));

    expect(onVerVehiculo).toHaveBeenCalledWith('v7');
  });

  it('anular pide un motivo obligatorio y una confirmación que dice qué se anula', () => {
    const onAnular = vi.fn();
    render(<MovimientosView movimientos={[base]} onAnular={onAnular} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByText('Comisión por intermediación'));
    fireEvent.click(screen.getByRole('button', { name: /^anular$/i }));

    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveTextContent('Vas a anular el ingreso de $ 80.000');
    const confirmar = within(dialogo).getByRole('button', { name: /anular movimiento/i });
    expect(confirmar).toBeDisabled();

    fireEvent.change(within(dialogo).getByLabelText(/motivo/i), { target: { value: 'cargué mal el monto' } });
    expect(confirmar).toBeEnabled();

    fireEvent.click(confirmar);
    expect(onAnular).toHaveBeenCalledWith(base, 'cargué mal el monto');
  });

  it('si la anulación falla, muestra el motivo y deja el diálogo abierto con el motivo cargado', async () => {
    const onAnular = vi.fn().mockResolvedValue({ success: false, error: 'Sin conexión. No se anuló nada.' });
    render(<MovimientosView movimientos={[base]} onAnular={onAnular} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByText('Comisión por intermediación'));
    fireEvent.click(screen.getByRole('button', { name: /^anular$/i }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText(/motivo/i), { target: { value: 'cargué mal el monto' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: /anular movimiento/i }));

    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(/no se anuló nada/i);
    expect(within(screen.getByRole('dialog')).getByLabelText(/motivo/i)).toHaveValue('cargué mal el monto');
  });

  it('un aporte y un retiro se muestran como "Aporte de Lautaro" y "Retiro de Lautaro"', () => {
    const aporte: MovimientoItem = {
      ...base, id: 'a1', tipo: 'aporte_socio', monto: 500000, descripcion: null, socioNombre: 'Lautaro',
    };
    const retiro: MovimientoItem = {
      ...base, id: 'r1', tipo: 'retiro_socio', monto: -300000, descripcion: null, socioNombre: 'Lautaro',
    };

    render(<MovimientosView movimientos={[aporte, retiro]} onVolver={vi.fn()} />);

    expect(screen.getByText('Aporte de Lautaro')).toBeInTheDocument();
    expect(screen.getByText('Retiro de Lautaro')).toBeInTheDocument();
  });

  it('las dos patas de un pase se muestran como "Pase a Banco" y "Pase desde Caja efectivo"', () => {
    const salida: MovimientoItem = {
      ...base, id: 'p1', tipo: 'transferencia_salida', monto: -1000000, descripcion: 'Depósito del efectivo',
      cuentaNombre: 'Caja efectivo', cuentaContraparte: 'Banco', transferenciaId: 't1',
    };
    const entrada: MovimientoItem = {
      ...base, id: 'p2', tipo: 'transferencia_entrada', monto: 1000000, descripcion: 'Depósito del efectivo',
      cuentaNombre: 'Banco', cuentaContraparte: 'Caja efectivo', transferenciaId: 't1',
    };

    render(<MovimientosView movimientos={[salida, entrada]} onVolver={vi.fn()} />);

    expect(screen.getByText('Pase a Banco')).toBeInTheDocument();
    expect(screen.getByText('Pase desde Caja efectivo')).toBeInTheDocument();
  });

  it('aporte y entrada de pase suman en verde; retiro y salida de pase restan en rojo', () => {
    const aporte: MovimientoItem = {
      ...base, id: 'a1', tipo: 'aporte_socio', monto: 500000, descripcion: null, socioNombre: 'Lautaro',
    };
    const retiro: MovimientoItem = {
      ...base, id: 'r1', tipo: 'retiro_socio', monto: -300000, descripcion: null, socioNombre: 'Lautaro',
    };
    const salida: MovimientoItem = {
      ...base, id: 'p1', tipo: 'transferencia_salida', monto: -900000, descripcion: 'Depósito del efectivo',
      cuentaContraparte: 'Banco', transferenciaId: 't1',
    };
    const entrada: MovimientoItem = {
      ...base, id: 'p2', tipo: 'transferencia_entrada', monto: 1200000, descripcion: 'Depósito del efectivo',
      cuentaContraparte: 'Caja efectivo', transferenciaId: 't1',
    };

    render(<MovimientosView movimientos={[aporte, retiro, salida, entrada]} onVolver={vi.fn()} />);

    const filaAporte = screen.getByText('Aporte de Lautaro').closest('li') as HTMLElement;
    expect(within(filaAporte).getByText('+ $ 500.000')).toHaveClass('text-green-700');

    const filaRetiro = screen.getByText('Retiro de Lautaro').closest('li') as HTMLElement;
    expect(within(filaRetiro).getByText('- $ 300.000')).toHaveClass('text-red-600');

    const filaSalida = screen.getByText('Pase a Banco').closest('li') as HTMLElement;
    expect(within(filaSalida).getByText('- $ 900.000')).toHaveClass('text-red-600');

    const filaEntrada = screen.getByText('Pase desde Caja efectivo').closest('li') as HTMLElement;
    expect(within(filaEntrada).getByText('+ $ 1.200.000')).toHaveClass('text-green-700');
  });

  it('cada tipo nuevo tiene su etiqueta en palabras: "Aporte de socio", "Retiro de socio" y "Pase"', () => {
    const aporte: MovimientoItem = {
      ...base, id: 'a1', tipo: 'aporte_socio', monto: 500000, descripcion: null, socioNombre: 'Lautaro',
    };
    const retiro: MovimientoItem = {
      ...base, id: 'r1', tipo: 'retiro_socio', monto: -300000, descripcion: null, socioNombre: 'Lautaro',
    };
    const salida: MovimientoItem = {
      ...base, id: 'p1', tipo: 'transferencia_salida', monto: -900000, descripcion: 'Depósito del efectivo',
      cuentaContraparte: 'Banco', transferenciaId: 't1',
    };

    render(<MovimientosView movimientos={[aporte, retiro, salida]} onVolver={vi.fn()} />);

    const filaAporte = screen.getByText('Aporte de Lautaro').closest('li') as HTMLElement;
    expect(within(filaAporte).getByText('Aporte de socio')).toBeInTheDocument();

    const filaRetiro = screen.getByText('Retiro de Lautaro').closest('li') as HTMLElement;
    expect(within(filaRetiro).getByText('Retiro de socio')).toBeInTheDocument();

    const filaSalida = screen.getByText('Pase a Banco').closest('li') as HTMLElement;
    expect(within(filaSalida).getByText('Pase')).toBeInTheDocument();
  });

  it('anular una pata de pase avisa que se anula el pase completo y dice de dónde vuelve la plata', () => {
    const onAnular = vi.fn();
    const salida: MovimientoItem = {
      ...base, id: 'p1', tipo: 'transferencia_salida', monto: -1000000, descripcion: 'Depósito del efectivo',
      cuentaNombre: 'Caja efectivo', cuentaContraparte: 'Banco', transferenciaId: 't1',
    };

    render(<MovimientosView movimientos={[salida]} onAnular={onAnular} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByText('Pase a Banco'));
    fireEvent.click(screen.getByRole('button', { name: /^anular$/i }));

    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveTextContent('Vas a anular el pase completo');
    expect(dialogo).toHaveTextContent('vuelven $ 1.000.000 de Banco a Caja efectivo');
  });

  it('anular un gasto repartido avisa a qué autos les baja el costo y cuánto', async () => {
    const vistaPreviaGasto = vi.fn().mockResolvedValue([
      { codigo: 'MC-010', monto: 250000 },
      { codigo: 'MC-012', monto: 50000 },
    ]);
    const gasto: MovimientoItem = {
      ...base, id: 'g1', tipo: 'gasto', monto: -300000, descripcion: 'Pintura y chapa',
      cuentaNombre: 'Caja efectivo', gastoId: 'g1', vehiculoCodigo: null, categoriaNombre: 'Chapa y pintura',
    };

    render(
      <MovimientosView
        movimientos={[gasto]}
        onAnular={vi.fn()}
        vistaPreviaGasto={vistaPreviaGasto}
        onVolver={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Pintura y chapa'));
    fireEvent.click(screen.getByRole('button', { name: /^anular$/i }));

    expect(await screen.findByText(/Baja el costo de MC-010 en \$ 250\.000 y de MC-012 en \$ 50\.000/)).toBeInTheDocument();
    expect(vistaPreviaGasto).toHaveBeenCalledWith('g1');
  });

  it('un cobro de cuota se muestra como "Cobro de cuota 2/4 · MC-014", en verde como entrada', () => {
    const cobro: MovimientoItem = {
      ...base, id: 'q1', tipo: 'cuota_cobro', monto: 500000, descripcion: 'Cuota 2/4 · MC-014',
      vehiculoCodigo: 'MC-014', cuotaNumero: 2, cuotaTotal: 4, categoriaNombre: null, gastoId: null,
    };

    render(<MovimientosView movimientos={[cobro]} onVolver={vi.fn()} />);

    const fila = screen.getByText('Cobro de cuota 2/4 · MC-014').closest('li') as HTMLElement;
    expect(within(fila).getByText('+ $ 500.000')).toHaveClass('text-green-700');
  });

  it('"Ver más" aparece cuando puede haber más movimientos y los trae', () => {
    const onVerMas = vi.fn();

    const { rerender } = render(
      <MovimientosView movimientos={[base]} hayMas={false} onVerMas={onVerMas} onVolver={vi.fn()} />
    );
    expect(screen.queryByRole('button', { name: /ver más/i })).not.toBeInTheDocument();

    rerender(<MovimientosView movimientos={[base]} hayMas={true} onVerMas={onVerMas} onVolver={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /ver más/i }));

    expect(onVerMas).toHaveBeenCalledTimes(1);
  });
});
