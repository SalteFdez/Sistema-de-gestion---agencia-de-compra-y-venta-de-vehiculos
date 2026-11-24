import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import React from 'react';
import { MovimientoSocioView } from './MovimientoSocioView';

const socios = [
  { id: 'u1', nombre: 'Agustín Fernandez' },
  { id: 'u2', nombre: 'Lautaro' },
  { id: 'u3', nombre: 'Antonio' },
];
const cuentas = [
  { id: 'c1', nombre: 'Caja efectivo', saldo: 3000000 },
  { id: 'c2', nombre: 'Banco', saldo: 1500000 },
];

describe('MovimientoSocioView', () => {
  it('el socio que carga viene preseleccionado y se puede cambiar por otro', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({ success: true });
    render(
      <MovimientoSocioView
        modo="aporte"
        socios={socios}
        socioActualId="u1"
        cuentas={cuentas}
        onRegistrar={onRegistrar}
        onVolver={vi.fn()}
      />
    );

    const grupoSocios = screen.getByRole('group', { name: 'Socio' });
    expect(within(grupoSocios).getByRole('button', { name: 'Agustín Fernandez' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(grupoSocios).getByRole('button', { name: 'Lautaro' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Cuenta' })).getByRole('button', { name: /caja efectivo/i }));
    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '500000' } });
    fireEvent.click(screen.getByRole('button', { name: /registrar aporte/i }));

    expect(onRegistrar).toHaveBeenCalledWith(expect.objectContaining({ socioId: 'u2', cuentaId: 'c1', monto: 500000 }));
  });

  it('un retiro que deja la cuenta en negativo avisa y espera confirmación; un aporte no avisa', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({ success: true });
    const { unmount } = render(
      <MovimientoSocioView
        modo="retiro"
        socios={socios}
        socioActualId="u1"
        cuentas={cuentas}
        onRegistrar={onRegistrar}
        onVolver={vi.fn()}
      />
    );

    fireEvent.click(within(screen.getByRole('group', { name: 'Cuenta' })).getByRole('button', { name: /caja efectivo/i }));
    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '4000000' } });
    fireEvent.click(screen.getByRole('button', { name: /registrar retiro/i }));

    expect(onRegistrar).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveTextContent('La cuenta Caja efectivo va a quedar en $ −1.000.000');

    fireEvent.click(screen.getByRole('button', { name: /confirmar igual/i }));
    expect(onRegistrar).toHaveBeenCalledWith(expect.objectContaining({ socioId: 'u1', cuentaId: 'c1', monto: 4000000 }));
    unmount();

    const onAporte = vi.fn().mockResolvedValue({ success: true });
    render(
      <MovimientoSocioView
        modo="aporte"
        socios={socios}
        socioActualId="u1"
        cuentas={cuentas}
        onRegistrar={onAporte}
        onVolver={vi.fn()}
      />
    );
    fireEvent.click(within(screen.getByRole('group', { name: 'Cuenta' })).getByRole('button', { name: /caja efectivo/i }));
    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '4000000' } });
    fireEvent.click(screen.getByRole('button', { name: /registrar aporte/i }));

    expect(onAporte).toHaveBeenCalledWith(expect.objectContaining({ monto: 4000000 }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('si el registro falla, muestra el error y conserva socio, cuenta y monto', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({
      success: false,
      error: 'Sin conexión. No se pudo confirmar si se registró el movimiento: revisá antes de reintentar.',
    });
    render(
      <MovimientoSocioView
        modo="aporte"
        socios={socios}
        socioActualId="u1"
        cuentas={cuentas}
        onRegistrar={onRegistrar}
        onVolver={vi.fn()}
      />
    );

    fireEvent.click(within(screen.getByRole('group', { name: 'Socio' })).getByRole('button', { name: 'Lautaro' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Cuenta' })).getByRole('button', { name: /caja efectivo/i }));
    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '500000' } });
    fireEvent.click(screen.getByRole('button', { name: /registrar aporte/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo confirmar/i);
    expect(screen.getByLabelText(/monto/i)).toHaveValue('$ 500.000');
    expect(within(screen.getByRole('group', { name: 'Socio' })).getByRole('button', { name: 'Lautaro' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('group', { name: 'Cuenta' })).getByRole('button', { name: /caja efectivo/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('si sale bien muestra el resumen: "Lautaro aportó $ 500.000 en Caja efectivo" o "Lautaro retiró $ 300.000 de Caja efectivo"', async () => {
    const onRegistrarAporte = vi.fn().mockResolvedValue({ success: true });
    const { unmount } = render(
      <MovimientoSocioView
        modo="aporte"
        socios={socios}
        socioActualId="u1"
        cuentas={cuentas}
        onRegistrar={onRegistrarAporte}
        onVolver={vi.fn()}
      />
    );
    fireEvent.click(within(screen.getByRole('group', { name: 'Socio' })).getByRole('button', { name: 'Lautaro' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Cuenta' })).getByRole('button', { name: /caja efectivo/i }));
    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '500000' } });
    fireEvent.click(screen.getByRole('button', { name: /registrar aporte/i }));
    expect(await screen.findByRole('status')).toHaveTextContent('Lautaro aportó $ 500.000 en Caja efectivo');
    unmount();

    const onRegistrarRetiro = vi.fn().mockResolvedValue({ success: true });
    render(
      <MovimientoSocioView
        modo="retiro"
        socios={socios}
        socioActualId="u2"
        cuentas={cuentas}
        onRegistrar={onRegistrarRetiro}
        onVolver={vi.fn()}
      />
    );
    fireEvent.click(within(screen.getByRole('group', { name: 'Cuenta' })).getByRole('button', { name: /caja efectivo/i }));
    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '300000' } });
    fireEvent.click(screen.getByRole('button', { name: /registrar retiro/i }));
    expect(await screen.findByRole('status')).toHaveTextContent('Lautaro retiró $ 300.000 de Caja efectivo');
  });

  it('con monto 0 no registra y lo dice en pantalla', () => {
    const onRegistrar = vi.fn();
    render(
      <MovimientoSocioView
        modo="retiro"
        socios={socios}
        socioActualId="u1"
        cuentas={cuentas}
        onRegistrar={onRegistrar}
        onVolver={vi.fn()}
      />
    );

    fireEvent.click(within(screen.getByRole('group', { name: 'Cuenta' })).getByRole('button', { name: /caja efectivo/i }));
    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /registrar retiro/i }));

    expect(onRegistrar).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/mayor que 0/i);
  });
});
