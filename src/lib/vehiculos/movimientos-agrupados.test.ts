import { describe, it, expect, vi, afterEach } from 'vitest';
import { agruparPorDia, etiquetaDia } from './movimientos-agrupados';

const mov = (id: string, fecha: string) => ({ id, fecha });

describe('agruparPorDia', () => {
  it('agrupa los movimientos consecutivos del mismo día, sin reordenar la lista', () => {
    const grupos = agruparPorDia(
      [mov('a', '2026-11-16'), mov('b', '2026-11-16'), mov('c', '2026-11-14')],
      '2026-11-24'
    );

    expect(grupos.map((g) => g.fecha)).toEqual(['2026-11-16', '2026-11-14']);
    expect(grupos[0].items.map((m) => m.id)).toEqual(['a', 'b']);
    expect(grupos[1].items.map((m) => m.id)).toEqual(['c']);
  });

  it('si una fecha reaparece más abajo (orden por carga), queda como otro grupo', () => {
    const grupos = agruparPorDia(
      [mov('a', '2026-11-16'), mov('b', '2026-11-14'), mov('c', '2026-11-16')],
      '2026-11-24'
    );

    expect(grupos.map((g) => g.fecha)).toEqual(['2026-11-16', '2026-11-14', '2026-11-16']);
  });
});

describe('agruparPorDia: páginas siguientes', () => {
  it('al traer la página siguiente, un día que sigue en la página nueva se une al último grupo', () => {
    const pagina1 = [mov('a', '2026-11-16'), mov('b', '2026-11-14')];
    const pagina2 = [mov('c', '2026-11-14'), mov('d', '2026-11-13')];

    const grupos = agruparPorDia([...pagina1, ...pagina2], '2026-11-24');

    expect(grupos.map((g) => g.fecha)).toEqual(['2026-11-16', '2026-11-14', '2026-11-13']);
    expect(grupos[1].items.map((m) => m.id)).toEqual(['b', 'c']);
  });
});

describe('etiquetaDia', () => {
  it('"Hoy" y "Ayer" respecto de hoy, y el resto como "lun 16/11"', () => {
    expect(etiquetaDia('2026-11-24', '2026-11-24')).toBe('Hoy');
    expect(etiquetaDia('2026-11-23', '2026-11-24')).toBe('Ayer');
    expect(etiquetaDia('2026-11-16', '2026-11-24')).toBe('lun 16/11');
  });

  it('cruza bien el cambio de año: "Ayer" es el 31/12 cuando hoy es 01/01', () => {
    expect(etiquetaDia('2025-12-31', '2026-01-01')).toBe('Ayer');
  });
});

describe('agruparPorDia: hoy en Buenos Aires', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sin hoy explícito, usa el día en Buenos Aires (a la noche en Argentina ya es el día siguiente en UTC)', () => {
    // 2026-11-24 01:00 UTC = 2026-11-23 22:00 en Buenos Aires: "hoy" es el 23
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-24T01:00:00Z'));

    const [grupo] = agruparPorDia([mov('a', '2026-11-23')]);
    expect(grupo.etiqueta).toBe('Hoy');
  });
});
