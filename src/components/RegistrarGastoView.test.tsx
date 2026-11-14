import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { RegistrarGastoView } from './RegistrarGastoView';

const categorias = [
  { id: 'cat1', nombre: 'Mecánica' },
  { id: 'cat2', nombre: 'Repuestos' },
];

const cuentasPrueba = [{ id: 'c0', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 100000 }];

describe('RegistrarGastoView', () => {
  it('muestra el monto y una grilla de categorías, y al tocar una la marca', () => {
    render(<RegistrarGastoView categorias={categorias} cuentas={cuentasPrueba} onVolver={vi.fn()} />);

    expect(screen.getByLabelText(/monto/i)).toBeInTheDocument();
    const mecanica = screen.getByRole('button', { name: 'Mecánica' });
    expect(mecanica).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(mecanica);

    expect(screen.getByRole('button', { name: 'Mecánica' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Repuestos' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('elige la cuenta de salida con su saldo y si el gasto es general o de un vehículo', () => {
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 500000 }];

    render(<RegistrarGastoView categorias={categorias} cuentas={cuentas} onVolver={vi.fn()} />);

    const cuenta = screen.getByRole('button', { name: /caja efectivo/i });
    expect(cuenta).toHaveTextContent('$ 500.000');
    fireEvent.click(cuenta);
    expect(cuenta).toHaveAttribute('aria-pressed', 'true');

    const general = screen.getByRole('button', { name: 'General del negocio' });
    const vehiculo = screen.getByRole('button', { name: 'Un vehículo' });
    fireEvent.click(general);
    expect(general).toHaveAttribute('aria-pressed', 'true');
    expect(vehiculo).toHaveAttribute('aria-pressed', 'false');
  });

  it('al confirmar, manda el gasto general con monto, categoría y cuenta', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({ success: true, gastoId: 'g1', saldoCuenta: -150000 });
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 500000 }];

    render(
      <RegistrarGastoView
        categorias={categorias}
        cuentas={cuentas}
        onVolver={vi.fn()}
        onRegistrar={onRegistrar}
      />
    );

    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '250000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Repuestos' }));
    fireEvent.click(screen.getByRole('button', { name: /caja efectivo/i }));
    fireEvent.click(screen.getByRole('button', { name: 'General del negocio' }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(onRegistrar).toHaveBeenCalledWith(
      expect.objectContaining({ monto: 250000, categoriaId: 'cat2', cuentaId: 'c1', vehiculoId: null })
    );
  });

  it('si la cuenta quedaría en negativo, pide confirmación y "Volver" no guarda nada', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({ success: true, gastoId: 'g1' });
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 100000 }];

    render(
      <RegistrarGastoView categorias={categorias} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={onRegistrar} />
    );

    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '250000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mecánica' }));
    fireEvent.click(screen.getByRole('button', { name: /caja efectivo/i }));
    fireEvent.click(screen.getByRole('button', { name: 'General del negocio' }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveTextContent('La cuenta Caja efectivo va a quedar en $ −150.000');

    fireEvent.click(within(dialogo).getByRole('button', { name: /volver/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onRegistrar).not.toHaveBeenCalled();
  });

  it('con el aviso de negativo, "Confirmar igual" sí guarda el gasto', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({ success: true, gastoId: 'g1' });
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 100000 }];

    render(
      <RegistrarGastoView categorias={categorias} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={onRegistrar} />
    );

    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '250000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mecánica' }));
    fireEvent.click(screen.getByRole('button', { name: /caja efectivo/i }));
    fireEvent.click(screen.getByRole('button', { name: 'General del negocio' }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    const dialogo = await screen.findByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: /confirmar igual/i }));

    expect(onRegistrar).toHaveBeenCalledTimes(1);
    expect(onRegistrar).toHaveBeenCalledWith(expect.objectContaining({ monto: 250000, cuentaId: 'c1' }));
  });

  it('la descripción es opcional y, si se escribe, se manda al servicio', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({ success: true, gastoId: 'g2' });
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 500000 }];

    render(
      <RegistrarGastoView categorias={categorias} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={onRegistrar} />
    );

    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '250000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mecánica' }));
    fireEvent.click(screen.getByRole('button', { name: /caja efectivo/i }));
    fireEvent.click(screen.getByRole('button', { name: 'General del negocio' }));
    fireEvent.change(screen.getByLabelText(/descripción/i), { target: { value: 'Pintura puerta' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(onRegistrar).toHaveBeenCalledWith(expect.objectContaining({ descripcion: 'Pintura puerta' }));
  });

  it('después de guardar, muestra el resumen del gasto: monto, categoría, vehículo y cuenta', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({
      success: true,
      gastoId: 'g3',
      vehiculoCodigo: 'MC-010',
      saldoCuenta: 250000,
    });
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 500000 }];
    const vehiculos = [
      { id: 'v10', codigo: 'MC-010', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, estado: 'en_stock' as const, fotoUrl: null, fechaIngreso: '2026-11-13' },
    ];

    render(
      <RegistrarGastoView
        categorias={categorias}
        cuentas={cuentas}
        vehiculos={vehiculos}
        onVolver={vi.fn()}
        onRegistrar={onRegistrar}
      />
    );

    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '250000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mecánica' }));
    fireEvent.click(screen.getByRole('button', { name: /caja efectivo/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Un vehículo' }));
    fireEvent.click(screen.getByText('MC-010'));
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(await screen.findByText('Gasto de $ 250.000 · Mecánica · MC-010 · salió de Caja efectivo')).toBeInTheDocument();
  });

  it('si el guardado falla, muestra el motivo y conserva los datos para reintentar', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({ success: false, error: 'Sin conexión. No se guardó nada.' });
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 500000 }];

    render(
      <RegistrarGastoView categorias={categorias} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={onRegistrar} />
    );

    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '250000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mecánica' }));
    fireEvent.click(screen.getByRole('button', { name: /caja efectivo/i }));
    fireEvent.click(screen.getByRole('button', { name: 'General del negocio' }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se guardó nada/i);
    expect(screen.getByLabelText(/monto/i)).toHaveValue('250000');
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeEnabled();
  });

  it('con un vehículo preseleccionado (desde su detalle), arranca en "Un vehículo" con ese vehículo elegido', () => {
    const vehiculos = [
      { id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, estado: 'en_stock' as const, fotoUrl: null, fechaIngreso: '2026-11-13' },
      { id: 'v2', codigo: 'MC-002', marca: 'Ford', modelo: 'Ka', anio: 2012, color: null, estado: 'en_stock' as const, fotoUrl: null, fechaIngreso: '2026-11-13' },
    ];

    render(
      <RegistrarGastoView
        categorias={categorias}
        cuentas={cuentasPrueba}
        vehiculos={vehiculos}
        vehiculoPreseleccionado="v2"
        onVolver={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Un vehículo' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByText('MC-002').closest('article') as HTMLElement).getByText('MC-002')).toBeInTheDocument();
    expect(screen.getByText('MC-002').closest('article')).toHaveClass('border-blue-600');
  });

  it('sin cuentas cargadas, avisa en lugar del formulario y permite cargar la primera', () => {
    const onIrACuentas = vi.fn();

    render(
      <RegistrarGastoView categorias={categorias} cuentas={[]} onVolver={vi.fn()} onIrACuentas={onIrACuentas} />
    );

    expect(screen.getByText(/no hay cuentas cargadas/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/monto/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cargar la primera cuenta/i }));
    expect(onIrACuentas).toHaveBeenCalledTimes(1);
  });

  it('Confirmar queda deshabilitado hasta tener monto, categoría, cuenta y alcance (y vehículo si corresponde)', () => {
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 500000 }];
    const vehiculos = [
      { id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, estado: 'en_stock' as const, fotoUrl: null, fechaIngreso: '2026-11-13' },
    ];

    render(<RegistrarGastoView categorias={categorias} cuentas={cuentas} vehiculos={vehiculos} onVolver={vi.fn()} />);

    const confirmar = screen.getByRole('button', { name: /confirmar/i });
    expect(confirmar).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '250000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mecánica' }));
    fireEvent.click(screen.getByRole('button', { name: /caja efectivo/i }));
    fireEvent.click(screen.getByRole('button', { name: 'General del negocio' }));
    expect(confirmar).toBeEnabled();

    // Con "Un vehículo" hay que elegir el vehículo
    fireEvent.click(screen.getByRole('button', { name: 'Un vehículo' }));
    expect(confirmar).toBeDisabled();
    fireEvent.click(screen.getByText('MC-001'));
    expect(confirmar).toBeEnabled();
  });

  it('con "Un vehículo", lista los vehículos con foto: primero en stock, después vendidos marcados "Vendido"', () => {
    const vehiculos = [
      { id: 'v2', codigo: 'MC-002', marca: 'Ford', modelo: 'Ka', anio: 2012, color: null, estado: 'vendido' as const, fotoUrl: null, fechaIngreso: '2026-11-13' },
      { id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, estado: 'en_stock' as const, fotoUrl: null, fechaIngreso: '2026-11-13' },
    ];

    render(
      <RegistrarGastoView categorias={categorias} cuentas={cuentasPrueba} vehiculos={vehiculos} onVolver={vi.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Un vehículo' }));

    const tarjetas = screen.getAllByRole('article');
    expect(tarjetas).toHaveLength(2);
    expect(tarjetas[0]).toHaveTextContent('MC-001');
    expect(tarjetas[1]).toHaveTextContent('MC-002');
    expect(within(tarjetas[1]).getByText('Vendido')).toBeInTheDocument();
    expect(within(tarjetas[0]).queryByText('Vendido')).not.toBeInTheDocument();
  });
});
