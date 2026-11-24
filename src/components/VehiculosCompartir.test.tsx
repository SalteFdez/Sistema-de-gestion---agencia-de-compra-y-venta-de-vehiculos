import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { VehiculosView } from './VehiculosView';
import type { VehiculoItem } from '../lib/vehiculos/vehiculos-service';

const conFoto: VehiculoItem = {
  id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null,
  estado: 'en_stock', fotoUrl: 'https://storage.test/uno.jpg', fechaIngreso: '2026-11-13',
};
const sinFoto: VehiculoItem = {
  id: 'v2', codigo: 'MC-002', marca: 'Ford', modelo: 'Ka', anio: 2012, color: null,
  estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-13',
};

const definirNavegador = (propiedad: 'share' | 'canShare', valor: unknown) => {
  Object.defineProperty(navigator, propiedad, { value: valor, configurable: true, writable: true });
};

const archivosOk = (n: number) => ({
  success: true,
  codigo: 'MC-001',
  marca: 'Fiat',
  modelo: 'Uno',
  urls: Array.from({ length: n }, (_, i) => `https://storage.test/f${i + 1}.jpg`),
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (navigator as unknown as Record<string, unknown>).share;
  delete (navigator as unknown as Record<string, unknown>).canShare;
});

describe('Vehículos: compartir fotos desde la tarjeta', () => {
  it('el botón Compartir aparece solo en los autos con foto', () => {
    render(<VehiculosView vehiculos={[conFoto, sinFoto]} onVolver={vi.fn()} onPedirFotos={vi.fn()} />);

    expect(screen.getAllByRole('button', { name: /^compartir$/i })).toHaveLength(1);
  });

  it('mientras se preparan las fotos muestra "Preparando…" deshabilitado, y no abre el detalle', async () => {
    const onAbrirDetalle = vi.fn();
    const onPedirFotos = vi.fn(() => new Promise<never>(() => {}));
    render(
      <VehiculosView vehiculos={[conFoto]} onVolver={vi.fn()} onAbrirDetalle={onAbrirDetalle} onPedirFotos={onPedirFotos} />
    );

    fireEvent.click(screen.getByRole('button', { name: /^compartir$/i }));

    const preparando = screen.getByRole('button', { name: 'Preparando…' });
    expect(preparando).toBeDisabled();
    expect(onAbrirDetalle).not.toHaveBeenCalled();
  });

  it('si el gesto venció (NotAllowedError), aparece "Compartir ahora (fotos listas)" y reusa las fotos ya armadas', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob(['x']), { status: 200 })));
    const share = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('gesto vencido', 'NotAllowedError'))
      .mockResolvedValueOnce(undefined);
    definirNavegador('canShare', () => true);
    definirNavegador('share', share);
    const onPedirFotos = vi.fn().mockResolvedValue(archivosOk(2));
    render(<VehiculosView vehiculos={[conFoto]} onVolver={vi.fn()} onPedirFotos={onPedirFotos} />);

    fireEvent.click(screen.getByRole('button', { name: /^compartir$/i }));
    const ahora = await screen.findByRole('button', { name: /compartir ahora \(fotos listas\)/i });
    expect(share).toHaveBeenCalledTimes(1);

    fireEvent.click(ahora);
    await waitFor(() => expect(share).toHaveBeenCalledTimes(2));
    const archivos = share.mock.calls[1][0].files as File[];
    expect(archivos.map((f) => f.name)).toEqual(['MC-001-1.jpg', 'MC-001-2.jpg']);
    expect(share.mock.calls[1][0].text).toBe('Fiat Uno 2010');
  });

  it('si una foto no se puede preparar, avisa "No se pudo preparar 1 de 2 fotos" y comparte las demás', async () => {
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
    const onPedirFotos = vi.fn().mockResolvedValue(archivosOk(2));
    render(<VehiculosView vehiculos={[conFoto]} onVolver={vi.fn()} onPedirFotos={onPedirFotos} />);

    fireEvent.click(screen.getByRole('button', { name: /^compartir$/i }));

    expect(await screen.findByText(/no se pudo preparar 1 de 2 fotos/i)).toBeInTheDocument();
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share.mock.calls[0][0].files.map((f: File) => f.name)).toEqual(['MC-001-1.jpg']);
    expect(screen.getByRole('button', { name: /^compartir$/i })).toBeEnabled();
  });
});
