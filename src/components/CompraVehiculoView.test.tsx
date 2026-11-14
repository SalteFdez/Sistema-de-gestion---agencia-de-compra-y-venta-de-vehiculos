import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { CompraVehiculoView } from './CompraVehiculoView';

describe('CompraVehiculoView', () => {
  it('sin cuentas cargadas muestra un aviso y lleva a cargar la primera cuenta', () => {
    const onIrACuentas = vi.fn();

    render(<CompraVehiculoView cuentas={[]} onVolver={vi.fn()} onIrACuentas={onIrACuentas} />);

    expect(screen.getByText(/no hay cuentas cargadas/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cargar la primera cuenta/i }));
    expect(onIrACuentas).toHaveBeenCalledTimes(1);
  });

  it('con cuentas, la primera fila de pago viene con la primera cuenta elegida', () => {
    const cuentas = [
      { id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 },
      { id: 'c2', nombre: 'Banco Galicia', tipo: 'banco' as const, saldo: 1000000 },
    ];

    render(<CompraVehiculoView cuentas={cuentas} onVolver={vi.fn()} onIrACuentas={vi.fn()} />);

    expect(screen.getByLabelText(/cuenta de pago 1/i)).toHaveValue('c1');
  });

  it('el monto de la primera cuenta viene con el precio completo', () => {
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 }];

    render(<CompraVehiculoView cuentas={cuentas} onVolver={vi.fn()} onIrACuentas={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/precio de compra/i), { target: { value: '3000000' } });

    expect(screen.getByLabelText('Monto pago 1')).toHaveValue('3000000');
  });

  it('muestra cuánto falta para cerrar el precio con los pagos, y Confirmar queda deshabilitado', () => {
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 }];

    render(<CompraVehiculoView cuentas={cuentas} onVolver={vi.fn()} onIrACuentas={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/precio de compra/i), { target: { value: '3000000' } });
    fireEvent.change(screen.getByLabelText('Monto pago 1'), { target: { value: '1000000' } });

    expect(screen.getByText('Faltan $ 2.000.000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeDisabled();
  });

  it('si una cuenta quedaría en negativo, Confirmar pide confirmación y "Volver" no guarda nada', async () => {
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 1000000 }];
    const onRegistrar = vi.fn();

    render(
      <CompraVehiculoView cuentas={cuentas} onVolver={vi.fn()} onIrACuentas={vi.fn()} onRegistrar={onRegistrar} />
    );

    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/precio de compra/i), { target: { value: '1500000' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveTextContent('La cuenta Caja efectivo va a quedar en $ −500.000');

    fireEvent.click(within(dialogo).getByRole('button', { name: /volver/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onRegistrar).not.toHaveBeenCalled();
  });

  it('con el aviso de negativo, "Confirmar igual" sí manda la compra', async () => {
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 1000000 }];
    const onRegistrar = vi.fn().mockResolvedValue({ success: true, codigo: 'MC-020' });

    render(
      <CompraVehiculoView cuentas={cuentas} onVolver={vi.fn()} onIrACuentas={vi.fn()} onRegistrar={onRegistrar} />
    );

    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/precio de compra/i), { target: { value: '1500000' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    const dialogo = await screen.findByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: /confirmar igual/i }));

    expect(onRegistrar).toHaveBeenCalledTimes(1);
    expect(onRegistrar).toHaveBeenCalledWith(
      expect.objectContaining({
        marca: 'Fiat',
        modelo: 'Uno',
        anio: 2010,
        precio: 1500000,
        pagos: [{ cuentaId: 'c1', monto: 1500000 }],
      })
    );
  });

  it('al confirmar bien, muestra el código asignado en grande y un resumen de qué cuentas pagaron', async () => {
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 }];
    const onRegistrar = vi.fn().mockResolvedValue({ success: true, codigo: 'MC-007' });

    render(
      <CompraVehiculoView cuentas={cuentas} onVolver={vi.fn()} onIrACuentas={vi.fn()} onRegistrar={onRegistrar} />
    );

    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/precio de compra/i), { target: { value: '1500000' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(await screen.findByTestId('codigo-compra')).toHaveTextContent('MC-007');
    expect(screen.getByText('Salieron $ 1.500.000 de Caja efectivo')).toBeInTheDocument();
  });

  it('si el año está fuera de rango, avisa el motivo y Confirmar queda deshabilitado', () => {
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 }];

    render(<CompraVehiculoView cuentas={cuentas} onVolver={vi.fn()} onIrACuentas={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '1900' } });
    fireEvent.change(screen.getByLabelText(/precio de compra/i), { target: { value: '1500000' } });

    expect(screen.getByText(/el año tiene que estar entre 1950/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeDisabled();
  });

  it('si una cuenta se repite o un pago es 0, avisa y Confirmar queda deshabilitado', () => {
    const cuentas = [
      { id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 },
      { id: 'c2', nombre: 'Banco Galicia', tipo: 'banco' as const, saldo: 1000000 },
    ];

    render(<CompraVehiculoView cuentas={cuentas} onVolver={vi.fn()} onIrACuentas={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/precio de compra/i), { target: { value: '1500000' } });
    fireEvent.click(screen.getByRole('button', { name: /agregar otra cuenta/i }));

    // La segunda fila arranca con c2; la llevo a c1 (repetida) y le pongo monto 0
    fireEvent.change(screen.getByLabelText(/cuenta de pago 2/i), { target: { value: 'c1' } });
    fireEvent.change(screen.getByLabelText('Monto pago 2'), { target: { value: '0' } });

    expect(screen.getByText(/cada pago tiene que ser mayor que 0/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeDisabled();
  });

  it('"+ Agregar otra cuenta" suma una fila de pago para repartir el precio', () => {
    const cuentas = [
      { id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 },
      { id: 'c2', nombre: 'Banco Galicia', tipo: 'banco' as const, saldo: 1000000 },
    ];

    render(<CompraVehiculoView cuentas={cuentas} onVolver={vi.fn()} onIrACuentas={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /agregar otra cuenta/i }));

    expect(screen.getByLabelText(/cuenta de pago 2/i)).toHaveValue('c2');
    expect(screen.getByLabelText('Monto pago 2')).toBeInTheDocument();
  });

  it('color, patente, vendedor y foto son opcionales y se mandan al registrar la compra', async () => {
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 }];
    const onRegistrar = vi.fn().mockResolvedValue({ success: true, codigo: 'MC-040' });
    const foto = new File(['jpeg'], 'compra.jpg', { type: 'image/jpeg' });

    render(
      <CompraVehiculoView
        cuentas={cuentas}
        onVolver={vi.fn()}
        onIrACuentas={vi.fn()}
        onRegistrar={onRegistrar}
        comprimirFoto={async (f) => f}
      />
    );

    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/color/i), { target: { value: 'Rojo' } });
    fireEvent.change(screen.getByLabelText(/patente/i), { target: { value: 'AB123CD' } });
    fireEvent.change(screen.getByLabelText(/vendedor/i), { target: { value: 'Juan Pérez' } });
    fireEvent.change(screen.getByLabelText(/precio de compra/i), { target: { value: '1500000' } });
    fireEvent.change(screen.getByLabelText(/foto/i), { target: { files: [foto] } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(await screen.findByTestId('codigo-compra')).toHaveTextContent('MC-040');
    expect(onRegistrar).toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'Rojo',
        patente: 'AB123CD',
        vendedor: 'Juan Pérez',
        foto,
      })
    );
  });

  it('si el guardado falla, avisa que no se guardó nada y conserva los datos y pagos para reintentar', async () => {
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 }];
    const onRegistrar = vi.fn().mockResolvedValue({ success: false, error: 'Failed to fetch' });

    render(
      <CompraVehiculoView cuentas={cuentas} onVolver={vi.fn()} onIrACuentas={vi.fn()} onRegistrar={onRegistrar} />
    );

    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/precio de compra/i), { target: { value: '1500000' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se guardó nada/i);
    expect(screen.getByLabelText(/marca/i)).toHaveValue('Fiat');
    expect(screen.getByLabelText('Monto pago 1')).toHaveValue('1500000');
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeEnabled();
    expect(screen.queryByTestId('codigo-compra')).not.toBeInTheDocument();
  });

  it('si el guardado lanza una excepción (sin señal), también avisa y no se pierde nada', async () => {
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 }];
    const onRegistrar = vi.fn().mockRejectedValue(new Error('Network down'));

    render(
      <CompraVehiculoView cuentas={cuentas} onVolver={vi.fn()} onIrACuentas={vi.fn()} onRegistrar={onRegistrar} />
    );

    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/precio de compra/i), { target: { value: '1500000' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se guardó nada/i);
    expect(screen.getByLabelText(/marca/i)).toHaveValue('Fiat');
  });

  it('en la confirmación, "Ver vehículos" y "Volver al inicio" llevan a sus pantallas', async () => {
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 }];
    const onRegistrar = vi.fn().mockResolvedValue({ success: true, codigo: 'MC-008' });
    const onVolver = vi.fn();
    const onVerVehiculos = vi.fn();

    render(
      <CompraVehiculoView
        cuentas={cuentas}
        onVolver={onVolver}
        onIrACuentas={vi.fn()}
        onRegistrar={onRegistrar}
        onVerVehiculos={onVerVehiculos}
      />
    );

    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/precio de compra/i), { target: { value: '1500000' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    await screen.findByTestId('codigo-compra');

    fireEvent.click(screen.getByRole('button', { name: /ver vehículos/i }));
    expect(onVerVehiculos).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /volver al inicio/i }));
    expect(onVolver).toHaveBeenCalledTimes(1);
  });

  it('cuando los pagos suman exacto el precio y los datos están completos, Confirmar se habilita', () => {
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 }];

    render(<CompraVehiculoView cuentas={cuentas} onVolver={vi.fn()} onIrACuentas={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/precio de compra/i), { target: { value: '3000000' } });

    expect(screen.queryByText(/faltan|sobran/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeEnabled();
  });
});
