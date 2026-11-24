import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';
import { AuthFlow } from './AuthFlow';
import type { DeviceAuthService } from '../lib/auth/device-auth';
import type { PinLockout } from '../lib/auth/pin-lockout';
import type { SessionInactivityTracker } from '../lib/auth/session-inactivity';

// Tras desbloquear la app se abre en Vehículos: estas pruebas pasan a Caja (el inicio de siempre) antes de seguir
const irACaja = () => fireEvent.click(screen.getByRole('button', { name: /^caja$/i }));

describe('AuthFlow UI Integration', () => {
  let mockAuthService: Partial<DeviceAuthService>;
  let mockLockout: Partial<PinLockout>;
  let mockInactivity: Partial<SessionInactivityTracker>;

  beforeEach(() => {
    mockLockout = {
      getStatus: vi.fn().mockReturnValue({ failedAttempts: 0, isLocked: false, remainingSeconds: 0, lockoutUntil: null }),
      recordFailedAttempt: vi.fn().mockReturnValue({ failedAttempts: 1, isLocked: false, remainingSeconds: 0, lockoutUntil: null }),
      recordSuccess: vi.fn(),
      reset: vi.fn(),
    };

    mockInactivity = {
      isUnlocked: vi.fn().mockReturnValue(false),
      markUnlocked: vi.fn(),
      recordActivity: vi.fn(),
      lock: vi.fn(),
    };
  });

  it('muestra la pantalla de vinculación si el dispositivo no está vinculado', () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(false),
      getLinkedUser: vi.fn().mockReturnValue(null),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
      />
    );

    expect(screen.getByText(/vincular dispositivo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email del socio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
  });

  it('valida credenciales al enviar el formulario: si fallan se queda en creds con mensaje de error y conserva el email', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(false),
      getLinkedUser: vi.fn().mockReturnValue(null),
      validateCredentials: vi.fn().mockResolvedValue({
        success: false,
        error: 'Email o contraseña incorrectos',
      }),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
      />
    );

    const emailInput = screen.getByLabelText(/email del socio/i);
    const passInput = screen.getByLabelText(/contraseña/i);

    fireEvent.change(emailInput, { target: { value: 'agustin@machoman.local' } });
    fireEvent.change(passInput, { target: { value: 'wrongpass' } });

    fireEvent.click(screen.getByRole('button', { name: /continuar a elegir pin/i }));

    expect(await screen.findByText(/email o contraseña incorrectos/i)).toBeInTheDocument();
    // Permanece en el formulario de creds y conserva el email
    expect(screen.getByLabelText(/email del socio/i)).toHaveValue('agustin@machoman.local');
    expect(screen.queryByText(/elegí tu pin de 4 dígitos/i)).not.toBeInTheDocument();
  });

  it('si las credenciales son válidas, pasa a elegir PIN', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(false),
      getLinkedUser: vi.fn().mockReturnValue(null),
      validateCredentials: vi.fn().mockResolvedValue({
        success: true,
        user: { id: 'u1', email: 'agustin@machoman.local', nombre: 'Agustín Fernandez' },
      }),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
      />
    );

    fireEvent.change(screen.getByLabelText(/email del socio/i), { target: { value: 'agustin@machoman.local' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'correctpass' } });

    fireEvent.click(screen.getByRole('button', { name: /continuar a elegir pin/i }));

    expect(await screen.findByText(/elegí tu pin de 4 dígitos/i)).toBeInTheDocument();
    expect(screen.queryByText(/email o contraseña incorrectos/i)).not.toBeInTheDocument();
  });

  it('muestra la pantalla de ingreso de PIN si el dispositivo está vinculado pero bloqueado', () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
      />
    );

    expect(screen.getByText(/ingresá tu pin/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/contraseña/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /me olvidé el pin/i })).toBeInTheDocument();
  });

  it('al tocar "Me olvidé el PIN" en la pantalla de PIN abre diálogo de confirmación y solo desvincula si confirma', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      unlinkDevice: vi.fn().mockResolvedValue(undefined),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /me olvidé el pin/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/vas a tener que volver a vincular/i)).toBeInTheDocument();

    // Cancelar cierra el diálogo y no desvincula
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockAuthService.unlinkDevice).not.toHaveBeenCalled();

    // Abrir de nuevo y confirmar
    fireEvent.click(screen.getByRole('button', { name: /me olvidé el pin/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Desvincular' }));
    expect(mockAuthService.unlinkDevice).toHaveBeenCalledTimes(1);
  });

  it('desbloquea y muestra "Hola, Agustín Fernandez" tras ingresar el PIN correcto', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
      />
    );

    // Ingresamos 1, 2, 3, 4 en el teclado en pantalla
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));

    // Al desbloquear se abre en Vehículos; el saludo está en Caja
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Vehículos' })).toBeInTheDocument();
    });
    irACaja();
    expect(screen.getByText(/hola, agustín fernandez/i)).toBeInTheDocument();

    expect(mockLockout.recordSuccess).toHaveBeenCalled();
    expect(mockInactivity.markUnlocked).toHaveBeenCalled();
  });

  it('si el PIN es incorrecto, registra intento fallido y sacude los círculos', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(false),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));

    await waitFor(() => {
      expect(mockLockout.recordFailedAttempt).toHaveBeenCalled();
    });

    expect(screen.queryByText(/hola, agustín fernandez/i)).not.toBeInTheDocument();
  });

  it('permite acceder a "Cambiar PIN" desde Más y volver', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
      />
    );

    expect(screen.getByRole('heading', { name: 'Vehículos' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /más/i }));
    const changePinBtn = screen.getByRole('button', { name: /cambiar pin/i });
    expect(changePinBtn).toBeInTheDocument();

    // Al tocar "Cambiar PIN", se abre ChangePinFlow
    fireEvent.click(changePinBtn);
    expect(screen.getByText(/ingresá tu pin actual/i)).toBeInTheDocument();

    // Si cancela, vuelve a Más
    const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelBtn);
    expect(screen.getByRole('button', { name: /cambiar pin/i })).toBeInTheDocument();
  });

  it('permite navegar a Balances desde el botón grande de la pantalla principal y volver', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const mockCuentasService = {
      obtenerCuentasConSaldo: vi.fn().mockResolvedValue([
        { id: '1', nombre: 'Caja efectivo', tipo: 'efectivo', saldo: 1500000 },
      ]),
      obtenerDineroDisponible: vi.fn().mockResolvedValue(1500000),
      crearCuenta: vi.fn(),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        cuentasService={mockCuentasService as unknown as any}
      />
    );

    irACaja();
    const btnBalances = screen.getByRole('button', { name: /balances/i });
    expect(btnBalances).toBeInTheDocument();

    fireEvent.click(btnBalances);

    expect(await screen.findByText(/dinero disponible/i)).toBeInTheDocument();
    expect(screen.getByTestId('total-disponible')).toHaveTextContent('$ 1.500.000');
    expect(screen.getByText('Caja efectivo')).toBeInTheDocument();

    // Botón volver
    const btnVolver = screen.getByRole('button', { name: /volver/i });
    fireEvent.click(btnVolver);

    expect(await screen.findByText(/hola, agustín fernandez/i)).toBeInTheDocument();
  });

  it('permite navegar a Vehículos desde el botón grande de la pantalla principal y volver', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
      />
    );

    const btnVehiculos = screen.getByRole('button', { name: /vehículos/i });
    fireEvent.click(btnVehiculos);

    expect(await screen.findByRole('heading', { name: /vehículos/i })).toBeInTheDocument();

    // Vehículos es pestaña raíz: se vuelve a Caja con la barra, no con Volver
    irACaja();

    expect(await screen.findByText(/hola, agustín fernandez/i)).toBeInTheDocument();
  });

  it('desde la pantalla principal, "Mover plata" abre el menú con las tres opciones y Volver regresa', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /más/i }));
    fireEvent.click(screen.getByRole('button', { name: /mover plata/i }));

    expect(await screen.findByRole('heading', { name: 'Mover plata' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pasar entre cuentas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /aporte de socio/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retiro de socio/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /volver/i }));

    expect(await screen.findByRole('button', { name: /mover plata/i })).toBeInTheDocument();
  });

  describe('Mover plata conectado al servicio', () => {
    const unlockedAuth = () => ({
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({ id: 'u1', email: 'agustin@machoman.local', nombre: 'Agustín Fernandez' }),
      validatePin: vi.fn().mockResolvedValue(true),
    });
    const cuentasDeMock = () => ({
      obtenerCuentasConSaldo: vi.fn().mockResolvedValue([
        { id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo', saldo: 3000000 },
        { id: 'c2', nombre: 'Banco', tipo: 'banco', saldo: 1500000 },
      ]),
      obtenerDineroDisponible: vi.fn().mockResolvedValue(4500000),
      crearCuenta: vi.fn(),
    });

    it('Pasar entre cuentas: elige desde y hacia, confirma y registra con el servicio', async () => {
      mockAuthService = unlockedAuth();
      mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);
      const vehiculosService = {
        listarVehiculos: vi.fn().mockResolvedValue([]),
        obtenerInventario: vi.fn().mockResolvedValue({ total: 0, cantidad: 0 }),
        listarMovimientos: vi.fn().mockResolvedValue([]),
        transferir: vi.fn().mockResolvedValue({ success: true }),
      };

      render(
        <AuthFlow
          authService={mockAuthService as DeviceAuthService}
          lockout={mockLockout as PinLockout}
          inactivity={mockInactivity as SessionInactivityTracker}
          cuentasService={cuentasDeMock() as unknown as any}
          vehiculosService={vehiculosService as unknown as any}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /más/i }));
      fireEvent.click(screen.getByRole('button', { name: /mover plata/i }));
      fireEvent.click(screen.getByRole('button', { name: /pasar entre cuentas/i }));
      const desde = await screen.findByRole('group', { name: 'Desde' });
      fireEvent.click(within(desde).getByRole('button', { name: /caja efectivo/i }));
      fireEvent.click(within(screen.getByRole('group', { name: 'Hacia' })).getByRole('button', { name: /banco/i }));
      fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '1000000' } });
      fireEvent.click(screen.getByRole('button', { name: /pasar plata/i }));

      expect(await screen.findByRole('status')).toHaveTextContent('Pasaste $ 1.000.000 de Caja efectivo a Banco');
      expect(vehiculosService.transferir).toHaveBeenCalledWith(
        expect.objectContaining({ origenId: 'c1', destinoId: 'c2', monto: 1000000 })
      );
    });

    it('Aporte de socio: el socio que carga viene preseleccionado y se registra con el servicio', async () => {
      mockAuthService = unlockedAuth();
      mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);
      const vehiculosService = {
        listarVehiculos: vi.fn().mockResolvedValue([]),
        obtenerInventario: vi.fn().mockResolvedValue({ total: 0, cantidad: 0 }),
        listarMovimientos: vi.fn().mockResolvedValue([]),
        listarSocios: vi.fn().mockResolvedValue([
          { id: 'u1', nombre: 'Agustín Fernandez' },
          { id: 'u2', nombre: 'Lautaro' },
        ]),
        registrarAporte: vi.fn().mockResolvedValue({ success: true }),
      };

      render(
        <AuthFlow
          authService={mockAuthService as DeviceAuthService}
          lockout={mockLockout as PinLockout}
          inactivity={mockInactivity as SessionInactivityTracker}
          cuentasService={cuentasDeMock() as unknown as any}
          vehiculosService={vehiculosService as unknown as any}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /más/i }));
      fireEvent.click(screen.getByRole('button', { name: /mover plata/i }));
      fireEvent.click(screen.getByRole('button', { name: /aporte de socio/i }));
      const socios = await screen.findByRole('group', { name: 'Socio' });
      expect(within(socios).getByRole('button', { name: 'Agustín Fernandez' })).toHaveAttribute('aria-pressed', 'true');
      fireEvent.click(within(socios).getByRole('button', { name: 'Lautaro' }));
      fireEvent.click(within(screen.getByRole('group', { name: 'Cuenta' })).getByRole('button', { name: /caja efectivo/i }));
      fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '500000' } });
      fireEvent.click(screen.getByRole('button', { name: /registrar aporte/i }));

      expect(await screen.findByRole('status')).toHaveTextContent('Lautaro aportó $ 500.000 en Caja efectivo');
      expect(vehiculosService.registrarAporte).toHaveBeenCalledWith(
        expect.objectContaining({ socioId: 'u2', cuentaId: 'c1', monto: 500000 })
      );
    });

    it('anular una pata de pase en el historial llama a anularTransferencia, no a anularMovimiento', async () => {
      mockAuthService = unlockedAuth();
      mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);
      const salida = {
        id: 'p1', fecha: '2026-11-16', tipo: 'transferencia_salida', monto: -1000000, descripcion: 'Depósito del efectivo',
        cuentaNombre: 'Caja efectivo', vehiculoId: null, vehiculoCodigo: null, categoriaNombre: null, creadoPor: 'Agustín Fernandez',
        anulado: false, anuladoPor: null, anuladoEl: null, motivoAnulacion: null, gastoId: null, ventaId: null,
        transferenciaId: 't1', cuentaContraparte: 'Banco', socioNombre: null,
      };
      const vehiculosService = {
        listarVehiculos: vi.fn().mockResolvedValue([]),
        obtenerInventario: vi.fn().mockResolvedValue({ total: 0, cantidad: 0 }),
        listarMovimientos: vi.fn().mockResolvedValue([salida]),
        anularTransferencia: vi.fn().mockResolvedValue({ success: true }),
        anularMovimiento: vi.fn().mockResolvedValue({ success: true }),
      };

      render(
        <AuthFlow
          authService={mockAuthService as DeviceAuthService}
          lockout={mockLockout as PinLockout}
          inactivity={mockInactivity as SessionInactivityTracker}
          cuentasService={cuentasDeMock() as unknown as any}
          vehiculosService={vehiculosService as unknown as any}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Movimientos' }));
      fireEvent.click(await screen.findByText('Pase a Banco'));
      fireEvent.click(screen.getByRole('button', { name: /^anular$/i }));
      const dialogo = screen.getByRole('dialog');
      fireEvent.change(within(dialogo).getByLabelText(/motivo/i), { target: { value: 'cargué mal el monto' } });
      fireEvent.click(within(dialogo).getByRole('button', { name: /anular movimiento/i }));

      await waitFor(() =>
        expect(vehiculosService.anularTransferencia).toHaveBeenCalledWith({ movimientoId: 'p1', motivo: 'cargué mal el monto' })
      );
      expect(vehiculosService.anularMovimiento).not.toHaveBeenCalled();
    });
  });

  describe('Arranque en Vehículos', () => {
    it('al desbloquear, la app abre en Vehículos con el filtro En stock y carga el listado', async () => {
      mockAuthService = {
        isDeviceLinked: vi.fn().mockReturnValue(true),
        getLinkedUser: vi.fn().mockReturnValue({ id: 'u1', email: 'agustin@machoman.local', nombre: 'Agustín Fernandez' }),
        validatePin: vi.fn().mockResolvedValue(true),
      };
      mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);
      const vehiculosService = {
        listarVehiculos: vi.fn().mockResolvedValue([]),
        obtenerInventario: vi.fn().mockResolvedValue({ total: 0, cantidad: 0 }),
        listarMovimientos: vi.fn().mockResolvedValue([]),
      };

      render(
        <AuthFlow
          authService={mockAuthService as DeviceAuthService}
          lockout={mockLockout as PinLockout}
          inactivity={mockInactivity as SessionInactivityTracker}
          vehiculosService={vehiculosService as unknown as any}
        />
      );

      expect(await screen.findByRole('heading', { name: 'Vehículos' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'En stock' })).toHaveAttribute('aria-pressed', 'true');
      expect(vehiculosService.listarVehiculos).toHaveBeenCalled();
    });
  });

  describe('Ver vehículos después de comprar', () => {
    it('desde la confirmación de compra, "Ver vehículos" lleva al listado recargado con el auto nuevo', async () => {
      mockAuthService = {
        isDeviceLinked: vi.fn().mockReturnValue(true),
        getLinkedUser: vi.fn().mockReturnValue({ id: 'u1', email: 'agustin@machoman.local', nombre: 'Agustín Fernandez' }),
        validatePin: vi.fn().mockResolvedValue(true),
      };
      mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);
      let comprado = false;
      const autoNuevo = { id: 'v20', codigo: 'MC-020', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, patente: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-24' };
      const vehiculosService = {
        listarVehiculos: vi.fn().mockImplementation(async () => (comprado ? [autoNuevo] : [])),
        obtenerInventario: vi.fn().mockResolvedValue({ total: 0, cantidad: 0 }),
        listarMovimientos: vi.fn().mockResolvedValue([]),
        registrarCompra: vi.fn().mockImplementation(async () => {
          comprado = true;
          return { success: true, codigo: 'MC-020' };
        }),
      };
      const cuentasService = {
        obtenerCuentasConSaldo: vi.fn().mockResolvedValue([{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo', saldo: 5000000 }]),
        obtenerDineroDisponible: vi.fn().mockResolvedValue(5000000),
        crearCuenta: vi.fn(),
      };

      render(
        <AuthFlow
          authService={mockAuthService as DeviceAuthService}
          lockout={mockLockout as PinLockout}
          inactivity={mockInactivity as SessionInactivityTracker}
          cuentasService={cuentasService as unknown as any}
          vehiculosService={vehiculosService as unknown as any}
        />
      );

      irACaja(); fireEvent.click(screen.getByRole('button', { name: /comprar vehículo/i }));
      fireEvent.change(await screen.findByLabelText(/marca/i), { target: { value: 'Fiat' } });
      fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
      fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
      fireEvent.change(screen.getByLabelText(/precio de compra/i), { target: { value: '1500000' } });
      fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

      expect(await screen.findByTestId('codigo-compra')).toHaveTextContent('MC-020');
      fireEvent.click(screen.getByRole('button', { name: /ver vehículos/i }));

      expect(await screen.findByRole('heading', { name: /vehículos/i })).toBeInTheDocument();
      expect(await screen.findByText(/MC-020/)).toBeInTheDocument();
    });
  });

  describe('Buscar vehículos sobrevive al detalle', () => {
    it('la búsqueda y el filtro siguen como estaban al entrar a un auto y volver', async () => {
      mockAuthService = {
        isDeviceLinked: vi.fn().mockReturnValue(true),
        getLinkedUser: vi.fn().mockReturnValue({ id: 'u1', email: 'agustin@machoman.local', nombre: 'Agustín Fernandez' }),
        validatePin: vi.fn().mockResolvedValue(true),
      };
      mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);
      const detalle = {
        id: 'v14', codigo: 'MC-014', marca: 'Chevrolet', modelo: 'Corsa', anio: 2010, color: null, patente: 'AB123CD',
        estado: 'en_stock', origen: 'compra', fechaIngreso: '2026-11-01', vendedor: null, valorIngreso: 3000000,
        gastosAsignados: 0, costoReal: 3000000, pagos: [], venta: null, gastos: [],
      };
      const vehiculosService = {
        listarVehiculos: vi.fn().mockResolvedValue([
          { id: 'v14', codigo: 'MC-014', marca: 'Chevrolet', modelo: 'Corsa', anio: 2010, color: null, patente: 'AB123CD', estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-01' },
          { id: 'v7', codigo: 'MC-007', marca: 'Fiat', modelo: 'Uno', anio: 2012, color: null, patente: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-02' },
        ]),
        obtenerInventario: vi.fn().mockResolvedValue({ total: 0, cantidad: 0 }),
        obtenerDetalle: vi.fn().mockResolvedValue({ success: true, detalle }),
      };

      render(
        <AuthFlow
          authService={mockAuthService as DeviceAuthService}
          lockout={mockLockout as PinLockout}
          inactivity={mockInactivity as SessionInactivityTracker}
          vehiculosService={vehiculosService as unknown as any}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /vehículos/i }));
      const buscador = await screen.findByRole('searchbox', { name: /buscar vehículos/i });
      fireEvent.change(buscador, { target: { value: 'corsa' } });
      fireEvent.click(screen.getByRole('button', { name: 'Todos' }));

      fireEvent.click(screen.getByText('MC-014'));
      // El detalle ya cargado muestra "Cómo se pagó"
      expect(await screen.findByRole('heading', { name: 'Cómo se pagó' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

      const buscadorVuelta = await screen.findByRole('searchbox', { name: /buscar vehículos/i });
      expect(buscadorVuelta).toHaveValue('corsa');
      expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Cuotas por cobrar en la pantalla principal', () => {
    const authDesbloqueado = () => ({
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({ id: 'u1', email: 'agustin@machoman.local', nombre: 'Agustín Fernandez' }),
      validatePin: vi.fn().mockResolvedValue(true),
    });
    const cuotaVencida = {
      cuotaId: 'c1', ventaId: 'ven1', numero: 2, totalCuotas: 4, monto: 500000, cobrado: 0, saldo: 500000,
      estado: 'vencida', vencimiento: '2026-10-15', vehiculoCodigo: 'MC-014', comprador: 'Pedro', compradorTelefono: null,
    };

    it('el botón muestra el contador de cuotas vencidas', async () => {
      mockAuthService = authDesbloqueado();
      mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);
      const vehiculosService = {
        listarVehiculos: vi.fn().mockResolvedValue([]),
        obtenerInventario: vi.fn().mockResolvedValue({ total: 0, cantidad: 0 }),
        listarPendientes: vi.fn().mockResolvedValue({ total: 0, grupos: [] }),
        obtenerPorCobrar: vi.fn().mockResolvedValue(500000),
        listarCuotasPorCobrar: vi.fn().mockResolvedValue([cuotaVencida]),
      };

      render(
        <AuthFlow
          authService={mockAuthService as DeviceAuthService}
          lockout={mockLockout as PinLockout}
          inactivity={mockInactivity as SessionInactivityTracker}
          vehiculosService={vehiculosService as unknown as any}
        />
      );

      irACaja();
      expect(await screen.findByRole('button', { name: /cuotas por cobrar.*1 vencida/i })).toBeInTheDocument();
    });
  });

  describe('Pendientes de asignar en la pantalla principal', () => {
    const authDesbloqueado = () => ({
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({ id: 'u1', email: 'agustin@machoman.local', nombre: 'Agustín Fernandez' }),
      validatePin: vi.fn().mockResolvedValue(true),
    });

    it('el botón muestra el total pendiente y abre la pantalla de pendientes', async () => {
      mockAuthService = authDesbloqueado();
      mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);
      const vehiculosService = {
        listarVehiculos: vi.fn().mockResolvedValue([]),
        obtenerInventario: vi.fn().mockResolvedValue({ total: 0, cantidad: 0 }),
        listarPendientes: vi.fn().mockResolvedValue({
          total: 190000,
          grupos: [
            {
              proveedorId: 'p1',
              proveedorNombre: 'Mecánico Juan',
              subtotal: 190000,
              gastos: [
                { gastoId: 'g1', fecha: '2026-11-14', categoria: 'Chapa y pintura', descripcion: 'Pintura', montoTotal: 250000, pendiente: 190000, proveedorId: 'p1', proveedorNombre: 'Mecánico Juan' },
              ],
            },
          ],
        }),
      };

      render(
        <AuthFlow
          authService={mockAuthService as DeviceAuthService}
          lockout={mockLockout as PinLockout}
          inactivity={mockInactivity as SessionInactivityTracker}
          vehiculosService={vehiculosService as unknown as any}
        />
      );

      irACaja();
      const boton = await screen.findByRole('button', { name: /pendientes de asignar.*\$ 190\.000/i });
      fireEvent.click(boton);

      expect(await screen.findByRole('heading', { name: 'Pendientes de asignar' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Mecánico Juan/ })).toBeInTheDocument();
    });

    it('sin pendientes el botón no aparece', async () => {
      mockAuthService = authDesbloqueado();
      mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);
      const vehiculosService = {
        listarVehiculos: vi.fn().mockResolvedValue([]),
        obtenerInventario: vi.fn().mockResolvedValue({ total: 0, cantidad: 0 }),
        listarPendientes: vi.fn().mockResolvedValue({ total: 0, grupos: [] }),
      };

      render(
        <AuthFlow
          authService={mockAuthService as DeviceAuthService}
          lockout={mockLockout as PinLockout}
          inactivity={mockInactivity as SessionInactivityTracker}
          vehiculosService={vehiculosService as unknown as any}
        />
      );

      await waitFor(() => expect(vehiculosService.listarPendientes).toHaveBeenCalled());
      expect(screen.queryByRole('button', { name: /pendientes de asignar/i })).not.toBeInTheDocument();
    });
  });

  it('en Balances muestra el Inventario que trae el servicio, sin cambiar el dinero disponible', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const mockCuentasService = {
      obtenerCuentasConSaldo: vi.fn().mockResolvedValue([
        { id: '1', nombre: 'Caja efectivo', tipo: 'efectivo', saldo: 1500000 },
      ]),
      obtenerDineroDisponible: vi.fn().mockResolvedValue(1500000),
      crearCuenta: vi.fn(),
    };
    const mockVehiculosService = {
      listarVehiculos: vi.fn().mockResolvedValue([]),
      obtenerInventario: vi.fn().mockResolvedValue({ total: 12500000, cantidad: 3 }),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        cuentasService={mockCuentasService as unknown as any}
        vehiculosService={mockVehiculosService as unknown as any}
      />
    );

    irACaja(); fireEvent.click(screen.getByRole('button', { name: /balances/i }));

    expect(await screen.findByText('$ 12.500.000 · 3 vehículos')).toBeInTheDocument();
    expect(screen.getByTestId('total-disponible')).toHaveTextContent('$ 1.500.000');
  });

  it('si el listado de Vehículos falla, avisa y permite reintentar', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const item = {
      id: 'v20',
      codigo: 'MC-020',
      marca: 'Ford',
      modelo: 'Ka',
      anio: 2012,
      color: null,
      estado: 'en_stock',
      fotoUrl: null,
      fechaIngreso: '2026-11-13',
    };
    const mockVehiculosService = {
      listarVehiculos: vi
        .fn()
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockResolvedValueOnce([item]),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        vehiculosService={mockVehiculosService as unknown as any}
      />
    );

    // La app abre en Vehículos y ya pidió el listado: falla y se ofrece reintentar
    expect(await screen.findByText(/no se pudo cargar/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }));

    expect(await screen.findByText('MC-020')).toBeInTheDocument();
    expect(mockVehiculosService.listarVehiculos).toHaveBeenCalledTimes(2);
  });

  it('si falla el inventario, Balances avisa y sigue mostrando el dinero disponible', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const mockCuentasService = {
      obtenerCuentasConSaldo: vi.fn().mockResolvedValue([
        { id: '1', nombre: 'Caja efectivo', tipo: 'efectivo', saldo: 1500000 },
      ]),
      obtenerDineroDisponible: vi.fn().mockResolvedValue(1500000),
      crearCuenta: vi.fn(),
    };
    const mockVehiculosService = {
      listarVehiculos: vi.fn().mockResolvedValue([]),
      obtenerInventario: vi.fn().mockRejectedValue(new Error('Failed to fetch')),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        cuentasService={mockCuentasService as unknown as any}
        vehiculosService={mockVehiculosService as unknown as any}
      />
    );

    irACaja(); fireEvent.click(screen.getByRole('button', { name: /balances/i }));

    expect(await screen.findByText(/no se pudo cargar el inventario/i)).toBeInTheDocument();
    expect(screen.getByTestId('total-disponible')).toHaveTextContent('$ 1.500.000');
    expect(screen.getByText('Caja efectivo')).toBeInTheDocument();
  });

  it('desde Vehículos, agregar una foto a un vehículo sin foto la muestra sin volver a pedir el listado', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const mockVehiculosService = {
      listarVehiculos: vi.fn().mockResolvedValue([
        { id: 'v5', codigo: 'MC-005', marca: 'Chevrolet', modelo: 'Corsa', anio: 2005, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-13' },
      ]),
      agregarFoto: vi.fn().mockResolvedValue({ success: true, fotoUrl: 'https://storage.test/corsa' }),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        vehiculosService={mockVehiculosService as unknown as any}
        comprimirFoto={async (f) => f}
      />
    );

    // La app ya abre en Vehículos: el listado se pide una sola vez, al entrar
    await screen.findByText('MC-005');

    fireEvent.change(screen.getByLabelText('Elegir foto de MC-005'), {
      target: { files: [new File(['jpeg'], 'corsa.jpg', { type: 'image/jpeg' })] },
    });

    expect(await screen.findByRole('img', { name: /chevrolet corsa/i })).toHaveAttribute('src', 'https://storage.test/corsa');
    expect(mockVehiculosService.agregarFoto).toHaveBeenCalledTimes(1);
    expect(mockVehiculosService.listarVehiculos).toHaveBeenCalledTimes(1);
  });

  it('el botón grande "Comprar vehículo" abre la pantalla de compra y permite volver', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
      />
    );

    irACaja(); fireEvent.click(screen.getByRole('button', { name: /comprar vehículo/i }));

    expect(await screen.findByRole('heading', { name: /comprar vehículo/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /volver/i }));

    expect(await screen.findByText(/hola, agustín fernandez/i)).toBeInTheDocument();
  });

  it('al abrir Comprar sin haber visto Balances, carga las cuentas y no muestra "no hay cuentas"', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const mockCuentasService = {
      obtenerCuentasConSaldo: vi.fn().mockResolvedValue([
        { id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo', saldo: 5000000 },
      ]),
      obtenerDineroDisponible: vi.fn().mockResolvedValue(5000000),
      crearCuenta: vi.fn(),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        cuentasService={mockCuentasService as unknown as any}
      />
    );

    irACaja(); fireEvent.click(screen.getByRole('button', { name: /comprar vehículo/i }));

    expect(await screen.findByLabelText(/cuenta de pago 1/i)).toHaveValue('c1');
    expect(screen.queryByText(/no hay cuentas cargadas/i)).not.toBeInTheDocument();
  });

  it('al confirmar una compra desde la app, guarda con el servicio y recarga cuentas y vehículos', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const mockCuentasService = {
      obtenerCuentasConSaldo: vi.fn().mockResolvedValue([
        { id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo', saldo: 5000000 },
      ]),
      obtenerDineroDisponible: vi.fn().mockResolvedValue(5000000),
      crearCuenta: vi.fn(),
    };
    const mockVehiculosService = {
      listarVehiculos: vi.fn().mockResolvedValue([]),
      obtenerInventario: vi.fn().mockResolvedValue({ total: 0, cantidad: 0 }),
      registrarCompra: vi.fn().mockResolvedValue({
        success: true,
        codigo: 'MC-030',
        id: 'v30',
        saldos: [{ cuentaId: 'c1', nombre: 'Caja efectivo', saldo: 3500000 }],
      }),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        cuentasService={mockCuentasService as unknown as any}
        vehiculosService={mockVehiculosService as unknown as any}
      />
    );

    irACaja(); fireEvent.click(screen.getByRole('button', { name: /comprar vehículo/i }));
    await screen.findByLabelText(/cuenta de pago 1/i);

    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/precio de compra/i), { target: { value: '1500000' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(await screen.findByTestId('codigo-compra')).toHaveTextContent('MC-030');
    expect(mockVehiculosService.registrarCompra).toHaveBeenCalledTimes(1);
    expect(mockCuentasService.obtenerCuentasConSaldo.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(mockVehiculosService.listarVehiculos.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('desde el detalle, "Volver" regresa al listado sin volver a pedirlo', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const mockVehiculosService = {
      listarVehiculos: vi.fn().mockResolvedValue([
        { id: 'v21', codigo: 'MC-021', marca: 'Fiat', modelo: '147', anio: 1990, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-14' },
      ]),
      obtenerDetalle: vi.fn().mockResolvedValue({
        success: true,
        detalle: {
          id: 'v21', codigo: 'MC-021', marca: 'Fiat', modelo: '147', anio: 1990, color: null, patente: null,
          estado: 'en_stock', origen: 'inventario_inicial', fechaIngreso: '2026-11-14', vendedor: null,
          valorIngreso: 0, gastosAsignados: 0, costoReal: 0, pagos: [],
        },
      }),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        vehiculosService={mockVehiculosService as unknown as any}
      />
    );

    fireEvent.click(await screen.findByText('MC-021'));
    // Esperamos el contenido ya cargado (el título también existe mientras carga)
    expect(await screen.findByText('Cómo se pagó')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /volver/i }));

    expect(await screen.findByRole('heading', { name: 'Vehículos' })).toBeInTheDocument();
    expect(await screen.findByText('MC-021')).toBeInTheDocument();
    expect(mockVehiculosService.listarVehiculos).toHaveBeenCalledTimes(1);
  });

  it('una foto agregada desde el listado sigue visible después de abrir el detalle y volver', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const mockVehiculosService = {
      listarVehiculos: vi.fn().mockResolvedValue([
        { id: 'v22', codigo: 'MC-022', marca: 'Fiat', modelo: '147', anio: 1990, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-14' },
      ]),
      agregarFoto: vi.fn().mockResolvedValue({ success: true, fotoUrl: 'https://storage.test/147' }),
      obtenerDetalle: vi.fn().mockResolvedValue({
        success: true,
        detalle: {
          id: 'v22', codigo: 'MC-022', marca: 'Fiat', modelo: '147', anio: 1990, color: null, patente: null,
          estado: 'en_stock', origen: 'inventario_inicial', fechaIngreso: '2026-11-14', vendedor: null,
          valorIngreso: 0, gastosAsignados: 0, costoReal: 0, pagos: [],
        },
      }),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        vehiculosService={mockVehiculosService as unknown as any}
        comprimirFoto={async (f) => f}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /vehículos/i }));
    await screen.findByText('MC-022');
    fireEvent.change(screen.getByLabelText('Elegir foto de MC-022'), {
      target: { files: [new File(['jpeg'], 'a.jpg', { type: 'image/jpeg' })] },
    });
    expect(await screen.findByRole('img', { name: /fiat 147/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('img', { name: /fiat 147/i }));
    expect(await screen.findByText('Cómo se pagó')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /volver/i }));

    expect(await screen.findByRole('img', { name: /fiat 147/i })).toHaveAttribute('src', 'https://storage.test/147');
  });

  it('si falla la carga del detalle, muestra un mensaje con "Reintentar" que vuelve a intentar', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const detalle = {
      id: 'v23', codigo: 'MC-023', marca: 'Fiat', modelo: 'Palio', anio: 2005, color: null, patente: null,
      estado: 'en_stock', origen: 'inventario_inicial', fechaIngreso: '2026-11-14', vendedor: null,
      valorIngreso: 0, gastosAsignados: 0, costoReal: 0, pagos: [],
    };
    const mockVehiculosService = {
      listarVehiculos: vi.fn().mockResolvedValue([
        { id: 'v23', codigo: 'MC-023', marca: 'Fiat', modelo: 'Palio', anio: 2005, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-14' },
      ]),
      obtenerDetalle: vi
        .fn()
        .mockResolvedValueOnce({ success: false, error: 'Failed to fetch' })
        .mockResolvedValueOnce({ success: true, detalle }),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        vehiculosService={mockVehiculosService as unknown as any}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /vehículos/i }));
    fireEvent.click(await screen.findByText('MC-023'));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo cargar/i);
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }));

    expect(await screen.findByText('Cómo se pagó')).toBeInTheDocument();
    expect(mockVehiculosService.obtenerDetalle).toHaveBeenCalledTimes(2);
  });

  it('el botón grande "Vender vehículo" abre la pantalla de venta y permite volver', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
      />
    );

    irACaja(); fireEvent.click(screen.getByRole('button', { name: /vender vehículo/i }));

    expect(await screen.findByRole('heading', { name: /vender vehículo/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /volver/i }));

    expect(await screen.findByText(/hola, agustín fernandez/i)).toBeInTheDocument();
  });

  it('al confirmar una venta desde la app, la guarda con el servicio y recarga cuentas y vehículos', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const stock = {
      id: 'v30', codigo: 'MC-030', marca: 'Peugeot', modelo: '208', anio: 2019, color: null,
      estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-14',
    };
    const mockCuentasService = {
      obtenerCuentasConSaldo: vi.fn().mockResolvedValue([
        { id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo', saldo: 5000000 },
      ]),
      obtenerDineroDisponible: vi.fn().mockResolvedValue(5000000),
      crearCuenta: vi.fn(),
    };
    const mockVehiculosService = {
      listarVehiculos: vi.fn().mockResolvedValue([stock]),
      obtenerInventario: vi.fn().mockResolvedValue({ total: 0, cantidad: 0 }),
      registrarVentaConPermutas: vi.fn().mockResolvedValue({ success: true, ventaId: 'ven30', codigo: 'MC-030', ganancia: 500000 }),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        cuentasService={mockCuentasService as unknown as any}
        vehiculosService={mockVehiculosService as unknown as any}
      />
    );

    irACaja(); fireEvent.click(screen.getByRole('button', { name: /vender vehículo/i }));
    fireEvent.click(await screen.findByText('MC-030'));
    fireEvent.change(await screen.findByLabelText(/precio de venta/i), { target: { value: '500000' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(await screen.findByTestId('codigo-venta')).toHaveTextContent('MC-030');
    expect(mockVehiculosService.registrarVentaConPermutas).toHaveBeenCalledTimes(1);
    expect(mockCuentasService.obtenerCuentasConSaldo.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(mockVehiculosService.listarVehiculos.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('el filtro elegido en Vehículos sigue igual al volver del detalle', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const mockVehiculosService = {
      listarVehiculos: vi.fn().mockResolvedValue([
        { id: 'v40', codigo: 'MC-040', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, estado: 'vendido', fotoUrl: null, fechaIngreso: '2026-11-13' },
        { id: 'v41', codigo: 'MC-041', marca: 'Ford', modelo: 'Ka', anio: 2012, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-13' },
      ]),
      obtenerDetalle: vi.fn().mockResolvedValue({
        success: true,
        detalle: {
          id: 'v40', codigo: 'MC-040', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, patente: null,
          estado: 'vendido', origen: 'compra', fechaIngreso: '2026-11-13', vendedor: null,
          valorIngreso: 0, gastosAsignados: 0, costoReal: 0, pagos: [], venta: null,
        },
      }),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        vehiculosService={mockVehiculosService as unknown as any}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /vehículos/i }));
    await screen.findByText('MC-041');
    fireEvent.click(screen.getByRole('button', { name: 'Vendidos' }));
    fireEvent.click(await screen.findByText('MC-040'));
    expect(await screen.findByText('Cómo se pagó')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /volver/i }));

    expect(await screen.findByText('MC-040')).toBeInTheDocument();
    expect(screen.queryByText('MC-041')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vendidos' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('después de vender, el vehículo pasa de "En stock" a "Vendidos" al volver al listado', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const enStock = {
      id: 'v50', codigo: 'MC-050', marca: 'Peugeot', modelo: '208', anio: 2019, color: null,
      estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-14',
    };
    const vendido = { ...enStock, estado: 'vendido' };
    const mockCuentasService = {
      obtenerCuentasConSaldo: vi.fn().mockResolvedValue([
        { id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo', saldo: 5000000 },
      ]),
      obtenerDineroDisponible: vi.fn().mockResolvedValue(5000000),
      crearCuenta: vi.fn(),
    };
    const mockVehiculosService = {
      // Carga al entrar a la app y al abrir Vender: en stock; después de la venta, vendido
      listarVehiculos: vi.fn().mockResolvedValueOnce([enStock]).mockResolvedValueOnce([enStock]).mockResolvedValue([vendido]),
      obtenerInventario: vi.fn().mockResolvedValue({ total: 0, cantidad: 0 }),
      registrarVentaConPermutas: vi.fn().mockResolvedValue({ success: true, ventaId: 'ven50', codigo: 'MC-050', ganancia: 0 }),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        cuentasService={mockCuentasService as unknown as any}
        vehiculosService={mockVehiculosService as unknown as any}
      />
    );

    irACaja(); fireEvent.click(screen.getByRole('button', { name: /vender vehículo/i }));
    fireEvent.click(await screen.findByText('MC-050'));
    fireEvent.change(await screen.findByLabelText(/precio de venta/i), { target: { value: '5000000' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    await screen.findByTestId('codigo-venta');
    fireEvent.click(screen.getByRole('button', { name: /volver a caja/i }));

    fireEvent.click(screen.getByRole('button', { name: /vehículos/i }));
    await screen.findByRole('button', { name: 'Vendidos' });
    expect(screen.queryByText('MC-050')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Vendidos' }));
    expect(await screen.findByText('MC-050')).toBeInTheDocument();
  });

  it('el botón grande "Registrar gasto" abre la pantalla de gasto y permite volver', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
      />
    );

    irACaja(); fireEvent.click(screen.getByRole('button', { name: /registrar gasto/i }));

    expect(await screen.findByRole('heading', { name: /registrar gasto/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /volver/i }));

    expect(await screen.findByText(/hola, agustín fernandez/i)).toBeInTheDocument();
  });

  it('al confirmar un gasto desde la app, lo guarda con el servicio y recarga cuentas y vehículos', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const mockCuentasService = {
      obtenerCuentasConSaldo: vi.fn().mockResolvedValue([
        { id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo', saldo: 500000 },
      ]),
      obtenerDineroDisponible: vi.fn().mockResolvedValue(500000),
      crearCuenta: vi.fn(),
    };
    const mockVehiculosService = {
      listarVehiculos: vi.fn().mockResolvedValue([]),
      obtenerInventario: vi.fn().mockResolvedValue({ total: 0, cantidad: 0 }),
      listarCategorias: vi.fn().mockResolvedValue([{ id: 'cat1', nombre: 'Mecánica' }]),
      registrarGasto: vi.fn().mockResolvedValue({ success: true, gastoId: 'g9', saldoCuenta: 250000 }),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        cuentasService={mockCuentasService as unknown as any}
        vehiculosService={mockVehiculosService as unknown as any}
      />
    );

    irACaja(); fireEvent.click(screen.getByRole('button', { name: /registrar gasto/i }));
    fireEvent.change(await screen.findByLabelText(/monto/i), { target: { value: '250000' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Mecánica' }));
    fireEvent.click(screen.getByRole('button', { name: /caja efectivo/i }));
    fireEvent.click(screen.getByRole('button', { name: 'General del negocio' }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(await screen.findByText(/gasto registrado/i)).toBeInTheDocument();
    expect(mockVehiculosService.registrarGasto).toHaveBeenCalledTimes(1);
    expect(mockCuentasService.obtenerCuentasConSaldo.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('desde el detalle de un vehículo, "Agregar gasto" abre el formulario con ese vehículo elegido', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const mockVehiculosService = {
      listarVehiculos: vi.fn().mockResolvedValue([
        { id: 'v60', codigo: 'MC-060', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-14' },
      ]),
      obtenerDetalle: vi.fn().mockResolvedValue({
        success: true,
        detalle: {
          id: 'v60', codigo: 'MC-060', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, patente: null,
          estado: 'en_stock', origen: 'inventario_inicial', fechaIngreso: '2026-11-14', vendedor: null,
          valorIngreso: 0, gastosAsignados: 0, costoReal: 0, pagos: [], venta: null, gastos: [],
        },
      }),
      listarCategorias: vi.fn().mockResolvedValue([{ id: 'cat1', nombre: 'Mecánica' }]),
    };
    const mockCuentasService = {
      obtenerCuentasConSaldo: vi.fn().mockResolvedValue([
        { id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo', saldo: 500000 },
      ]),
      obtenerDineroDisponible: vi.fn().mockResolvedValue(500000),
      crearCuenta: vi.fn(),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        cuentasService={mockCuentasService as unknown as any}
        vehiculosService={mockVehiculosService as unknown as any}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /vehículos/i }));
    fireEvent.click(await screen.findByText('MC-060'));
    fireEvent.click(await screen.findByRole('button', { name: /agregar gasto/i }));

    expect(await screen.findByRole('heading', { name: /registrar gasto/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Un vehículo' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('el botón grande "Registrar ingreso" abre la pantalla de ingreso y permite volver', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
      />
    );

    irACaja(); fireEvent.click(screen.getByRole('button', { name: /registrar ingreso/i }));

    expect(await screen.findByRole('heading', { name: /registrar ingreso/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /volver/i }));

    expect(await screen.findByText(/hola, agustín fernandez/i)).toBeInTheDocument();
  });

  it('al confirmar un ingreso desde la app, lo guarda con el servicio y recarga las cuentas', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const mockCuentasService = {
      obtenerCuentasConSaldo: vi.fn().mockResolvedValue([
        { id: 'c1', nombre: 'Banco', tipo: 'banco', saldo: 500000 },
      ]),
      obtenerDineroDisponible: vi.fn().mockResolvedValue(500000),
      crearCuenta: vi.fn(),
    };
    const mockVehiculosService = {
      listarVehiculos: vi.fn().mockResolvedValue([]),
      obtenerInventario: vi.fn().mockResolvedValue({ total: 0, cantidad: 0 }),
      listarCategorias: vi.fn().mockResolvedValue([{ id: 'cat9', nombre: 'Comisión' }]),
      registrarIngreso: vi.fn().mockResolvedValue({ success: true, saldoCuenta: 580000 }),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        cuentasService={mockCuentasService as unknown as any}
        vehiculosService={mockVehiculosService as unknown as any}
      />
    );

    irACaja(); fireEvent.click(screen.getByRole('button', { name: /registrar ingreso/i }));
    fireEvent.change(await screen.findByLabelText(/monto/i), { target: { value: '80000' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Comisión' }));
    fireEvent.click(screen.getByRole('button', { name: /banco/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(await screen.findByText(/ingreso registrado/i)).toBeInTheDocument();
    expect(mockVehiculosService.registrarIngreso).toHaveBeenCalledTimes(1);
    expect(mockCuentasService.obtenerCuentasConSaldo.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('el botón grande "Movimientos" abre el historial y permite volver', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const mockVehiculosService = {
      listarVehiculos: vi.fn().mockResolvedValue([]),
      listarMovimientos: vi.fn().mockResolvedValue([]),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        vehiculosService={mockVehiculosService as unknown as any}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /^movimientos$/i }));

    expect(await screen.findByRole('heading', { name: 'Movimientos' })).toBeInTheDocument();
    expect(mockVehiculosService.listarMovimientos).toHaveBeenCalledWith(0);

    // Movimientos es pestaña raíz: se vuelve a Caja con la barra, no con Volver
    irACaja();

    expect(await screen.findByText(/hola, agustín fernandez/i)).toBeInTheDocument();
  });

  it('"Ver más" en Movimientos trae la página siguiente, desde donde quedó', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const pagina = (desde: number) =>
      Array.from({ length: 50 }, (_, i) => ({
        id: `m${desde + i}`, fecha: '2026-11-14', tipo: 'ingreso_otro', monto: 1000, descripcion: `Ingreso ${desde + i}`,
        cuentaNombre: 'Banco', vehiculoCodigo: null, categoriaNombre: 'Comisión', creadoPor: 'Lautaro',
        anulado: false, anuladoPor: null, motivoAnulacion: null, gastoId: null, ventaId: null,
      }));
    const mockVehiculosService = {
      listarVehiculos: vi.fn().mockResolvedValue([]),
      listarMovimientos: vi.fn().mockImplementation((desde: number) => Promise.resolve(pagina(desde))),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        vehiculosService={mockVehiculosService as unknown as any}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /^movimientos$/i }));
    await screen.findByText('Ingreso 0');
    fireEvent.click(screen.getByRole('button', { name: /ver más/i }));

    expect(await screen.findByText('Ingreso 50')).toBeInTheDocument();
    expect(mockVehiculosService.listarMovimientos).toHaveBeenLastCalledWith(50);
  });

  it('anular un ingreso desde Movimientos lo anula con el servicio y recarga el historial y las cuentas', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const ingreso = {
      id: 'm20', fecha: '2026-11-14', tipo: 'ingreso_otro', monto: 80000, descripcion: 'Comisión',
      cuentaNombre: 'Banco', vehiculoCodigo: null, categoriaNombre: 'Comisión', creadoPor: 'Lautaro',
      anulado: false, anuladoPor: null, motivoAnulacion: null, gastoId: null, ventaId: null,
    };
    const mockCuentasService = {
      obtenerCuentasConSaldo: vi.fn().mockResolvedValue([{ id: 'c1', nombre: 'Banco', tipo: 'banco', saldo: 80000 }]),
      obtenerDineroDisponible: vi.fn().mockResolvedValue(80000),
      crearCuenta: vi.fn(),
    };
    const mockVehiculosService = {
      listarVehiculos: vi.fn().mockResolvedValue([]),
      obtenerInventario: vi.fn().mockResolvedValue({ total: 0, cantidad: 0 }),
      listarMovimientos: vi.fn().mockResolvedValue([ingreso]),
      anularMovimiento: vi.fn().mockResolvedValue({ success: true }),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        cuentasService={mockCuentasService as unknown as any}
        vehiculosService={mockVehiculosService as unknown as any}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /^movimientos$/i }));
    fireEvent.click(await screen.findByText('Comisión'));
    fireEvent.click(screen.getByRole('button', { name: /^anular$/i }));
    fireEvent.change(screen.getByLabelText(/motivo/i), { target: { value: 'cargué mal el monto' } });
    fireEvent.click(screen.getByRole('button', { name: /anular movimiento/i }));

    await waitFor(() =>
      expect(mockVehiculosService.anularMovimiento).toHaveBeenCalledWith(
        expect.objectContaining({ movimientoId: 'm20', gastoId: null, motivo: 'cargué mal el monto', tipo: 'ingreso_otro' })
      )
    );
    expect(mockVehiculosService.listarMovimientos.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(mockCuentasService.obtenerCuentasConSaldo.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('al abrir Vehículos muestra los vehículos que trae el servicio', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const mockVehiculosService = {
      listarVehiculos: vi.fn().mockResolvedValue([
        {
          id: 'v9',
          codigo: 'MC-009',
          marca: 'Peugeot',
          modelo: '208',
          anio: 2019,
          color: 'Gris',
          estado: 'en_stock',
          fotoUrl: null,
        },
      ]),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        vehiculosService={mockVehiculosService as unknown as any}
      />
    );

    // La app abre en Vehículos y pide el listado al entrar (una sola vez)
    expect(await screen.findByText('MC-009')).toBeInTheDocument();
    expect(mockVehiculosService.listarVehiculos).toHaveBeenCalledTimes(1);
  });

  it('desde Vehículos, guardar un stock existente lo manda al servicio y muestra su código', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const mockVehiculosService = {
      listarVehiculos: vi.fn().mockResolvedValue([]),
      cargarStock: vi.fn().mockResolvedValue({
        success: true,
        codigo: 'MC-010',
        fechaIngreso: '2026-11-13',
      }),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        vehiculosService={mockVehiculosService as unknown as any}
      />
    );

    // "Cargar stock existente" está en Más
    fireEvent.click(screen.getByRole('button', { name: /^más$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /cargar stock existente/i }));
    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Renault' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Clio' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2008' } });
    fireEvent.change(screen.getByLabelText(/costo/i), { target: { value: '3000000' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText('MC-010')).toBeInTheDocument();
    expect(mockVehiculosService.cargarStock).toHaveBeenCalledWith(
      expect.objectContaining({ marca: 'Renault', modelo: 'Clio', anio: 2008, costo: 3000000 })
    );
  });

  it('después de guardar, al volver al listado aparece el vehículo nuevo', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const nuevo = {
      id: 'v10',
      codigo: 'MC-010',
      marca: 'Renault',
      modelo: 'Clio',
      anio: 2008,
      color: null,
      estado: 'en_stock',
      fotoUrl: null,
    };
    const mockVehiculosService = {
      listarVehiculos: vi.fn().mockResolvedValueOnce([]).mockResolvedValue([nuevo]),
      cargarStock: vi.fn().mockResolvedValue({
        success: true,
        codigo: 'MC-010',
        fechaIngreso: '2026-11-13',
      }),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        vehiculosService={mockVehiculosService as unknown as any}
      />
    );

    // "Cargar stock existente" está en Más
    fireEvent.click(screen.getByRole('button', { name: /^más$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /cargar stock existente/i }));
    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Renault' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Clio' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2008' } });
    fireEvent.change(screen.getByLabelText(/costo/i), { target: { value: '3000000' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByTestId('codigo-asignado')).toHaveTextContent('MC-010');
    fireEvent.click(screen.getByRole('button', { name: /volver al listado/i }));

    expect(await screen.findByText('Renault Clio')).toBeInTheDocument();
    expect(mockVehiculosService.listarVehiculos).toHaveBeenCalledTimes(2);
  });

  it('permite navegar a Cuentas desde Configuración y volver', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const mockCuentasService = {
      obtenerCuentasConSaldo: vi.fn().mockResolvedValue([]),
      obtenerDineroDisponible: vi.fn().mockResolvedValue(0),
      crearCuenta: vi.fn(),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        cuentasService={mockCuentasService as unknown as any}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /más/i }));
    const btnCuentas = screen.getByRole('button', { name: /cuentas/i });
    expect(btnCuentas).toBeInTheDocument();

    fireEvent.click(btnCuentas);

    expect(await screen.findByText(/nueva cuenta/i)).toBeInTheDocument();

    const btnVolver = screen.getByRole('button', { name: /volver/i });
    fireEvent.click(btnVolver);

    expect(await screen.findByRole('button', { name: /cuentas/i })).toBeInTheDocument();
  });
});
