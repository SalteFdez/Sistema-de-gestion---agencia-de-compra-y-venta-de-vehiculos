import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VehiculosService, cuentasQueQuedaranNegativas, type VehiculosDbClient } from './vehiculos-service';

describe('VehiculosService', () => {
  let mockDb: VehiculosDbClient;

  beforeEach(() => {
    mockDb = {
      rpc: vi.fn(),
      from: vi.fn(),
    };
  });

  describe('transferir', () => {
    it('no pasa plata si la cuenta de origen y la de destino son la misma', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.transferir({
        origenId: 'c1',
        destinoId: 'c1',
        monto: 1000000,
        descripcion: 'Depósito del efectivo',
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/cuentas distintas/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('no pasa plata si el monto es 0', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.transferir({
        origenId: 'c1',
        destinoId: 'c2',
        monto: 0,
        descripcion: 'Depósito del efectivo',
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/mayor que 0/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('un pase válido llama a la RPC transferir con origen, destino, monto y descripción, y devuelve éxito', async () => {
      mockDb.rpc = vi.fn().mockResolvedValue({ data: { transferencia_id: 't1' }, error: null });
      const service = new VehiculosService(mockDb);
      const res = await service.transferir({
        origenId: 'c1',
        destinoId: 'c2',
        monto: 1000000,
        descripcion: 'Depósito del efectivo',
      });

      expect(res.success).toBe(true);
      expect(mockDb.rpc).toHaveBeenCalledWith('transferir', {
        p_origen_id: 'c1',
        p_destino_id: 'c2',
        p_monto: 1000000,
        p_descripcion: 'Depósito del efectivo',
      });
    });

    it('si se corta la conexión, dice que no se pudo confirmar y no afirma que no se pasó nada', async () => {
      mockDb.rpc = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
      const service = new VehiculosService(mockDb);
      const res = await service.transferir({
        origenId: 'c1',
        destinoId: 'c2',
        monto: 1000000,
        descripcion: 'Depósito del efectivo',
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/sin conexión/i);
      expect(res.error).toMatch(/no se pudo confirmar/i);
      expect(res.error).not.toMatch(/no se pasó nada/i);
    });
  });

  describe('registrarAporte', () => {
    it('no registra si no se eligió el socio', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarAporte({
        socioId: '',
        cuentaId: 'c1',
        monto: 500000,
        descripcion: 'Aporte para el capital',
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/socio/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('no registra si no se eligió la cuenta', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarAporte({
        socioId: 'u2',
        cuentaId: '',
        monto: 500000,
        descripcion: 'Aporte para el capital',
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/cuenta/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('no registra si el monto es 0', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarAporte({
        socioId: 'u2',
        cuentaId: 'c1',
        monto: 0,
        descripcion: 'Aporte para el capital',
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/mayor que 0/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('un aporte válido llama a la RPC registrar_aporte y devuelve éxito', async () => {
      mockDb.rpc = vi.fn().mockResolvedValue({ data: { movimiento_id: 'm1' }, error: null });
      const service = new VehiculosService(mockDb);
      const res = await service.registrarAporte({
        socioId: 'u2',
        cuentaId: 'c1',
        monto: 500000,
        descripcion: 'Aporte para el capital',
      });

      expect(res.success).toBe(true);
      expect(mockDb.rpc).toHaveBeenCalledWith('registrar_aporte', {
        p_socio_id: 'u2',
        p_cuenta_id: 'c1',
        p_monto: 500000,
        p_descripcion: 'Aporte para el capital',
      });
    });

    it('si se corta la conexión, dice que no se pudo confirmar y no afirma que no se registró nada', async () => {
      mockDb.rpc = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
      const service = new VehiculosService(mockDb);
      const res = await service.registrarAporte({
        socioId: 'u2',
        cuentaId: 'c1',
        monto: 500000,
        descripcion: 'Aporte para el capital',
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/sin conexión/i);
      expect(res.error).toMatch(/no se pudo confirmar/i);
      expect(res.error).not.toMatch(/no se registró nada/i);
    });
  });

  describe('registrarRetiro', () => {
    it('un retiro válido llama a la RPC registrar_retiro y devuelve éxito', async () => {
      mockDb.rpc = vi.fn().mockResolvedValue({ data: { movimiento_id: 'm2' }, error: null });
      const service = new VehiculosService(mockDb);
      const res = await service.registrarRetiro({
        socioId: 'u3',
        cuentaId: 'c1',
        monto: 300000,
        descripcion: 'Retiro personal',
      });

      expect(res.success).toBe(true);
      expect(mockDb.rpc).toHaveBeenCalledWith('registrar_retiro', {
        p_socio_id: 'u3',
        p_cuenta_id: 'c1',
        p_monto: 300000,
        p_descripcion: 'Retiro personal',
      });
    });
  });

  describe('anularTransferencia', () => {
    it('anular un pase desde la pata de salida llama a la RPC con esa pata y el motivo', async () => {
      mockDb.rpc = vi.fn().mockResolvedValue({ data: { transferencia_id: 't1' }, error: null });
      const service = new VehiculosService(mockDb);
      const res = await service.anularTransferencia({
        movimientoId: 'pata-salida',
        motivo: 'cargué mal el monto',
      });

      expect(res.success).toBe(true);
      expect(mockDb.rpc).toHaveBeenCalledWith('anular_transferencia', {
        p_movimiento_id: 'pata-salida',
        p_motivo: 'cargué mal el monto',
      });
    });

    it('no anula un pase si el motivo está vacío', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.anularTransferencia({ movimientoId: 'pata-salida', motivo: '   ' });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/motivo.*obligatorio/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });
  });

  describe('anularMovimiento: aporte y retiro de socio', () => {
    it('anular un aporte o un retiro llama a anular_movimiento con su id y el motivo', async () => {
      mockDb.rpc = vi.fn().mockResolvedValue({ data: null, error: null });
      const service = new VehiculosService(mockDb);

      for (const tipo of ['aporte_socio', 'retiro_socio'] as const) {
        const res = await service.anularMovimiento({
          movimientoId: `m-${tipo}`,
          gastoId: null,
          motivo: 'cargué mal el monto',
          tipo,
          anulado: false,
        });
        expect(res.success).toBe(true);
      }

      expect(mockDb.rpc).toHaveBeenCalledWith('anular_movimiento', {
        p_movimiento_id: 'm-aporte_socio',
        p_motivo: 'cargué mal el monto',
      });
      expect(mockDb.rpc).toHaveBeenCalledWith('anular_movimiento', {
        p_movimiento_id: 'm-retiro_socio',
        p_motivo: 'cargué mal el monto',
      });
    });
  });

  describe('listarMovimientos: pases y socios', () => {
    it('un pase trae la cuenta de la otra pata y un aporte trae el nombre del socio', async () => {
      const pagina = [
        {
          id: 'p1', fecha: '2026-11-16', tipo: 'transferencia_salida', monto: -1000000, descripcion: 'Depósito del efectivo',
          anulado: false, anulado_at: null, motivo_anulacion: null, gasto_id: null, venta_id: null, vehiculo_id: null,
          transferencia_id: 't1', socio_id: null, cuenta: { nombre: 'Caja efectivo' }, vehiculo: null, categoria: null,
          creador: { nombre: 'Agustín Fernandez' }, anulador: null, socio: null,
        },
        {
          id: 'a1', fecha: '2026-11-16', tipo: 'aporte_socio', monto: 500000, descripcion: null,
          anulado: false, anulado_at: null, motivo_anulacion: null, gasto_id: null, venta_id: null, vehiculo_id: null,
          transferencia_id: null, socio_id: 'u2', cuenta: { nombre: 'Caja efectivo' }, vehiculo: null, categoria: null,
          creador: { nombre: 'Agustín Fernandez' }, anulador: null, socio: { nombre: 'Lautaro' },
        },
      ];
      const contrapartes = [
        { id: 'p2', transferencia_id: 't1', monto: 1000000, cuenta: { nombre: 'Banco' } },
      ];
      // Consulta encadenable: la página termina en range; la búsqueda de contrapartes en in
      const chain = () => {
        const b: Record<string, unknown> = {
          order: vi.fn(() => b),
          range: vi.fn(() => Promise.resolve({ data: pagina, error: null })),
          in: vi.fn(() => Promise.resolve({ data: contrapartes, error: null })),
        };
        return b;
      };
      mockDb.from = vi.fn().mockReturnValue({ select: vi.fn(() => chain()) });

      const service = new VehiculosService(mockDb);
      const items = await service.listarMovimientos(0);

      expect(items[0].cuentaContraparte).toBe('Banco');
      expect(items[1].socioNombre).toBe('Lautaro');
    });
  });

  describe('registrarGastoRepartido', () => {
    const base = {
      monto: 300000,
      categoriaId: 'cat1',
      cuentaId: 'c1',
      descripcion: 'Chapa y pintura',
    };

    it('rechaza una asignación de monto 0', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarGastoRepartido({
        ...base,
        asignaciones: [{ vehiculoId: 'v1', monto: 0 }],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/mayor que 0/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('rechaza repetir un vehículo', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarGastoRepartido({
        ...base,
        asignaciones: [
          { vehiculoId: 'v1', monto: 100000 },
          { vehiculoId: 'v1', monto: 50000 },
        ],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/repetiste|repetido/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('rechaza si lo asignado supera el total y dice cuánto sobra', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarGastoRepartido({
        ...base,
        asignaciones: [
          { vehiculoId: 'v1', monto: 250000 },
          { vehiculoId: 'v2', monto: 100000 },
        ],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/sobran \$ 50\.000/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('un reparto parcial llama a la RPC con las asignaciones y devuelve éxito', async () => {
      mockDb.rpc = vi.fn().mockResolvedValue({ data: { gasto_id: 'g1' }, error: null });
      const service = new VehiculosService(mockDb);
      const res = await service.registrarGastoRepartido({
        ...base,
        asignaciones: [
          { vehiculoId: 'v1', monto: 250000 },
          { vehiculoId: 'v2', monto: 20000 },
        ],
      });

      expect(res.success).toBe(true);
      expect(mockDb.rpc).toHaveBeenCalledWith('registrar_gasto_repartido', {
        p_monto: 300000,
        p_categoria_id: 'cat1',
        p_cuenta_id: 'c1',
        p_descripcion: 'Chapa y pintura',
        p_asignaciones: [
          { vehiculo_id: 'v1', monto: 250000 },
          { vehiculo_id: 'v2', monto: 20000 },
        ],
      });
    });

    it('un gasto sin ningún vehículo también se registra (lista vacía)', async () => {
      mockDb.rpc = vi.fn().mockResolvedValue({ data: { gasto_id: 'g2' }, error: null });
      const service = new VehiculosService(mockDb);
      const res = await service.registrarGastoRepartido({ ...base, asignaciones: [] });

      expect(res.success).toBe(true);
      expect(mockDb.rpc).toHaveBeenCalledWith(
        'registrar_gasto_repartido',
        expect.objectContaining({ p_asignaciones: [] })
      );
    });

    it('si se corta la conexión, no afirma que no se guardó nada', async () => {
      mockDb.rpc = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
      const service = new VehiculosService(mockDb);
      const res = await service.registrarGastoRepartido({
        ...base,
        asignaciones: [{ vehiculoId: 'v1', monto: 100000 }],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/sin conexión/i);
      expect(res.error).toMatch(/no se pudo confirmar/i);
      expect(res.error).not.toMatch(/no se guardó nada/i);
    });
  });

  describe('vistaPreviaAnulacionVehiculo: gastos compartidos', () => {
    // Asignaciones vigentes en memoria: el fake respeta eq() e in(), como la base
    const asignaciones = [
      { vehiculo_id: 'v1', gasto_id: 'g1', monto: 250000, anulada: false, gasto: { monto_total: 250000, anulado: false } },
      { vehiculo_id: 'v1', gasto_id: 'g2', monto: 50000, anulada: false, gasto: { monto_total: 300000, anulado: false } },
      { vehiculo_id: 'v2', gasto_id: 'g2', monto: 250000, anulada: false, gasto: { monto_total: 300000, anulado: false } },
      { vehiculo_id: 'v1', gasto_id: 'g3', monto: 90000, anulada: true, gasto: { monto_total: 90000, anulado: false } },
    ];

    const consultaSobre = (filas: Array<Record<string, unknown>>) => {
      const b: Record<string, unknown> = {
        eq: vi.fn((col: string, val: unknown) => consultaSobre(filas.filter((f) => f[col] === val))),
        in: vi.fn((col: string, vals: unknown[]) => Promise.resolve({ data: filas.filter((f) => vals.includes(f[col])), error: null })),
        then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
          Promise.resolve({ data: filas, error: null }).then(ok, ko),
      };
      return b;
    };

    it('un gasto solo del auto se anula entero; la parte de un gasto compartido queda sin asignar', async () => {
      mockDb.from = vi.fn().mockImplementation((tabla: string) => {
        if (tabla === 'asignaciones_gasto') {
          return { select: vi.fn(() => consultaSobre(asignaciones)) };
        }
        return { select: vi.fn(() => consultaSobre([])) };
      });

      const service = new VehiculosService(mockDb);
      const res = await service.vistaPreviaAnulacionVehiculo('v1');

      expect(res.gastosQueSeAnulan).toEqual({ cantidad: 1, total: 250000 });
      expect(res.partesSinAsignar).toEqual({ cantidad: 1, total: 50000 });
    });
  });

  describe('obtenerDetalle: gastos repartidos', () => {
    it('el detalle lista solo las asignaciones vigentes, no las anuladas', async () => {
      // Fake que filtra por eq(), como la base
      const builder = (filas: Array<Record<string, unknown>>) => {
        const b: Record<string, unknown> = {
          eq: vi.fn((col: string, val: unknown) => builder(filas.filter((f) => f[col] === val))),
          maybeSingle: vi.fn(() => Promise.resolve({ data: filas[0] ?? null, error: null })),
          then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
            Promise.resolve({ data: filas, error: null }).then(ok, ko),
        };
        return b;
      };
      const tablas: Record<string, Array<Record<string, unknown>>> = {
        vehiculos: [
          { id: 'v1', codigo: 'MC-010', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, patente: null,
            estado: 'en_stock', origen: 'compra', fecha_ingreso: '2026-11-01', vendedor_texto: null, valor_ingreso: 3000000 },
        ],
        v_costo_vehiculo: [{ vehiculo_id: 'v1', valor_ingreso: 3000000, gastos_asignados: 250000, costo_real: 3250000 }],
        movimientos: [],
        asignaciones_gasto: [
          { vehiculo_id: 'v1', monto: 250000, anulada: false,
            gasto: { fecha: '2026-11-14', descripcion: 'Pintura', anulado: false, categoria: { nombre: 'Chapa y pintura' } } },
          { vehiculo_id: 'v1', monto: 90000, anulada: true,
            gasto: { fecha: '2026-11-14', descripcion: 'Mal cargado', anulado: false, categoria: { nombre: 'Mecánica' } } },
        ],
      };
      mockDb.from = vi.fn().mockImplementation((tabla: string) => ({ select: vi.fn(() => builder(tablas[tabla] ?? [])) }));

      const service = new VehiculosService(mockDb);
      const res = await service.obtenerDetalle('v1');

      expect(res.detalle?.gastos).toHaveLength(1);
      expect(res.detalle?.gastos[0].descripcion).toBe('Pintura');
    });
  });

  describe('vistaPreviaAnularGasto', () => {
    it('un gasto repartido lista a qué autos les baja el costo y cuánto', async () => {
      const filas = [
        { gasto_id: 'g1', monto: 250000, anulada: false, vehiculo: { codigo: 'MC-010' } },
        { gasto_id: 'g1', monto: 50000, anulada: false, vehiculo: { codigo: 'MC-012' } },
        { gasto_id: 'g1', monto: 999, anulada: true, vehiculo: { codigo: 'MC-099' } },
      ];
      const builder = (f: Array<Record<string, unknown>>): Record<string, unknown> => {
        const b: Record<string, unknown> = {
          eq: vi.fn((col: string, val: unknown) => builder(f.filter((x) => x[col] === val))),
          then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
            Promise.resolve({ data: f, error: null }).then(ok, ko),
        };
        return b;
      };
      mockDb.from = vi.fn().mockReturnValue({ select: vi.fn(() => builder(filas)) });

      const service = new VehiculosService(mockDb);
      const vista = await service.vistaPreviaAnularGasto('g1');

      expect(vista).toEqual([
        { codigo: 'MC-010', monto: 250000 },
        { codigo: 'MC-012', monto: 50000 },
      ]);
    });
  });

  describe('listarSocios', () => {
    it('devuelve los socios con su id y su nombre', async () => {
      const consulta = {
        order: vi.fn(() => consulta),
        then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
          Promise.resolve({
            data: [
              { id: 'u1', nombre: 'Agustín Fernandez' },
              { id: 'u2', nombre: 'Lautaro' },
              { id: 'u3', nombre: 'Antonio' },
            ],
            error: null,
          }).then(ok, ko),
      };
      mockDb.from = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(consulta) });

      const service = new VehiculosService(mockDb);
      const socios = await service.listarSocios();

      expect(mockDb.from).toHaveBeenCalledWith('usuarios');
      expect(socios).toEqual([
        { id: 'u1', nombre: 'Agustín Fernandez' },
        { id: 'u2', nombre: 'Lautaro' },
        { id: 'u3', nombre: 'Antonio' },
      ]);
    });
  });

  describe('cargarStock', () => {
    it('no guarda si falta la marca', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.cargarStock({
        marca: '   ',
        modelo: 'Gol',
        anio: 2015,
        costo: 5000000,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/marca.*obligatoria/i);
      expect(mockDb.from).not.toHaveBeenCalled();
    });

    it('no guarda si falta el modelo', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.cargarStock({
        marca: 'Volkswagen',
        modelo: '  ',
        anio: 2015,
        costo: 5000000,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/modelo.*obligatorio/i);
      expect(mockDb.from).not.toHaveBeenCalled();
    });

    it('no guarda si falta el año', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.cargarStock({
        marca: 'Volkswagen',
        modelo: 'Gol',
        anio: null as unknown as number,
        costo: 5000000,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/año.*obligatorio/i);
      expect(mockDb.from).not.toHaveBeenCalled();
    });

    it('no guarda si falta el costo', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.cargarStock({
        marca: 'Volkswagen',
        modelo: 'Gol',
        anio: 2015,
        costo: null as unknown as number,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/costo.*obligatorio/i);
      expect(mockDb.from).not.toHaveBeenCalled();
    });

    it('no guarda si el año está fuera de rango', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.cargarStock({
        marca: 'Volkswagen',
        modelo: 'Gol',
        anio: 1900,
        costo: 5000000,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/año.*entre/i);
      expect(mockDb.from).not.toHaveBeenCalled();
    });

    it('no guarda si el costo es negativo', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.cargarStock({
        marca: 'Volkswagen',
        modelo: 'Gol',
        anio: 2015,
        costo: -100,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/costo.*negativo/i);
      expect(mockDb.from).not.toHaveBeenCalled();
    });

    it('acepta costo 0 (costo desconocido) y devuelve el código asignado', async () => {
      const insertSingle = vi.fn().mockResolvedValue({
        data: { id: 'v1', codigo: 'MC-001' },
        error: null,
      });
      const insert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: insertSingle }) });
      mockDb.from = vi.fn().mockReturnValue({ insert });

      const service = new VehiculosService(mockDb);
      const res = await service.cargarStock({
        marca: 'Volkswagen',
        modelo: 'Gol',
        anio: 2015,
        costo: 0,
      });

      expect(res.success).toBe(true);
      expect(res.codigo).toBe('MC-001');
      expect(mockDb.from).toHaveBeenCalledWith('vehiculos');
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({ marca: 'Volkswagen', modelo: 'Gol', anio: 2015, valor_ingreso: 0 })
      );
    });

    it('guarda la patente sin espacios sobrantes', async () => {
      const insertSingle = vi.fn().mockResolvedValue({
        data: { id: 'v6', codigo: 'MC-006', fecha_ingreso: '2026-11-13' },
        error: null,
      });
      const insert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: insertSingle }) });
      mockDb.from = vi.fn().mockReturnValue({ insert });

      const service = new VehiculosService(mockDb);
      await service.cargarStock({
        marca: 'Fiat',
        modelo: 'Uno',
        anio: 2010,
        costo: 0,
        patente: '  AB123CD ',
      });

      expect(insert).toHaveBeenCalledWith(expect.objectContaining({ patente: 'AB123CD' }));
    });

    it('acepta color vacío y lo guarda como null', async () => {
      const insertSingle = vi.fn().mockResolvedValue({
        data: { id: 'v1', codigo: 'MC-001' },
        error: null,
      });
      const insert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: insertSingle }) });
      mockDb.from = vi.fn().mockReturnValue({ insert });

      const service = new VehiculosService(mockDb);
      const res = await service.cargarStock({
        marca: 'Volkswagen',
        modelo: 'Gol',
        anio: 2015,
        costo: 5000000,
        color: '   ',
      });

      expect(res.success).toBe(true);
      expect(insert).toHaveBeenCalledWith(expect.objectContaining({ color: null }));
    });

    it('devuelve el código y la fecha de ingreso que asignó la base', async () => {
      const insertSingle = vi.fn().mockResolvedValue({
        data: { id: 'v2', codigo: 'MC-002', fecha_ingreso: '2026-11-13' },
        error: null,
      });
      const insert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: insertSingle }) });
      mockDb.from = vi.fn().mockReturnValue({ insert });

      const service = new VehiculosService(mockDb);
      const res = await service.cargarStock({
        marca: 'Fiat',
        modelo: 'Uno',
        anio: 2010,
        costo: 0,
      });

      expect(res.success).toBe(true);
      expect(res.codigo).toBe('MC-002');
      expect(res.fechaIngreso).toBe('2026-11-13');
    });

    it('con foto, sube la imagen al bucket vehiculos y guarda la ruta en foto_url', async () => {
      const insertSingle = vi.fn().mockResolvedValue({
        data: { id: 'v3', codigo: 'MC-003', fecha_ingreso: '2026-11-13' },
        error: null,
      });
      const insert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: insertSingle }) });
      const updateEq = vi.fn().mockResolvedValue({ error: null });
      const update = vi.fn().mockReturnValue({ eq: updateEq });
      mockDb.from = vi.fn().mockReturnValue({ insert, update });

      const upload = vi.fn().mockResolvedValue({ error: null });
      const storage = { from: vi.fn().mockReturnValue({ upload }) };

      const service = new VehiculosService(mockDb, storage);
      const foto = new Blob(['jpeg'], { type: 'image/jpeg' });
      const res = await service.cargarStock({
        marca: 'Fiat',
        modelo: 'Uno',
        anio: 2010,
        costo: 0,
        foto,
      });

      expect(res.success).toBe(true);
      expect(storage.from).toHaveBeenCalledWith('vehiculos');
      const [pathSubido, blobSubido, opciones] = upload.mock.calls[0];
      expect(pathSubido).toMatch(/^v3\/.+\.jpg$/);
      expect(blobSubido).toBe(foto);
      expect(opciones).toEqual(expect.objectContaining({ contentType: 'image/jpeg' }));
      expect(update).toHaveBeenCalledWith({ foto_url: pathSubido });
      expect(updateEq).toHaveBeenCalledWith('id', 'v3');
    });

    it('si la subida de la foto falla, guarda el vehículo sin foto y avisa', async () => {
      const insertSingle = vi.fn().mockResolvedValue({
        data: { id: 'v4', codigo: 'MC-004', fecha_ingreso: '2026-11-13' },
        error: null,
      });
      const insert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: insertSingle }) });
      const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      mockDb.from = vi.fn().mockReturnValue({ insert, update });

      const upload = vi.fn().mockResolvedValue({ error: { message: 'Network error' } });
      const storage = { from: vi.fn().mockReturnValue({ upload }) };

      const service = new VehiculosService(mockDb, storage);
      const res = await service.cargarStock({
        marca: 'Fiat',
        modelo: 'Uno',
        anio: 2010,
        costo: 0,
        foto: new Blob(['jpeg'], { type: 'image/jpeg' }),
      });

      expect(res.success).toBe(true);
      expect(res.codigo).toBe('MC-004');
      expect(res.avisoFoto).toMatch(/no se pudo subir la foto/i);
      expect(update).not.toHaveBeenCalled();
    });

    it('si la foto se subió pero no se pudo guardar su ruta, avisa igual', async () => {
      const insertSingle = vi.fn().mockResolvedValue({
        data: { id: 'v5', codigo: 'MC-005', fecha_ingreso: '2026-11-13' },
        error: null,
      });
      const insert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: insertSingle }) });
      const updateEq = vi.fn().mockResolvedValue({ error: { message: 'DB error' } });
      const update = vi.fn().mockReturnValue({ eq: updateEq });
      mockDb.from = vi.fn().mockReturnValue({ insert, update });

      const upload = vi.fn().mockResolvedValue({ error: null });
      const storage = { from: vi.fn().mockReturnValue({ upload }) };

      const service = new VehiculosService(mockDb, storage);
      const res = await service.cargarStock({
        marca: 'Fiat',
        modelo: 'Uno',
        anio: 2010,
        costo: 0,
        foto: new Blob(['jpeg'], { type: 'image/jpeg' }),
      });

      expect(res.success).toBe(true);
      expect(res.codigo).toBe('MC-005');
      expect(res.avisoFoto).toMatch(/no se pudo guardar la foto/i);
    });
  });

  describe('obtenerInventario', () => {
    it('devuelve el total de costos y la cantidad de vehículos en stock desde v_inventario', async () => {
      const maybeSingle = vi.fn().mockResolvedValue({
        data: { cantidad: 3, total: 12500000 },
        error: null,
      });
      const select = vi.fn().mockReturnValue({ maybeSingle });
      mockDb.from = vi.fn().mockReturnValue({ select });

      const service = new VehiculosService(mockDb);
      const inventario = await service.obtenerInventario();

      expect(mockDb.from).toHaveBeenCalledWith('v_inventario');
      expect(inventario).toEqual({ total: 12500000, cantidad: 3 });
    });
  });

  describe('registrarCompra', () => {
    it('no registra si falta la marca y no llama a la RPC', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarCompra({
        marca: '  ',
        modelo: 'Gol',
        anio: 2015,
        precio: 5000000,
        pagos: [{ cuentaId: 'c1', monto: 5000000 }],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/marca.*obligatoria/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('no registra si el año está fuera de rango y no llama a la RPC', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarCompra({
        marca: 'Fiat',
        modelo: 'Uno',
        anio: 1900,
        precio: 5000000,
        pagos: [{ cuentaId: 'c1', monto: 5000000 }],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/año.*entre/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('no registra si el precio no es mayor que 0 y no llama a la RPC', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarCompra({
        marca: 'Fiat',
        modelo: 'Uno',
        anio: 2010,
        precio: 0,
        pagos: [{ cuentaId: 'c1', monto: 1 }],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/precio.*mayor que 0/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('no registra si no hay ningún pago y no llama a la RPC', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarCompra({
        marca: 'Fiat',
        modelo: 'Uno',
        anio: 2010,
        precio: 5000000,
        pagos: [],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/al menos un pago/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('no registra si algún pago es 0 o negativo y no llama a la RPC', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarCompra({
        marca: 'Fiat',
        modelo: 'Uno',
        anio: 2010,
        precio: 5000000,
        pagos: [
          { cuentaId: 'c1', monto: 5000000 },
          { cuentaId: 'c2', monto: 0 },
        ],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/cada pago.*mayor que 0/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('no registra si una cuenta aparece repetida en los pagos y no llama a la RPC', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarCompra({
        marca: 'Fiat',
        modelo: 'Uno',
        anio: 2010,
        precio: 5000000,
        pagos: [
          { cuentaId: 'c1', monto: 3000000 },
          { cuentaId: 'c1', monto: 2000000 },
        ],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/repetir una cuenta/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('no registra si la suma de los pagos no da el precio, e indica cuánto falta', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarCompra({
        marca: 'Fiat',
        modelo: 'Uno',
        anio: 2010,
        precio: 5000000,
        pagos: [
          { cuentaId: 'c1', monto: 3000000 },
          { cuentaId: 'c2', monto: 1500000 },
        ],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/faltan \$ 500\.000/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('si la suma de los pagos supera el precio, indica cuánto sobra', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarCompra({
        marca: 'Fiat',
        modelo: 'Uno',
        anio: 2010,
        precio: 5000000,
        pagos: [{ cuentaId: 'c1', monto: 5500000 }],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/sobran \$ 500\.000/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('con datos válidos llama a registrar_compra y devuelve código y saldos nuevos', async () => {
      mockDb.rpc = vi.fn().mockResolvedValue({
        data: {
          id: 'v9',
          codigo: 'MC-007',
          fecha: '2026-11-14',
          saldos: [
            { cuenta_id: 'c1', nombre: 'Caja efectivo', saldo: -300000 },
            { cuenta_id: 'c2', nombre: 'Banco Galicia', saldo: 0 },
          ],
        },
        error: null,
      });

      const service = new VehiculosService(mockDb);
      const res = await service.registrarCompra({
        marca: 'Fiat',
        modelo: 'Uno',
        anio: 2010,
        precio: 4500000,
        pagos: [
          { cuentaId: 'c1', monto: 3000000 },
          { cuentaId: 'c2', monto: 1500000 },
        ],
      });

      expect(mockDb.rpc).toHaveBeenCalledWith(
        'registrar_compra',
        expect.objectContaining({
          p_marca: 'Fiat',
          p_modelo: 'Uno',
          p_anio: 2010,
          p_precio: 4500000,
          p_pagos: [
            { cuenta_id: 'c1', monto: 3000000 },
            { cuenta_id: 'c2', monto: 1500000 },
          ],
        })
      );
      expect(res.success).toBe(true);
      expect(res.codigo).toBe('MC-007');
      expect(res.id).toBe('v9');
      expect(res.saldos).toEqual([
        { cuentaId: 'c1', nombre: 'Caja efectivo', saldo: -300000 },
        { cuentaId: 'c2', nombre: 'Banco Galicia', saldo: 0 },
      ]);
    });

    it('si la RPC falla, devuelve error y no devuelve código', async () => {
      mockDb.rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } });

      const service = new VehiculosService(mockDb);
      const res = await service.registrarCompra({
        marca: 'Fiat',
        modelo: 'Uno',
        anio: 2010,
        precio: 5000000,
        pagos: [{ cuentaId: 'c1', monto: 5000000 }],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/failed to fetch/i);
      expect(res.codigo).toBeUndefined();
    });

    it('con foto, la sube después de registrar la compra', async () => {
      const rpc = vi.fn().mockResolvedValue({
        data: { id: 'v10', codigo: 'MC-010', fecha: '2026-11-14', saldos: [] },
        error: null,
      });
      mockDb.rpc = rpc;
      const updateEq = vi.fn().mockResolvedValue({ error: null });
      mockDb.from = vi.fn().mockReturnValue({ update: vi.fn().mockReturnValue({ eq: updateEq }) });

      const upload = vi.fn().mockResolvedValue({ error: null });
      const createSignedUrls = vi.fn().mockResolvedValue({
        data: [{ path: 'v10/x.jpg', signedUrl: 'https://storage.test/v10' }],
        error: null,
      });
      const storage = { from: vi.fn().mockReturnValue({ upload, createSignedUrls }) };

      const service = new VehiculosService(mockDb, storage);
      const res = await service.registrarCompra({
        marca: 'Fiat',
        modelo: 'Uno',
        anio: 2010,
        precio: 5000000,
        pagos: [{ cuentaId: 'c1', monto: 5000000 }],
        foto: new Blob(['jpeg'], { type: 'image/jpeg' }),
      });

      expect(res.success).toBe(true);
      expect(upload).toHaveBeenCalledTimes(1);
      expect(upload.mock.calls[0][0]).toMatch(/^v10\/.+\.jpg$/);
      expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(upload.mock.invocationCallOrder[0]);
    });

    it('si la foto falla después de la compra, la compra queda guardada con aviso', async () => {
      mockDb.rpc = vi.fn().mockResolvedValue({
        data: { id: 'v11', codigo: 'MC-011', fecha: '2026-11-14', saldos: [] },
        error: null,
      });
      const storage = {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ error: { message: 'Network error' } }),
          createSignedUrls: vi.fn(),
        }),
      };

      const service = new VehiculosService(mockDb, storage);
      const res = await service.registrarCompra({
        marca: 'Fiat',
        modelo: 'Uno',
        anio: 2010,
        precio: 5000000,
        pagos: [{ cuentaId: 'c1', monto: 5000000 }],
        foto: new Blob(['jpeg'], { type: 'image/jpeg' }),
      });

      expect(res.success).toBe(true);
      expect(res.codigo).toBe('MC-011');
      expect(res.avisoFoto).toMatch(/no se pudo subir la foto/i);
    });
  });

  describe('registrarVenta', () => {
    it('no registra si no hay vehículo elegido y no llama a la RPC', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarVenta({
        vehiculoId: '',
        precio: 6000000,
        cobros: [{ cuentaId: 'c1', monto: 6000000 }],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/elegí un vehículo/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('no registra si el precio no es mayor que 0 y no llama a la RPC', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarVenta({
        vehiculoId: 'v1',
        precio: 0,
        cobros: [{ cuentaId: 'c1', monto: 1 }],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/precio.*mayor que 0/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('no registra si algún cobro es 0 o negativo y no llama a la RPC', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarVenta({
        vehiculoId: 'v1',
        precio: 6000000,
        cobros: [
          { cuentaId: 'c1', monto: 6000000 },
          { cuentaId: 'c2', monto: 0 },
        ],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/cada cobro.*mayor que 0/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('no registra si una cuenta aparece repetida en los cobros y no llama a la RPC', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarVenta({
        vehiculoId: 'v1',
        precio: 6000000,
        cobros: [
          { cuentaId: 'c1', monto: 4000000 },
          { cuentaId: 'c1', monto: 2000000 },
        ],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/repetir una cuenta/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('no registra si los cobros no suman el precio, e indica cuánto falta o sobra', async () => {
      const service = new VehiculosService(mockDb);
      const faltan = await service.registrarVenta({
        vehiculoId: 'v1',
        precio: 6000000,
        cobros: [
          { cuentaId: 'c1', monto: 4000000 },
          { cuentaId: 'c2', monto: 1500000 },
        ],
      });
      const sobran = await service.registrarVenta({
        vehiculoId: 'v1',
        precio: 6000000,
        cobros: [{ cuentaId: 'c1', monto: 6500000 }],
      });

      expect(faltan.error).toMatch(/faltan \$ 500\.000/i);
      expect(sobran.error).toMatch(/sobran \$ 500\.000/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('con datos válidos llama a registrar_venta y devuelve id, código y ganancia', async () => {
      mockDb.rpc = vi.fn().mockResolvedValue({
        data: { venta_id: 'ven1', codigo: 'MC-007', fecha: '2026-11-14', ganancia: 1500000 },
        error: null,
      });

      const service = new VehiculosService(mockDb);
      const res = await service.registrarVenta({
        vehiculoId: 'v7',
        precio: 6000000,
        comprador: 'Pedro',
        cobros: [
          { cuentaId: 'c1', monto: 4000000 },
          { cuentaId: 'c2', monto: 2000000 },
        ],
      });

      expect(mockDb.rpc).toHaveBeenCalledWith(
        'registrar_venta',
        expect.objectContaining({
          p_vehiculo_id: 'v7',
          p_precio: 6000000,
          p_comprador: 'Pedro',
          p_cobros: [
            { cuenta_id: 'c1', monto: 4000000 },
            { cuenta_id: 'c2', monto: 2000000 },
          ],
        })
      );
      expect(res.success).toBe(true);
      expect(res.ventaId).toBe('ven1');
      expect(res.codigo).toBe('MC-007');
      expect(res.ganancia).toBe(1500000);
    });

    it('si la RPC dice que el vehículo ya está vendido, avisa claro y no devuelve código', async () => {
      mockDb.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'MC-007 ya está vendido' },
      });

      const service = new VehiculosService(mockDb);
      const res = await service.registrarVenta({
        vehiculoId: 'v7',
        precio: 6000000,
        cobros: [{ cuentaId: 'c1', monto: 6000000 }],
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('MC-007 ya está vendido. No se guardó nada.');
      expect(res.codigo).toBeUndefined();
    });

    it('si falla la red al registrar la venta, devuelve error sin lanzar y avisa que no se guardó nada', async () => {
      mockDb.rpc = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

      const service = new VehiculosService(mockDb);
      const res = await service.registrarVenta({
        vehiculoId: 'v7',
        precio: 6000000,
        cobros: [{ cuentaId: 'c1', monto: 6000000 }],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/no se pudo confirmar si se guardó/i);
      expect(res.codigo).toBeUndefined();
    });
  });

  describe('listarMovimientos', () => {
    it('trae de a 50, del más nuevo al más viejo, con quién lo cargó y la cuenta', async () => {
      const consulta = (resultado: unknown) => {
        const b: Record<string, unknown> = {
          eq: vi.fn(() => b),
          order: vi.fn(() => b),
          range: vi.fn(() => b),
          then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
            Promise.resolve(resultado).then(ok, ko),
        };
        return b;
      };
      const filas = [
        {
          id: 'm1', fecha: '2026-11-14', tipo: 'ingreso_otro', monto: 80000, descripcion: 'Comisión',
          anulado: false, motivo_anulacion: null, gasto_id: null, venta_id: null,
          cuenta: { nombre: 'Banco' }, vehiculo: null, categoria: { nombre: 'Comisión' },
          creador: { nombre: 'Lautaro' }, anulador: null,
        },
      ];
      const select = vi.fn().mockReturnValue(consulta({ data: filas, error: null }));
      mockDb.from = vi.fn().mockReturnValue({ select });

      const service = new VehiculosService(mockDb);
      const lista = await service.listarMovimientos(0);

      expect(mockDb.from).toHaveBeenCalledWith('movimientos');
      expect(lista).toEqual([
        expect.objectContaining({
          id: 'm1', tipo: 'ingreso_otro', monto: 80000, cuentaNombre: 'Banco',
          creadoPor: 'Lautaro', anulado: false, anuladoPor: null,
        }),
      ]);
    });

    it('trae la fecha de anulación de los movimientos anulados', async () => {
      const consulta = (resultado: unknown) => {
        const b: Record<string, unknown> = {
          eq: vi.fn(() => b),
          order: vi.fn(() => b),
          range: vi.fn(() => b),
          then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
            Promise.resolve(resultado).then(ok, ko),
        };
        return b;
      };
      const filas = [
        {
          id: 'm8', fecha: '2026-11-14', tipo: 'ingreso_otro', monto: 80000, descripcion: 'Comisión',
          anulado: true, motivo_anulacion: 'cargué mal', anulado_at: '2026-11-14T15:30:00+00:00',
          gasto_id: null, venta_id: null,
          cuenta: { nombre: 'Banco' }, vehiculo: null, categoria: { nombre: 'Comisión' },
          creador: { nombre: 'Lautaro' }, anulador: { nombre: 'Antonio' },
        },
      ];
      mockDb.from = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(consulta({ data: filas, error: null })) });

      const service = new VehiculosService(mockDb);
      const [mov] = await service.listarMovimientos(0);

      expect(mov.anuladoEl).toBe('2026-11-14T15:30:00+00:00');
    });
  });

  describe('vistaPreviaAnulacionVehiculo', () => {
    it('lista los pagos de la compra por cuenta y la cantidad y total de gastos vigentes', async () => {
      const consulta = (resultado: unknown) => {
        const b: Record<string, unknown> = {
          eq: vi.fn(() => b),
          then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
            Promise.resolve(resultado).then(ok, ko),
        };
        return b;
      };
      mockDb.from = vi.fn().mockImplementation((tabla: string) => {
        if (tabla === 'movimientos') {
          return {
            select: vi.fn().mockReturnValue(
              consulta({
                data: [
                  { monto: -3000000, cuenta: { nombre: 'Caja efectivo' } },
                  { monto: -1500000, cuenta: { nombre: 'Banco' } },
                ],
                error: null,
              })
            ),
          };
        }
        const asignacionesMock = consulta({
          data: [
            { monto: 250000, gasto: { anulado: false } },
            { monto: 80000, gasto: { anulado: false } },
            { monto: 50000, gasto: { anulado: true } },
          ],
          error: null,
        }) as Record<string, unknown>;
        // Las asignaciones de los mismos gastos (para saber si son compartidos): acá no hay ninguna
        asignacionesMock.in = vi.fn(() => Promise.resolve({ data: [], error: null }));
        return { select: vi.fn().mockReturnValue(asignacionesMock) };
      });

      const service = new VehiculosService(mockDb);
      const vista = await service.vistaPreviaAnulacionVehiculo('v1');

      expect(vista.pagosCompra).toEqual([
        { cuentaNombre: 'Caja efectivo', monto: 3000000 },
        { cuentaNombre: 'Banco', monto: 1500000 },
      ]);
      expect(vista.gastosCantidad).toBe(2);
      expect(vista.gastosTotal).toBe(330000);
    });
  });

  describe('anularVehiculo', () => {
    it('no anula sin motivo, ni un vehículo vendido, y no llama a la RPC', async () => {
      const service = new VehiculosService(mockDb);
      const sinMotivo = await service.anularVehiculo({ vehiculoId: 'v1', estado: 'en_stock', motivo: ' ' });
      const vendido = await service.anularVehiculo({ vehiculoId: 'v1', estado: 'vendido', motivo: 'x' });

      expect(sinMotivo.error).toMatch(/motivo.*obligatorio/i);
      expect(vendido.error).toMatch(/primero anulá la venta/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('anula con la RPC anular_vehiculo y devuelve los gastos anulados en cascada', async () => {
      mockDb.rpc = vi.fn().mockResolvedValue({
        data: { vehiculo_id: 'v1', codigo: 'MC-007', gastos_anulados: 2, total_gastos: 330000 },
        error: null,
      });

      const service = new VehiculosService(mockDb);
      const res = await service.anularVehiculo({ vehiculoId: 'v1', estado: 'en_stock', motivo: 'compra mal cargada' });

      expect(mockDb.rpc).toHaveBeenCalledWith('anular_vehiculo', { p_vehiculo_id: 'v1', p_motivo: 'compra mal cargada' });
      expect(res.success).toBe(true);
      expect(res.gastosAnulados).toBe(2);
      expect(res.totalGastos).toBe(330000);
    });
  });

  describe('listarVehiculos sin anulados', () => {
    it('no trae los vehículos anulados', async () => {
      const order = vi.fn().mockResolvedValue({
        data: [
          { id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, estado: 'en_stock', foto_url: null, fecha_ingreso: '2026-11-13', anulado: false },
          { id: 'v2', codigo: 'MC-002', marca: 'Ford', modelo: 'Ka', anio: 2012, color: null, estado: 'en_stock', foto_url: null, fecha_ingreso: '2026-11-13', anulado: true },
        ],
        error: null,
      });
      mockDb.from = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ order }) });

      const service = new VehiculosService(mockDb);
      const lista = await service.listarVehiculos();

      expect(lista.map((v) => v.codigo)).toEqual(['MC-001']);
    });
  });

  describe('anularVenta', () => {
    it('sin motivo no anula y no llama a la RPC; con motivo llama a anular_venta', async () => {
      const service = new VehiculosService(mockDb);
      const sinMotivo = await service.anularVenta({ ventaId: 'ven1', motivo: '' });

      expect(sinMotivo.error).toMatch(/motivo.*obligatorio/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();

      mockDb.rpc = vi.fn().mockResolvedValue({ data: { venta_id: 'ven1', codigo: 'MC-007' }, error: null });
      const res = await service.anularVenta({ ventaId: 'ven1', motivo: 'precio mal cargado' });

      expect(mockDb.rpc).toHaveBeenCalledWith('anular_venta', { p_venta_id: 'ven1', p_motivo: 'precio mal cargado' });
      expect(res.success).toBe(true);
    });
  });

  describe('anularMovimiento', () => {
    it('no anula si el motivo está vacío y no llama a la RPC', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.anularMovimiento({ movimientoId: 'm1', gastoId: null, motivo: '   ' });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/motivo.*obligatorio/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('anular un gasto llama a anular_gasto con su id y el motivo', async () => {
      mockDb.rpc = vi.fn().mockResolvedValue({ data: { gasto_id: 'g1', anulado: true }, error: null });

      const service = new VehiculosService(mockDb);
      const res = await service.anularMovimiento({ movimientoId: 'm1', gastoId: 'g1', motivo: 'cargué mal el monto' });

      expect(mockDb.rpc).toHaveBeenCalledWith('anular_gasto', { p_gasto_id: 'g1', p_motivo: 'cargué mal el monto' });
      expect(res.success).toBe(true);
    });

    it('anular un saldo inicial o un ingreso llama a anular_movimiento con su id y el motivo', async () => {
      mockDb.rpc = vi.fn().mockResolvedValue({ data: { movimiento_id: 'm2', anulado: true }, error: null });

      const service = new VehiculosService(mockDb);
      const res = await service.anularMovimiento({ movimientoId: 'm2', gastoId: null, motivo: 'monto equivocado' });

      expect(mockDb.rpc).toHaveBeenCalledWith('anular_movimiento', { p_movimiento_id: 'm2', p_motivo: 'monto equivocado' });
      expect(res.success).toBe(true);
    });

    it('no anula una compra, un cobro de venta ni un movimiento ya anulado, y no llama a la RPC', async () => {
      const service = new VehiculosService(mockDb);
      const compra = await service.anularMovimiento({ movimientoId: 'm3', gastoId: null, motivo: 'x', tipo: 'compra' });
      const cobro = await service.anularMovimiento({ movimientoId: 'm4', gastoId: null, motivo: 'x', tipo: 'venta_cobro' });
      const yaAnulado = await service.anularMovimiento({ movimientoId: 'm5', gastoId: null, motivo: 'x', tipo: 'ingreso_otro', anulado: true });

      expect(compra.error).toMatch(/parte de una compra o venta/i);
      expect(cobro.error).toMatch(/parte de una compra o venta/i);
      expect(yaAnulado.error).toMatch(/ya está anulado/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('si falla la red al anular, devuelve error sin lanzar y no afirma que se anuló', async () => {
      mockDb.rpc = vi.fn().mockRejectedValue(new Error('Network down'));

      const service = new VehiculosService(mockDb);
      const res = await service.anularMovimiento({ movimientoId: 'm6', gastoId: null, motivo: 'x', tipo: 'saldo_inicial' });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/sin conexión/i);
    });
  });

  describe('registrarIngreso', () => {
    it('no registra si el monto no es mayor que 0 y no llama a la RPC', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarIngreso({ monto: 0, categoriaId: 'cat9', cuentaId: 'c1' });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/monto.*mayor que 0/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('no registra si falta la categoría o la cuenta y no llama a la RPC', async () => {
      const service = new VehiculosService(mockDb);
      const sinCategoria = await service.registrarIngreso({ monto: 80000, categoriaId: '', cuentaId: 'c1' });
      const sinCuenta = await service.registrarIngreso({ monto: 80000, categoriaId: 'cat9', cuentaId: '' });

      expect(sinCategoria.error).toMatch(/elegí una categoría/i);
      expect(sinCuenta.error).toMatch(/elegí una cuenta/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('con datos válidos llama a registrar_ingreso y devuelve el saldo de la cuenta', async () => {
      mockDb.rpc = vi.fn().mockResolvedValue({
        data: { movimiento_id: 'm1', fecha: '2026-11-14', saldo_cuenta: 1080000 },
        error: null,
      });

      const service = new VehiculosService(mockDb);
      const res = await service.registrarIngreso({
        monto: 80000,
        categoriaId: 'cat9',
        cuentaId: 'c1',
        descripcion: 'Comisión por intermediación',
      });

      expect(mockDb.rpc).toHaveBeenCalledWith(
        'registrar_ingreso',
        expect.objectContaining({
          p_monto: 80000,
          p_categoria_id: 'cat9',
          p_cuenta_id: 'c1',
          p_descripcion: 'Comisión por intermediación',
        })
      );
      expect(res.success).toBe(true);
      expect(res.saldoCuenta).toBe(1080000);
    });
  });

  describe('registrarGasto', () => {
    it('no registra si el monto no es mayor que 0 y no llama a la RPC', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarGasto({
        monto: 0,
        categoriaId: 'cat1',
        cuentaId: 'c1',
        vehiculoId: null,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/monto.*mayor que 0/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('no registra si falta la categoría y no llama a la RPC', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarGasto({
        monto: 250000,
        categoriaId: '',
        cuentaId: 'c1',
        vehiculoId: null,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/elegí una categoría/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('no registra si falta la cuenta y no llama a la RPC', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarGasto({
        monto: 250000,
        categoriaId: 'cat1',
        cuentaId: '',
        vehiculoId: null,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/elegí una cuenta/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('no registra si no se eligió General ni un vehículo y no llama a la RPC', async () => {
      const service = new VehiculosService(mockDb);
      const res = await service.registrarGasto({
        monto: 250000,
        categoriaId: 'cat1',
        cuentaId: 'c1',
        vehiculoId: undefined as unknown as null,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/general o de un vehículo/i);
      expect(mockDb.rpc).not.toHaveBeenCalled();
    });

    it('con datos válidos llama a registrar_gasto y devuelve id, código del vehículo y saldo de la cuenta', async () => {
      mockDb.rpc = vi.fn().mockResolvedValue({
        data: { gasto_id: 'g1', fecha: '2026-11-14', vehiculo_codigo: 'MC-010', saldo_cuenta: 750000 },
        error: null,
      });

      const service = new VehiculosService(mockDb);
      const res = await service.registrarGasto({
        monto: 250000,
        categoriaId: 'cat1',
        cuentaId: 'c1',
        descripcion: 'Pintura puerta',
        vehiculoId: 'v10',
      });

      expect(mockDb.rpc).toHaveBeenCalledWith(
        'registrar_gasto',
        expect.objectContaining({
          p_monto: 250000,
          p_categoria_id: 'cat1',
          p_cuenta_id: 'c1',
          p_descripcion: 'Pintura puerta',
          p_vehiculo_id: 'v10',
        })
      );
      expect(res.success).toBe(true);
      expect(res.gastoId).toBe('g1');
      expect(res.vehiculoCodigo).toBe('MC-010');
      expect(res.saldoCuenta).toBe(750000);
    });

    it('si la RPC falla, avisa que no se guardó nada y no devuelve gasto', async () => {
      mockDb.rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } });

      const service = new VehiculosService(mockDb);
      const res = await service.registrarGasto({
        monto: 250000,
        categoriaId: 'cat1',
        cuentaId: 'c1',
        vehiculoId: null,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/failed to fetch.*no se guardó nada/i);
      expect(res.gastoId).toBeUndefined();
    });

    it('si falla la red al registrar el gasto, devuelve error sin lanzar', async () => {
      mockDb.rpc = vi.fn().mockRejectedValue(new Error('Network down'));

      const service = new VehiculosService(mockDb);
      const res = await service.registrarGasto({
        monto: 250000,
        categoriaId: 'cat1',
        cuentaId: 'c1',
        vehiculoId: null,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/sin conexión/i);
    });

    it('lista las categorías de gasto activas, ordenadas por nombre', async () => {
      const consulta = (resultado: unknown) => {
        const b: Record<string, unknown> = {
          eq: vi.fn(() => b),
          order: vi.fn(() => b),
          then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
            Promise.resolve(resultado).then(ok, ko),
        };
        return b;
      };
      const filas = [{ id: 'cat1', nombre: 'Mecánica' }, { id: 'cat2', nombre: 'Repuestos' }];
      const select = vi.fn().mockReturnValue(consulta({ data: filas, error: null }));
      mockDb.from = vi.fn().mockReturnValue({ select });

      const service = new VehiculosService(mockDb);
      const categorias = await service.listarCategorias('gasto');

      expect(mockDb.from).toHaveBeenCalledWith('categorias');
      expect(categorias).toEqual([
        { id: 'cat1', nombre: 'Mecánica' },
        { id: 'cat2', nombre: 'Repuestos' },
      ]);
    });

    it('el gasto usa el mismo cálculo de saldo negativo que la compra', () => {
      const negativas = cuentasQueQuedaranNegativas(
        [{ cuentaId: 'c1', monto: 250000 }],
        [{ cuentaId: 'c1', nombre: 'Caja efectivo', saldo: 100000 }]
      );

      expect(negativas).toEqual([{ cuentaId: 'c1', nombre: 'Caja efectivo', saldoResultante: -150000 }]);
    });
  });

  describe('cuentasQueQuedaranNegativas', () => {
    it('devuelve solo las cuentas que quedarían con saldo negativo, con el saldo resultante', () => {
      const resultado = cuentasQueQuedaranNegativas(
        [
          { cuentaId: 'c1', monto: 1500000 },
          { cuentaId: 'c2', monto: 1000000 },
        ],
        [
          { cuentaId: 'c1', nombre: 'Caja efectivo', saldo: 1000000 },
          { cuentaId: 'c2', nombre: 'Banco Galicia', saldo: 2000000 },
        ]
      );

      expect(resultado).toEqual([{ cuentaId: 'c1', nombre: 'Caja efectivo', saldoResultante: -500000 }]);
    });
  });

  describe('agregarFoto', () => {
    it('sube la foto del vehículo, guarda la ruta y devuelve la URL firmada', async () => {
      const updateEq = vi.fn().mockResolvedValue({ error: null });
      const update = vi.fn().mockReturnValue({ eq: updateEq });
      mockDb.from = vi.fn().mockReturnValue({ update });

      const upload = vi.fn().mockResolvedValue({ error: null });
      const createSignedUrls = vi.fn().mockResolvedValue({
        data: [{ path: 'v7/x.jpg', signedUrl: 'https://storage.test/v7' }],
        error: null,
      });
      const storage = { from: vi.fn().mockReturnValue({ upload, createSignedUrls }) };

      const service = new VehiculosService(mockDb, storage);
      const foto = new Blob(['jpeg'], { type: 'image/jpeg' });
      const res = await service.agregarFoto('v7', foto);

      expect(res.success).toBe(true);
      const [pathSubido] = upload.mock.calls[0];
      expect(pathSubido).toMatch(/^v7\/.+\.jpg$/);
      expect(update).toHaveBeenCalledWith({ foto_url: pathSubido });
      expect(updateEq).toHaveBeenCalledWith('id', 'v7');
      expect(res.fotoUrl).toBe('https://storage.test/v7');
    });

    it('si la subida falla, devuelve error para reintentar y no toca la fila', async () => {
      const update = vi.fn();
      mockDb.from = vi.fn().mockReturnValue({ update });

      const upload = vi.fn().mockResolvedValue({ error: { message: 'Network error' } });
      const storage = { from: vi.fn().mockReturnValue({ upload, createSignedUrls: vi.fn() }) };

      const service = new VehiculosService(mockDb, storage);
      const res = await service.agregarFoto('v8', new Blob(['jpeg'], { type: 'image/jpeg' }));

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/no se pudo subir la foto.*intentar de nuevo/i);
      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('obtenerDetalle', () => {
    it('si el vehículo no existe, devuelve error', async () => {
      const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const eq = vi.fn().mockReturnValue({ maybeSingle });
      const select = vi.fn().mockReturnValue({ eq });
      mockDb.from = vi.fn().mockReturnValue({ select });

      const service = new VehiculosService(mockDb);
      const res = await service.obtenerDetalle('no-existe');

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/no se encontró el vehículo/i);
    });

    it('devuelve los datos del vehículo y su costo real de v_costo_vehiculo', async () => {
      const filaVehiculo = {
        id: 'v1',
        codigo: 'MC-001',
        marca: 'Fiat',
        modelo: 'Uno',
        anio: 2010,
        color: 'Rojo',
        patente: 'AB123CD',
        estado: 'en_stock',
        origen: 'compra',
        fecha_ingreso: '2026-11-13',
        vendedor_texto: 'Juan Pérez',
        valor_ingreso: 3000000,
      };
      const filaCosto = { vehiculo_id: 'v1', valor_ingreso: 3000000, gastos_asignados: 0, costo_real: 3000000 };
      // Consulta encadenable, igual que en el test de pagos
      const consulta = (resultado: unknown) => {
        const b: Record<string, unknown> = {
          eq: vi.fn(() => b),
          maybeSingle: vi.fn().mockResolvedValue(resultado),
          then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
            Promise.resolve(resultado).then(ok, ko),
        };
        return b;
      };
      mockDb.from = vi.fn().mockImplementation((tabla: string) => {
        if (tabla === 'movimientos') {
          return { select: vi.fn().mockReturnValue(consulta({ data: [], error: null })) };
        }
        const fila = tabla === 'v_costo_vehiculo' ? filaCosto : filaVehiculo;
        return { select: vi.fn().mockReturnValue(consulta({ data: fila, error: null })) };
      });

      const service = new VehiculosService(mockDb);
      const res = await service.obtenerDetalle('v1');

      expect(res.success).toBe(true);
      expect(res.detalle).toEqual(
        expect.objectContaining({
          codigo: 'MC-001',
          marca: 'Fiat',
          patente: 'AB123CD',
          origen: 'compra',
          fechaIngreso: '2026-11-13',
          vendedor: 'Juan Pérez',
          valorIngreso: 3000000,
          gastosAsignados: 0,
          costoReal: 3000000,
        })
      );
    });

    it('un vehículo anulado trae quién lo anuló, cuándo y el motivo', async () => {
      const filaVehiculo = {
        id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, patente: null,
        estado: 'en_stock', origen: 'compra', fecha_ingreso: '2026-11-13', vendedor_texto: null, valor_ingreso: 3000000,
        anulado: true, anulado_at: '2026-11-14T15:30:00+00:00', motivo_anulacion: 'compra mal cargada',
        anulador: { nombre: 'Antonio' },
      };
      const consulta = (resultado: unknown) => {
        const b: Record<string, unknown> = {
          eq: vi.fn(() => b),
          maybeSingle: vi.fn().mockResolvedValue(resultado),
          then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
            Promise.resolve(resultado).then(ok, ko),
        };
        return b;
      };
      mockDb.from = vi.fn().mockImplementation((tabla: string) => {
        if (tabla === 'movimientos') {
          return { select: vi.fn().mockReturnValue(consulta({ data: [], error: null })) };
        }
        const fila = tabla === 'v_costo_vehiculo' ? { vehiculo_id: 'v1', valor_ingreso: 3000000, gastos_asignados: 0, costo_real: 3000000 } : filaVehiculo;
        return { select: vi.fn().mockReturnValue(consulta({ data: fila, error: null })) };
      });

      const service = new VehiculosService(mockDb);
      const res = await service.obtenerDetalle('v1');

      expect(res.detalle?.anulado).toEqual({
        por: 'Antonio',
        motivo: 'compra mal cargada',
        el: '2026-11-14T15:30:00+00:00',
      });
    });

    it('un vehículo sin anular no trae datos de anulación', async () => {
      const filaVehiculo = {
        id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, patente: null,
        estado: 'en_stock', origen: 'compra', fecha_ingreso: '2026-11-13', vendedor_texto: null, valor_ingreso: 3000000,
        anulado: false, anulado_at: null, motivo_anulacion: null, anulador: null,
      };
      const consulta = (resultado: unknown) => {
        const b: Record<string, unknown> = {
          eq: vi.fn(() => b),
          maybeSingle: vi.fn().mockResolvedValue(resultado),
          then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
            Promise.resolve(resultado).then(ok, ko),
        };
        return b;
      };
      mockDb.from = vi.fn().mockImplementation((tabla: string) => {
        if (tabla === 'movimientos') {
          return { select: vi.fn().mockReturnValue(consulta({ data: [], error: null })) };
        }
        const fila = tabla === 'v_costo_vehiculo' ? { vehiculo_id: 'v1', valor_ingreso: 3000000, gastos_asignados: 0, costo_real: 3000000 } : filaVehiculo;
        return { select: vi.fn().mockReturnValue(consulta({ data: fila, error: null })) };
      });

      const service = new VehiculosService(mockDb);
      const res = await service.obtenerDetalle('v1');

      expect(res.detalle?.anulado).toBeNull();
    });

    it('una venta anulada no aparece como venta vigente en el detalle', async () => {
      const filaVehiculo = {
        id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, patente: null,
        estado: 'vendido', origen: 'compra', fecha_ingreso: '2026-11-13', vendedor_texto: null, valor_ingreso: 3000000,
        anulado: false, anulado_at: null, motivo_anulacion: null, anulador: null,
      };
      // Fake de la tabla ventas: solo devuelve la venta si la consulta pide las no anuladas
      const ventaAnulada = { id: 'ven1', comprador_texto: 'Pedro', fecha: '2026-11-14', precio_total: 6000000, anulada: true };
      const consultaVentas = (filtros: Array<[string, unknown]>) => {
        const b: Record<string, unknown> = {
          eq: vi.fn((col: string, val: unknown) => {
            filtros.push([col, val]);
            return b;
          }),
          maybeSingle: vi.fn(() => {
            const pideVigentes = filtros.some(([c, v]) => c === 'anulada' && v === false);
            const fila = pideVigentes && ventaAnulada.anulada ? null : ventaAnulada;
            return Promise.resolve({ data: fila, error: null });
          }),
        };
        return b;
      };
      const consulta = (resultado: unknown) => {
        const b: Record<string, unknown> = {
          eq: vi.fn(() => b),
          maybeSingle: vi.fn().mockResolvedValue(resultado),
          then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
            Promise.resolve(resultado).then(ok, ko),
        };
        return b;
      };
      mockDb.from = vi.fn().mockImplementation((tabla: string) => {
        if (tabla === 'movimientos') {
          return { select: vi.fn().mockReturnValue(consulta({ data: [], error: null })) };
        }
        if (tabla === 'ventas') {
          const filtros: Array<[string, unknown]> = [];
          return { select: vi.fn().mockReturnValue(consultaVentas(filtros)) };
        }
        const fila = tabla === 'v_costo_vehiculo'
          ? { vehiculo_id: 'v1', valor_ingreso: 3000000, gastos_asignados: 0, costo_real: 3000000 }
          : filaVehiculo;
        return { select: vi.fn().mockReturnValue(consulta({ data: fila, error: null })) };
      });

      const service = new VehiculosService(mockDb);
      const res = await service.obtenerDetalle('v1');

      expect(res.success).toBe(true);
      expect(res.detalle?.venta).toBeNull();
    });
  });

  describe('obtenerDetalle: pagos', () => {
    it('lista los pagos de la compra con el nombre de cada cuenta y el monto en positivo', async () => {
      // Consulta encadenable: cada eq() devuelve la misma consulta, y al await resuelve el resultado
      const consulta = (resultado: unknown) => {
        const b: Record<string, unknown> = {
          eq: vi.fn(() => b),
          maybeSingle: vi.fn().mockResolvedValue(resultado),
          then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
            Promise.resolve(resultado).then(ok, ko),
        };
        return b;
      };
      const filaVehiculo = {
        id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, patente: null,
        estado: 'en_stock', origen: 'compra', fecha_ingreso: '2026-11-13', vendedor_texto: null, valor_ingreso: 4500000,
      };
      const filaCosto = { vehiculo_id: 'v1', valor_ingreso: 4500000, gastos_asignados: 0, costo_real: 4500000 };
      const movimientos = [
        { monto: -3000000, cuenta: { nombre: 'Caja efectivo' } },
        { monto: -1500000, cuenta: { nombre: 'Banco Galicia' } },
      ];

      mockDb.from = vi.fn().mockImplementation((tabla: string) => {
        if (tabla === 'movimientos') {
          return { select: vi.fn().mockReturnValue(consulta({ data: movimientos, error: null })) };
        }
        const fila = tabla === 'v_costo_vehiculo' ? filaCosto : filaVehiculo;
        return { select: vi.fn().mockReturnValue(consulta({ data: fila, error: null })) };
      });

      const service = new VehiculosService(mockDb);
      const res = await service.obtenerDetalle('v1');

      expect(res.detalle?.pagos).toEqual([
        { cuentaNombre: 'Caja efectivo', monto: 3000000 },
        { cuentaNombre: 'Banco Galicia', monto: 1500000 },
      ]);
    });

    it('un vehículo de stock existente no tiene pagos', async () => {
      const consulta = (resultado: unknown) => {
        const b: Record<string, unknown> = {
          eq: vi.fn(() => b),
          maybeSingle: vi.fn().mockResolvedValue(resultado),
          then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
            Promise.resolve(resultado).then(ok, ko),
        };
        return b;
      };
      const filaVehiculo = {
        id: 'v2', codigo: 'MC-002', marca: 'Ford', modelo: 'Ka', anio: 2012, color: null, patente: null,
        estado: 'en_stock', origen: 'inventario_inicial', fecha_ingreso: '2026-11-13', vendedor_texto: null, valor_ingreso: 0,
      };
      mockDb.from = vi.fn().mockImplementation((tabla: string) => {
        if (tabla === 'movimientos') {
          return { select: vi.fn().mockReturnValue(consulta({ data: [], error: null })) };
        }
        const fila = tabla === 'v_costo_vehiculo'
          ? { vehiculo_id: 'v2', valor_ingreso: 0, gastos_asignados: 0, costo_real: 0 }
          : filaVehiculo;
        return { select: vi.fn().mockReturnValue(consulta({ data: fila, error: null })) };
      });

      const service = new VehiculosService(mockDb);
      const res = await service.obtenerDetalle('v2');

      expect(res.detalle?.pagos).toEqual([]);
      expect(res.detalle?.origen).toBe('inventario_inicial');
    });

    it('si falla la consulta de pagos, devuelve error y no un detalle con pagos vacíos', async () => {
      const consulta = (resultado: unknown) => {
        const b: Record<string, unknown> = {
          eq: vi.fn(() => b),
          maybeSingle: vi.fn().mockResolvedValue(resultado),
          then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
            Promise.resolve(resultado).then(ok, ko),
        };
        return b;
      };
      const filaVehiculo = {
        id: 'v3', codigo: 'MC-003', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, patente: null,
        estado: 'en_stock', origen: 'compra', fecha_ingreso: '2026-11-13', vendedor_texto: null, valor_ingreso: 3000000,
      };
      mockDb.from = vi.fn().mockImplementation((tabla: string) => {
        if (tabla === 'movimientos') {
          return { select: vi.fn().mockReturnValue(consulta({ data: null, error: { message: 'Failed to fetch' } })) };
        }
        const fila = tabla === 'v_costo_vehiculo'
          ? { vehiculo_id: 'v3', valor_ingreso: 3000000, gastos_asignados: 0, costo_real: 3000000 }
          : filaVehiculo;
        return { select: vi.fn().mockReturnValue(consulta({ data: fila, error: null })) };
      });

      const service = new VehiculosService(mockDb);
      const res = await service.obtenerDetalle('v3');

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/failed to fetch/i);
      expect(res.detalle).toBeUndefined();
    });

    it('si falla la consulta de costo, devuelve error y no un costo inventado', async () => {
      const consulta = (resultado: unknown) => {
        const b: Record<string, unknown> = {
          eq: vi.fn(() => b),
          maybeSingle: vi.fn().mockResolvedValue(resultado),
          then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
            Promise.resolve(resultado).then(ok, ko),
        };
        return b;
      };
      const filaVehiculo = {
        id: 'v4', codigo: 'MC-004', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, patente: null,
        estado: 'en_stock', origen: 'compra', fecha_ingreso: '2026-11-13', vendedor_texto: null, valor_ingreso: 3000000,
      };
      mockDb.from = vi.fn().mockImplementation((tabla: string) => {
        if (tabla === 'v_costo_vehiculo') {
          return { select: vi.fn().mockReturnValue(consulta({ data: null, error: { message: 'Failed to fetch' } })) };
        }
        if (tabla === 'movimientos') {
          return { select: vi.fn().mockReturnValue(consulta({ data: [], error: null })) };
        }
        return { select: vi.fn().mockReturnValue(consulta({ data: filaVehiculo, error: null })) };
      });

      const service = new VehiculosService(mockDb);
      const res = await service.obtenerDetalle('v4');

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/failed to fetch/i);
      expect(res.detalle).toBeUndefined();
    });
  });

  describe('obtenerDetalle: gastos', () => {
    it('trae los gastos asignados al vehículo con su categoría, sin los anulados', async () => {
      const consulta = (resultado: unknown) => {
        const b: Record<string, unknown> = {
          eq: vi.fn(() => b),
          maybeSingle: vi.fn().mockResolvedValue(resultado),
          then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
            Promise.resolve(resultado).then(ok, ko),
        };
        return b;
      };
      const filaVehiculo = {
        id: 'v8', codigo: 'MC-008', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, patente: null,
        estado: 'en_stock', origen: 'compra', fecha_ingreso: '2026-11-13', vendedor_texto: null, valor_ingreso: 3000000,
      };
      const asignaciones = [
        { monto: 250000, gasto: { fecha: '2026-11-14', descripcion: 'Pintura puerta', anulado: false, categoria: { nombre: 'Mecánica' } } },
        { monto: 100000, gasto: { fecha: '2026-11-10', descripcion: null, anulado: true, categoria: { nombre: 'Repuestos' } } },
      ];
      mockDb.from = vi.fn().mockImplementation((tabla: string) => {
        if (tabla === 'asignaciones_gasto') {
          return { select: vi.fn().mockReturnValue(consulta({ data: asignaciones, error: null })) };
        }
        if (tabla === 'movimientos') {
          return { select: vi.fn().mockReturnValue(consulta({ data: [], error: null })) };
        }
        if (tabla === 'v_costo_vehiculo') {
          return {
            select: vi.fn().mockReturnValue(
              consulta({ data: { vehiculo_id: 'v8', valor_ingreso: 3000000, gastos_asignados: 250000, costo_real: 3250000 }, error: null })
            ),
          };
        }
        return { select: vi.fn().mockReturnValue(consulta({ data: filaVehiculo, error: null })) };
      });

      const service = new VehiculosService(mockDb);
      const res = await service.obtenerDetalle('v8');

      expect(res.detalle?.gastos).toEqual([
        { fecha: '2026-11-14', categoria: 'Mecánica', descripcion: 'Pintura puerta', monto: 250000 },
      ]);
    });
  });

  describe('obtenerDetalle: venta', () => {
    it('un vehículo vendido trae su venta: fecha, comprador, precio, cobros y ganancia', async () => {
      const consulta = (resultado: unknown) => {
        const b: Record<string, unknown> = {
          eq: vi.fn(() => b),
          maybeSingle: vi.fn().mockResolvedValue(resultado),
          then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
            Promise.resolve(resultado).then(ok, ko),
        };
        return b;
      };
      const filaVehiculo = {
        id: 'v7', codigo: 'MC-007', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, patente: null,
        estado: 'vendido', origen: 'compra', fecha_ingreso: '2026-11-13', vendedor_texto: null, valor_ingreso: 4500000,
      };
      const cobros = [
        { monto: 4000000, cuenta: { nombre: 'Caja efectivo' } },
        { monto: 2000000, cuenta: { nombre: 'Banco Galicia' } },
      ];
      let llamadasMovimientos = 0;
      mockDb.from = vi.fn().mockImplementation((tabla: string) => {
        if (tabla === 'movimientos') {
          // 1ª consulta: pagos de la compra (ninguno aquí); 2ª: cobros de la venta
          llamadasMovimientos += 1;
          return { select: vi.fn().mockReturnValue(consulta({ data: llamadasMovimientos === 1 ? [] : cobros, error: null })) };
        }
        if (tabla === 'ventas') {
          return {
            select: vi.fn().mockReturnValue(
              consulta({
                data: { id: 'ven1', comprador_texto: 'Pedro', fecha: '2026-11-14', precio_total: 6000000 },
                error: null,
              })
            ),
          };
        }
        if (tabla === 'v_ganancia_venta') {
          return { select: vi.fn().mockReturnValue(consulta({ data: { ganancia: 1500000 }, error: null })) };
        }
        if (tabla === 'v_costo_vehiculo') {
          return {
            select: vi.fn().mockReturnValue(
              consulta({ data: { vehiculo_id: 'v7', valor_ingreso: 4500000, gastos_asignados: 0, costo_real: 4500000 }, error: null })
            ),
          };
        }
        return { select: vi.fn().mockReturnValue(consulta({ data: filaVehiculo, error: null })) };
      });

      const service = new VehiculosService(mockDb);
      const res = await service.obtenerDetalle('v7');

      expect(res.detalle?.venta).toEqual({
        ventaId: 'ven1',
        fecha: '2026-11-14',
        comprador: 'Pedro',
        precioVenta: 6000000,
        ganancia: 1500000,
        cobros: [
          { cuentaNombre: 'Caja efectivo', monto: 4000000 },
          { cuentaNombre: 'Banco Galicia', monto: 2000000 },
        ],
      });
    });
  });

  describe('obtenerInventario (errores)', () => {
    it('si la consulta falla, da error en lugar de mostrar inventario en cero', async () => {
      const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } });
      const select = vi.fn().mockReturnValue({ maybeSingle });
      mockDb.from = vi.fn().mockReturnValue({ select });

      const service = new VehiculosService(mockDb);

      await expect(service.obtenerInventario()).rejects.toThrow(/failed to fetch/i);
    });
  });

  describe('listarVehiculos', () => {
    it('devuelve una lista vacía si no hay vehículos cargados', async () => {
      const order = vi.fn().mockResolvedValue({ data: [], error: null });
      const select = vi.fn().mockReturnValue({ order });
      mockDb.from = vi.fn().mockReturnValue({ select });

      const service = new VehiculosService(mockDb);
      const lista = await service.listarVehiculos();

      expect(mockDb.from).toHaveBeenCalledWith('vehiculos');
      expect(lista).toEqual([]);
    });

    it('con fotos, pide las URLs firmadas en un solo pedido y se las asigna a cada vehículo', async () => {
      const filas = [
        { id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, estado: 'en_stock', foto_url: 'v1/a.jpg', fecha_ingreso: '2026-11-13' },
        { id: 'v2', codigo: 'MC-002', marca: 'Ford', modelo: 'Ka', anio: 2012, color: 'Rojo', estado: 'en_stock', foto_url: 'v2/b.jpg', fecha_ingreso: '2026-11-13' },
      ];
      const order = vi.fn().mockResolvedValue({ data: filas, error: null });
      const select = vi.fn().mockReturnValue({ order });
      mockDb.from = vi.fn().mockReturnValue({ select });

      const createSignedUrls = vi.fn().mockResolvedValue({
        data: [
          { path: 'v1/a.jpg', signedUrl: 'https://storage.test/a' },
          { path: 'v2/b.jpg', signedUrl: 'https://storage.test/b' },
        ],
        error: null,
      });
      const storage = { from: vi.fn().mockReturnValue({ upload: vi.fn(), createSignedUrls }) };

      const service = new VehiculosService(mockDb, storage);
      const lista = await service.listarVehiculos();

      expect(createSignedUrls).toHaveBeenCalledTimes(1);
      expect(createSignedUrls).toHaveBeenCalledWith(['v1/a.jpg', 'v2/b.jpg'], 3600);
      expect(lista[0]).toEqual(expect.objectContaining({ id: 'v1', fotoUrl: 'https://storage.test/a' }));
      expect(lista[1]).toEqual(expect.objectContaining({ id: 'v2', fotoUrl: 'https://storage.test/b' }));
    });

    it('un vehículo sin foto sale con fotoUrl null y no pide firma para él', async () => {
      const filas = [
        { id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, estado: 'en_stock', foto_url: 'v1/a.jpg', fecha_ingreso: '2026-11-13' },
        { id: 'v2', codigo: 'MC-002', marca: 'Ford', modelo: 'Ka', anio: 2012, color: null, estado: 'en_stock', foto_url: null, fecha_ingreso: '2026-11-13' },
      ];
      const order = vi.fn().mockResolvedValue({ data: filas, error: null });
      const select = vi.fn().mockReturnValue({ order });
      mockDb.from = vi.fn().mockReturnValue({ select });

      const createSignedUrls = vi.fn().mockResolvedValue({
        data: [{ path: 'v1/a.jpg', signedUrl: 'https://storage.test/a' }],
        error: null,
      });
      const storage = { from: vi.fn().mockReturnValue({ upload: vi.fn(), createSignedUrls }) };

      const service = new VehiculosService(mockDb, storage);
      const lista = await service.listarVehiculos();

      expect(createSignedUrls).toHaveBeenCalledWith(['v1/a.jpg'], 3600);
      expect(lista[1].fotoUrl).toBeNull();
    });

    it('si la consulta falla, da error en lugar de mostrar una lista vacía', async () => {
      const order = vi.fn().mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } });
      const select = vi.fn().mockReturnValue({ order });
      mockDb.from = vi.fn().mockReturnValue({ select });

      const service = new VehiculosService(mockDb);

      await expect(service.listarVehiculos()).rejects.toThrow(/failed to fetch/i);
    });

    it('mapea fecha_ingreso a fechaIngreso en cada vehículo', async () => {
      const filas = [
        { id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, estado: 'en_stock', foto_url: null, fecha_ingreso: '2026-11-13' },
      ];
      const order = vi.fn().mockResolvedValue({ data: filas, error: null });
      const select = vi.fn().mockReturnValue({ order });
      mockDb.from = vi.fn().mockReturnValue({ select });

      const service = new VehiculosService(mockDb);
      const lista = await service.listarVehiculos();

      expect(lista[0].fechaIngreso).toBe('2026-11-13');
    });

    it('pide el listado ordenado por fecha de carga, los más nuevos primero', async () => {
      const order = vi.fn().mockResolvedValue({ data: [], error: null });
      const select = vi.fn().mockReturnValue({ order });
      mockDb.from = vi.fn().mockReturnValue({ select });

      const service = new VehiculosService(mockDb);
      await service.listarVehiculos();

      expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('si ningún vehículo tiene foto, todos salen con fotoUrl null y no pide firmas', async () => {
      const filas = [
        { id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, estado: 'en_stock', foto_url: null, fecha_ingreso: '2026-11-13' },
      ];
      const order = vi.fn().mockResolvedValue({ data: filas, error: null });
      const select = vi.fn().mockReturnValue({ order });
      mockDb.from = vi.fn().mockReturnValue({ select });

      const createSignedUrls = vi.fn();
      const storage = { from: vi.fn().mockReturnValue({ upload: vi.fn(), createSignedUrls }) };

      const service = new VehiculosService(mockDb, storage);
      const lista = await service.listarVehiculos();

      expect(createSignedUrls).not.toHaveBeenCalled();
      expect(lista[0].fotoUrl).toBeNull();
    });
  });
});
