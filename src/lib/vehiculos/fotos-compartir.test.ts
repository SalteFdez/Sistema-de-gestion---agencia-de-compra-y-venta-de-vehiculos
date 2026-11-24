import { describe, it, expect, vi } from 'vitest';
import { VehiculosService } from './vehiculos-service';

// Consulta encadenable que devuelve `data` al hacer await o maybeSingle
const consulta = (data: unknown) => {
  const c: Record<string, unknown> = {
    eq: () => c,
    order: () => c,
    maybeSingle: async () => ({ data: Array.isArray(data) ? data[0] ?? null : data, error: null }),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve),
  };
  return c;
};

const armar = (tablas: Record<string, unknown>) => {
  const createSignedUrls = vi.fn(async (rutas: string[]) => ({
    data: rutas.map((r) => ({ path: r, signedUrl: `https://storage.test/${r}` })),
    error: null,
  }));
  const db = {
    from: (tabla: string) => ({ select: () => consulta(tablas[tabla]) }),
    rpc: vi.fn(),
  };
  const storage = {
    from: () => ({ createSignedUrls, upload: vi.fn() }),
  };
  return { service: new VehiculosService(db as never, storage as never), createSignedUrls };
};

describe('VehiculosService.fotosParaCompartir', () => {
  it('devuelve las URLs firmadas de las fotos vigentes con la principal primero, en un solo pedido', async () => {
    const { service, createSignedUrls } = armar({
      vehiculos: { id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, foto_url: 'v1/b.jpg' },
      vehiculo_fotos: [
        { id: 'f1', ruta: 'v1/a.jpg', orden: 1, quitada: false },
        { id: 'f2', ruta: 'v1/b.jpg', orden: 2, quitada: false },
      ],
    });

    const res = await service.fotosParaCompartir('v1');

    expect(res.success).toBe(true);
    expect(res.codigo).toBe('MC-001');
    expect(res.marca).toBe('Fiat');
    expect(res.modelo).toBe('Uno');
    expect(res.urls).toEqual(['https://storage.test/v1/b.jpg', 'https://storage.test/v1/a.jpg']);
    expect(createSignedUrls).toHaveBeenCalledTimes(1);
    expect(createSignedUrls).toHaveBeenCalledWith(['v1/b.jpg', 'v1/a.jpg'], 3600);
  });

  it('un auto sin fotos devuelve una lista vacía y no pide URLs', async () => {
    const { service, createSignedUrls } = armar({
      vehiculos: { id: 'v2', codigo: 'MC-002', marca: 'Ford', modelo: 'Ka', anio: 2012, foto_url: null },
      vehiculo_fotos: [],
    });

    const res = await service.fotosParaCompartir('v2');

    expect(res.success).toBe(true);
    expect(res.urls).toEqual([]);
    expect(createSignedUrls).not.toHaveBeenCalled();
  });

  it('si el vehículo no existe, avisa sin fallar', async () => {
    const { service } = armar({ vehiculos: null, vehiculo_fotos: [] });

    const res = await service.fotosParaCompartir('nope');

    expect(res.success).toBe(false);
    expect(res.error).toBeTruthy();
  });
});
