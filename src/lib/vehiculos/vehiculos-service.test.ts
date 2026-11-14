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
