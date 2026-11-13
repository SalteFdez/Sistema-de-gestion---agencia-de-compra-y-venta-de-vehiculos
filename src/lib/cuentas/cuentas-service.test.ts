import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CuentasService, type CuentasDbClient } from './cuentas-service';

describe('CuentasService', () => {
  let mockDb: CuentasDbClient;

  beforeEach(() => {
    mockDb = {
      rpc: vi.fn(),
      from: vi.fn(),
    };
  });

  describe('crearCuenta', () => {
    it('valida que el nombre no esté vacío', async () => {
      const service = new CuentasService(mockDb);
      const res = await service.crearCuenta({
        nombre: '   ',
        tipo: 'efectivo',
        saldoInicial: 0,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/nombre no puede estar vacío/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('valida que el saldo inicial no sea negativo', async () => {
      const service = new CuentasService(mockDb);
      const res = await service.crearCuenta({
        nombre: 'Caja',
        tipo: 'efectivo',
        saldoInicial: -100,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/saldo.*no puede ser negativo/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('llama a la RPC crear_cuenta con los parámetros correctos', async () => {
      mockDb.rpc = vi.fn().mockResolvedValue({
        data: { id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo', saldo: 1500000 },
        error: null,
      });

      const service = new CuentasService(mockDb);
      const res = await service.crearCuenta({
        nombre: 'Caja efectivo',
        tipo: 'efectivo',
        saldoInicial: 1500000,
      });

      expect(res.success).toBe(true);
      expect(res.cuenta?.nombre).toBe('Caja efectivo');
      expect(mockDb.rpc).toHaveBeenCalledWith('crear_cuenta', {
        p_nombre: 'Caja efectivo',
        p_tipo: 'efectivo',
        p_saldo_inicial: 1500000,
      });
    });

    it('captura error si la cuenta ya existe (duplicado en la base de datos)', async () => {
      mockDb.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Ya hay una cuenta con ese nombre' },
      });

      const service = new CuentasService(mockDb);
      const res = await service.crearCuenta({
        nombre: 'caja efectivo',
        tipo: 'efectivo',
        saldoInicial: 0,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/ya hay una cuenta con ese nombre/i);
    });
  });

  describe('obtenerCuentasConSaldo', () => {
    it('obtiene las cuentas desde la vista v_saldo_cuentas', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo', saldo: 500000 },
            { id: 'c2', nombre: 'Banco Galicia', tipo: 'banco', saldo: 2000000 },
          ],
          error: null,
        }),
      });
      mockDb.from = vi.fn().mockReturnValue({ select: mockSelect });

      const service = new CuentasService(mockDb);
      const cuentas = await service.obtenerCuentasConSaldo();

      expect(cuentas).toHaveLength(2);
      expect(cuentas[0].nombre).toBe('Caja efectivo');
      expect(cuentas[0].saldo).toBe(500000);
      expect(mockDb.from).toHaveBeenCalledWith('v_saldo_cuentas');
    });
  });

  describe('obtenerDineroDisponible', () => {
    it('obtiene el total desde la vista v_dinero_disponible', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { total: 2500000 },
          error: null,
        }),
      });
      mockDb.from = vi.fn().mockReturnValue({ select: mockSelect });

      const service = new CuentasService(mockDb);
      const total = await service.obtenerDineroDisponible();

      expect(total).toBe(2500000);
      expect(mockDb.from).toHaveBeenCalledWith('v_dinero_disponible');
    });

    it('devuelve 0 si la vista no tiene registros', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });
      mockDb.from = vi.fn().mockReturnValue({ select: mockSelect });

      const service = new CuentasService(mockDb);
      const total = await service.obtenerDineroDisponible();

      expect(total).toBe(0);
    });
  });
});
