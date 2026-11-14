import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VehiculosService, type VehiculosDbClient } from './vehiculos-service';

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
