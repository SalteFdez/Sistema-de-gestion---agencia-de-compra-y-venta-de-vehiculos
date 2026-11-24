import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { VehiculosView } from './VehiculosView';
import type { VehiculoItem } from '../lib/vehiculos/vehiculos-service';

describe('VehiculosView', () => {
  it('muestra cada vehículo con foto, código, marca, modelo, año, color y estado "En stock"', () => {
    const vehiculos: VehiculoItem[] = [
      {
        id: 'v1',
        codigo: 'MC-001',
        marca: 'Fiat',
        modelo: 'Uno',
        anio: 2010,
        color: 'Rojo',
        estado: 'en_stock',
        fotoUrl: 'https://storage.test/uno.jpg',
        fechaIngreso: '2026-11-13',
      },
    ];

    render(<VehiculosView vehiculos={vehiculos} onVolver={vi.fn()} />);

    expect(screen.getByText('MC-001')).toBeInTheDocument();
    expect(screen.getByText(/Fiat/)).toBeInTheDocument();
    expect(screen.getByText(/Uno/)).toBeInTheDocument();
    expect(screen.getByText(/2010/)).toBeInTheDocument();
    expect(screen.getByText(/Rojo/)).toBeInTheDocument();
    // "En stock" también es el botón del filtro: buscamos el estado dentro de la tarjeta
    expect(within(screen.getByRole('article')).getByText('En stock')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://storage.test/uno.jpg');
  });

  it('un vehículo sin foto muestra el aviso "Sin foto" en lugar de la imagen', () => {
    const vehiculos: VehiculoItem[] = [
      {
        id: 'v2',
        codigo: 'MC-002',
        marca: 'Ford',
        modelo: 'Ka',
        anio: 2012,
        color: null,
        estado: 'en_stock',
        fotoUrl: null,
        fechaIngreso: '2026-11-13',
      },
    ];

    render(<VehiculosView vehiculos={vehiculos} onVolver={vi.fn()} />);

    expect(screen.getByRole('button', { name: /sin foto · agregar/i })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('en un vehículo sin foto aparece el botón "Sin foto · Agregar", y en uno con foto no', () => {
    const vehiculos: VehiculoItem[] = [
      { id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, estado: 'en_stock', fotoUrl: 'https://storage.test/uno.jpg', fechaIngreso: '2026-11-13' },
      { id: 'v2', codigo: 'MC-002', marca: 'Ford', modelo: 'Ka', anio: 2012, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-13' },
    ];

    render(<VehiculosView vehiculos={vehiculos} onVolver={vi.fn()} />);

    const botones = screen.getAllByRole('button', { name: /sin foto · agregar/i });
    expect(botones).toHaveLength(1);
  });

  it('al elegir una foto en un vehículo sin foto, la agrega y su tarjeta muestra la imagen sin salir del listado', async () => {
    const vehiculos: VehiculoItem[] = [
      { id: 'v2', codigo: 'MC-002', marca: 'Ford', modelo: 'Ka', anio: 2012, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-13' },
    ];
    const onAgregarFoto = vi.fn().mockResolvedValue({ success: true, fotoUrl: 'https://storage.test/ka' });
    const foto = new File(['jpeg'], 'ka.jpg', { type: 'image/jpeg' });

    render(
      <VehiculosView
        vehiculos={vehiculos}
        onVolver={vi.fn()}
        onAgregarFoto={onAgregarFoto}
        comprimirFoto={async (f) => f}
      />
    );

    fireEvent.change(screen.getByLabelText('Elegir foto de MC-002'), { target: { files: [foto] } });

    expect(await screen.findByRole('img', { name: /ford ka/i })).toHaveAttribute('src', 'https://storage.test/ka');
    expect(onAgregarFoto).toHaveBeenCalledWith('v2', foto);
    expect(screen.queryByRole('button', { name: /sin foto · agregar/i })).not.toBeInTheDocument();
  });

  it('si la subida de la foto falla, la tarjeta sigue "Sin foto" con un aviso y se puede reintentar', async () => {
    const vehiculos: VehiculoItem[] = [
      { id: 'v3', codigo: 'MC-003', marca: 'Peugeot', modelo: '208', anio: 2019, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-13' },
    ];
    const onAgregarFoto = vi.fn().mockResolvedValue({
      success: false,
      error: 'No se pudo subir la foto. Podés intentar de nuevo.',
    });

    render(
      <VehiculosView
        vehiculos={vehiculos}
        onVolver={vi.fn()}
        onAgregarFoto={onAgregarFoto}
        comprimirFoto={async (f) => f}
      />
    );

    fireEvent.change(screen.getByLabelText('Elegir foto de MC-003'), {
      target: { files: [new File(['jpeg'], 'p.jpg', { type: 'image/jpeg' })] },
    });

    expect(await screen.findByText(/no se pudo subir la foto/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sin foto · agregar/i })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('si se cancela la cámara o el selector, no se llama al servicio y la tarjeta queda igual', async () => {
    const vehiculos: VehiculoItem[] = [
      { id: 'v4', codigo: 'MC-004', marca: 'Renault', modelo: 'Clio', anio: 2008, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-13' },
    ];
    const onAgregarFoto = vi.fn();

    render(
      <VehiculosView
        vehiculos={vehiculos}
        onVolver={vi.fn()}
        onAgregarFoto={onAgregarFoto}
        comprimirFoto={async (f) => f}
      />
    );

    fireEvent.change(screen.getByLabelText('Elegir foto de MC-004'), { target: { files: [] } });

    expect(onAgregarFoto).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /sin foto · agregar/i })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('arranca en "En stock" y muestra solo los vehículos en stock', () => {
    const vehiculos: VehiculoItem[] = [
      { id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-13' },
      { id: 'v2', codigo: 'MC-002', marca: 'Ford', modelo: 'Ka', anio: 2012, color: null, estado: 'vendido', fotoUrl: null, fechaIngreso: '2026-11-13' },
    ];

    render(<VehiculosView vehiculos={vehiculos} onVolver={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'En stock' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Vendidos' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('MC-001')).toBeInTheDocument();
    expect(screen.queryByText('MC-002')).not.toBeInTheDocument();
  });

  it('"Vendidos" muestra solo los vendidos, y "Todos" muestra todos con su estado', () => {
    const vehiculos: VehiculoItem[] = [
      { id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-13' },
      { id: 'v2', codigo: 'MC-002', marca: 'Ford', modelo: 'Ka', anio: 2012, color: null, estado: 'vendido', fotoUrl: null, fechaIngreso: '2026-11-13' },
    ];

    render(<VehiculosView vehiculos={vehiculos} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Vendidos' }));
    expect(screen.getByText('MC-002')).toBeInTheDocument();
    expect(screen.queryByText('MC-001')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(screen.getByText('MC-001')).toBeInTheDocument();
    expect(screen.getByText('MC-002')).toBeInTheDocument();
    expect(within(screen.getAllByRole('article')[1]).getByText('Vendido')).toBeInTheDocument();
  });

  it('si el filtro no tiene vehículos, avisa con un mensaje claro en lugar de una pantalla vacía', () => {
    const vehiculos: VehiculoItem[] = [
      { id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-13' },
    ];

    render(<VehiculosView vehiculos={vehiculos} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Vendidos' }));
    expect(screen.getByText('No hay vehículos vendidos todavía')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'En stock' }));
    expect(screen.queryByText('No hay vehículos vendidos todavía')).not.toBeInTheDocument();
    expect(screen.getByText('MC-001')).toBeInTheDocument();
  });

  it('tocar la tarjeta de un vehículo abre su detalle', () => {
    const vehiculos: VehiculoItem[] = [
      { id: 'v2', codigo: 'MC-002', marca: 'Ford', modelo: 'Ka', anio: 2012, color: null, estado: 'en_stock', fotoUrl: 'https://storage.test/ka.jpg', fechaIngreso: '2026-11-13' },
    ];
    const onAbrirDetalle = vi.fn();

    render(<VehiculosView vehiculos={vehiculos} onVolver={vi.fn()} onAbrirDetalle={onAbrirDetalle} />);

    fireEvent.click(screen.getByText('MC-002'));

    expect(onAbrirDetalle).toHaveBeenCalledWith('v2');
  });

  it('el listado empieza en el buscador y el filtro: "Cargar stock existente" ya no está acá', () => {
    render(<VehiculosView vehiculos={[]} onVolver={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /cargar stock existente/i })).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: /buscar vehículos/i })).toBeInTheDocument();
  });
});
