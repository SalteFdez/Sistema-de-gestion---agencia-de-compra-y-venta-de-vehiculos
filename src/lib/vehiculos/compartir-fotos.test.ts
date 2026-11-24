import { describe, it, expect, vi } from 'vitest';
import { prepararArchivos, compartir, descargar } from './compartir-fotos';

const jpeg = (nombre: string) => new Blob([nombre], { type: 'image/jpeg' });

// fetch simulado: cada URL devuelve un blob, salvo las que se indican como fallidas
const fetchFalso = (fallan: string[] = []) =>
  vi.fn(async (url: string) => {
    if (fallan.includes(url)) throw new TypeError('Failed to fetch');
    return new Response(jpeg(url), { status: 200 });
  }) as unknown as typeof fetch;

describe('prepararArchivos', () => {
  it('baja cada foto como JPEG con nombre MC-001-<n>.jpg, en el orden recibido', async () => {
    const { archivos, fallidas } = await prepararArchivos(['https://s/a', 'https://s/b'], 'MC-001', fetchFalso());

    expect(fallidas).toBe(0);
    expect(archivos.map((f) => f.name)).toEqual(['MC-001-1.jpg', 'MC-001-2.jpg']);
    expect(archivos.every((f) => f.type === 'image/jpeg')).toBe(true);
  });

  it('si una foto no se puede bajar, las demás siguen y cuenta la fallida con su número', async () => {
    const { archivos, fallidas } = await prepararArchivos(
      ['https://s/a', 'https://s/b', 'https://s/c'],
      'MC-001',
      fetchFalso(['https://s/b'])
    );

    expect(fallidas).toBe(1);
    expect(archivos.map((f) => f.name)).toEqual(['MC-001-1.jpg', 'MC-001-3.jpg']);
  });

  it('con un número inicial, la foto lleva su posición en la galería (por ejemplo, la 3ª es MC-001-3.jpg)', async () => {
    const { archivos } = await prepararArchivos(['https://s/c'], 'MC-001', fetchFalso(), 3);

    expect(archivos.map((f) => f.name)).toEqual(['MC-001-3.jpg']);
  });

  it('si todas fallan, no hay archivos y se cuentan todas', async () => {
    const { archivos, fallidas } = await prepararArchivos(['https://s/a', 'https://s/b'], 'MC-001', fetchFalso(['https://s/a', 'https://s/b']));

    expect(archivos).toEqual([]);
    expect(fallidas).toBe(2);
  });
});

describe('compartir', () => {
  const archivos = [new File(['x'], 'MC-001-1.jpg', { type: 'image/jpeg' })];

  it('si el navegador puede compartir archivos, llama a share con los archivos y el texto', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    const descargarFn = vi.fn();

    const estado = await compartir(archivos, 'Fiat Uno 2010', { nav: { canShare, share }, descargar: descargarFn });

    expect(estado).toBe('compartido');
    expect(share).toHaveBeenCalledWith({ files: archivos, text: 'Fiat Uno 2010' });
    expect(descargarFn).not.toHaveBeenCalled();
  });

  it('si no puede compartir archivos (canShare falso o ausente), descarga cada archivo', async () => {
    const share = vi.fn();
    const descargarFn = vi.fn();

    const conFalso = await compartir(archivos, 'Fiat Uno 2010', { nav: { canShare: () => false, share }, descargar: descargarFn });
    const sinCanShare = await compartir(archivos, 'Fiat Uno 2010', { nav: { share }, descargar: descargarFn });

    expect(conFalso).toBe('descargado');
    expect(sinCanShare).toBe('descargado');
    expect(share).not.toHaveBeenCalled();
    expect(descargarFn).toHaveBeenCalledTimes(2);
    expect(descargarFn).toHaveBeenCalledWith(archivos[0]);
  });

  it('cancelar el menú de compartir (AbortError) no es un error', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancelado', 'AbortError'));

    const estado = await compartir(archivos, 'Fiat Uno 2010', { nav: { canShare: () => true, share } });

    expect(estado).toBe('cancelado');
  });

  it('si el gesto venció (NotAllowedError), deja los archivos listos y devuelve "pendiente"', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('gesto vencido', 'NotAllowedError'));

    const estado = await compartir(archivos, 'Fiat Uno 2010', { nav: { canShare: () => true, share } });

    expect(estado).toBe('pendiente');
  });
});

describe('descargar', () => {
  it('baja el archivo con un enlace download sobre una URL de objeto', () => {
    const creada = vi.fn().mockReturnValue('blob:mock');
    const liberada = vi.fn();
    const clic = vi.fn();
    const url = { createObjectURL: creada, revokeObjectURL: liberada };
    const enlace = { click: clic, href: '', download: '' } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValueOnce(enlace);

    descargar(new File(['x'], 'MC-001-1.jpg', { type: 'image/jpeg' }), { url: url as unknown as typeof URL });

    expect(creada).toHaveBeenCalledTimes(1);
    expect(enlace.download).toBe('MC-001-1.jpg');
    expect(enlace.href).toBe('blob:mock');
    expect(clic).toHaveBeenCalledTimes(1);
  });
});
