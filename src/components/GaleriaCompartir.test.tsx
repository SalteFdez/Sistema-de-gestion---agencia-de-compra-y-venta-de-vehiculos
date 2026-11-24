import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { GaleriaFotos } from './GaleriaFotos';
import type { FotoVehiculo } from '../lib/vehiculos/vehiculos-service';

const fotos: FotoVehiculo[] = [
  { id: 'f1', ruta: 'v1/a.jpg', url: 'https://storage.test/a', orden: 1, esPrincipal: true },
  { id: 'f2', ruta: 'v1/b.jpg', url: 'https://storage.test/b', orden: 2, esPrincipal: false },
];
const paraCompartir = { codigo: 'MC-001', texto: 'Fiat Uno 2010' };

const definirNavegador = (propiedad: 'share' | 'canShare', valor: unknown) => {
  Object.defineProperty(navigator, propiedad, { value: valor, configurable: true, writable: true });
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (navigator as unknown as Record<string, unknown>).share;
  delete (navigator as unknown as Record<string, unknown>).canShare;
});

const fetchOk = () => vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob(['x']), { status: 200 })));

describe('Galería: compartir y descargar', () => {
  it('muestra "Compartir esta foto", "Compartir todas" y "Descargar" cuando hay fotos para compartir', () => {
    render(
      <GaleriaFotos fotos={fotos} anulado={false} onAgregar={vi.fn()} onUsarComoPrincipal={vi.fn()} onQuitar={vi.fn()} paraCompartir={paraCompartir} />
    );

    expect(screen.getByRole('button', { name: /compartir esta foto/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /compartir todas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^descargar$/i })).toBeInTheDocument();
  });

  it('"Compartir todas" manda todas las fotos en orden con su nombre MC-001-<n>.jpg', async () => {
    fetchOk();
    const share = vi.fn().mockResolvedValue(undefined);
    definirNavegador('canShare', () => true);
    definirNavegador('share', share);
    render(
      <GaleriaFotos fotos={fotos} anulado={false} onAgregar={vi.fn()} onUsarComoPrincipal={vi.fn()} onQuitar={vi.fn()} paraCompartir={paraCompartir} />
    );

    fireEvent.click(screen.getByRole('button', { name: /compartir todas/i }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const archivos = share.mock.calls[0][0].files as File[];
    expect(archivos.map((f) => f.name)).toEqual(['MC-001-1.jpg', 'MC-001-2.jpg']);
    expect(share.mock.calls[0][0].text).toBe('Fiat Uno 2010');
  });

  it('"Compartir esta foto" manda solo la que se ve grande, con su número en la galería', async () => {
    fetchOk();
    const share = vi.fn().mockResolvedValue(undefined);
    definirNavegador('canShare', () => true);
    definirNavegador('share', share);
    render(
      <GaleriaFotos fotos={fotos} anulado={false} onAgregar={vi.fn()} onUsarComoPrincipal={vi.fn()} onQuitar={vi.fn()} paraCompartir={paraCompartir} />
    );

    // Se elige la segunda miniatura: la que se ve grande
    fireEvent.click(screen.getByRole('button', { name: 'Foto 2' }));
    fireEvent.click(screen.getByRole('button', { name: /compartir esta foto/i }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const archivos = share.mock.calls[0][0].files as File[];
    expect(archivos.map((f) => f.name)).toEqual(['MC-001-2.jpg']);
  });

  it('"Descargar" baja la foto que se ve grande con un enlace download', async () => {
    fetchOk();
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    // jsdom no trae estas funciones: las definimos para poder espiarlas
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    render(
      <GaleriaFotos fotos={fotos} anulado={false} onAgregar={vi.fn()} onUsarComoPrincipal={vi.fn()} onQuitar={vi.fn()} paraCompartir={paraCompartir} />
    );

    fireEvent.click(screen.getByRole('button', { name: /^descargar$/i }));

    await waitFor(() => expect(clic).toHaveBeenCalledTimes(1));
  });

  it('si una foto no se puede preparar, avisa en la galería y sigue con las demás', async () => {
    let llamada = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        llamada++;
        if (llamada === 2) throw new TypeError('Failed to fetch');
        return new Response(new Blob(['x']), { status: 200 });
      })
    );
    const share = vi.fn().mockResolvedValue(undefined);
    definirNavegador('canShare', () => true);
    definirNavegador('share', share);
    render(
      <GaleriaFotos fotos={fotos} anulado={false} onAgregar={vi.fn()} onUsarComoPrincipal={vi.fn()} onQuitar={vi.fn()} paraCompartir={paraCompartir} />
    );

    fireEvent.click(screen.getByRole('button', { name: /compartir todas/i }));

    expect(await screen.findByText(/no se pudo preparar 1 de 2 fotos/i)).toBeInTheDocument();
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share.mock.calls[0][0].files.map((f: File) => f.name)).toEqual(['MC-001-1.jpg']);
  });
});
