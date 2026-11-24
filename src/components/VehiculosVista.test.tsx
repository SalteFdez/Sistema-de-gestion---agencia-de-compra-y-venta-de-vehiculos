import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { VehiculosView } from './VehiculosView';
import type { VehiculoItem } from '../lib/vehiculos/vehiculos-service';

const vehiculos: VehiculoItem[] = [
  { id: 'v14', codigo: 'MC-014', marca: 'Chevrolet', modelo: 'Corsa', anio: 2010, color: null, patente: 'AB123CD', estado: 'en_stock', fotoUrl: 'https://storage.test/corsa.jpg', fechaIngreso: '2026-11-01' },
  { id: 'v7', codigo: 'MC-007', marca: 'Fiat', modelo: 'Uno', anio: 2012, color: null, patente: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-02' },
];

describe('VehiculosView: vista Tarjetas o Lista', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('el selector Tarjetas / Lista cambia la forma del listado y conserva la búsqueda', () => {
    render(<VehiculosView vehiculos={vehiculos} onVolver={vi.fn()} />);
    fireEvent.change(screen.getByRole('searchbox', { name: /buscar vehículos/i }), { target: { value: 'corsa' } });

    expect(screen.getByRole('button', { name: 'Tarjetas' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('article')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Lista' }));

    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('searchbox', { name: /buscar vehículos/i })).toHaveValue('corsa');
  });

  it('elegir Lista se recuerda en este celular: al volver a abrir Vehículos, sigue en Lista', () => {
    const { unmount } = render(<VehiculosView vehiculos={vehiculos} onVolver={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lista' }));
    expect(localStorage.getItem('vehiculos.vista')).toBe('lista');
    unmount();

    render(<VehiculosView vehiculos={vehiculos} onVolver={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('en Lista, cada auto es una fila con miniatura de 64 px, código, marca, modelo, año, estado y días', () => {
    // Hoy en Buenos Aires: 24/11/2026. El Corsa ingresó el 01/11: 23 días.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-24T12:00:00-03:00'));
    localStorage.setItem('vehiculos.vista', 'lista');

    render(<VehiculosView vehiculos={vehiculos} onVolver={vi.fn()} />);

    const corsa = screen.getByText('MC-014').closest('li') as HTMLElement;
    expect(within(corsa).getByRole('img', { name: 'Chevrolet Corsa' })).toHaveClass('w-16', 'h-16');
    expect(within(corsa).getByText('Chevrolet Corsa')).toBeInTheDocument();
    expect(within(corsa).getByText('2010')).toBeInTheDocument();
    expect(within(corsa).getByText('En stock')).toBeInTheDocument();
    expect(within(corsa).getByText('23 días en stock')).toBeInTheDocument();

    const uno = screen.getByText('MC-007').closest('li') as HTMLElement;
    expect(within(uno).getByText('Sin foto')).toBeInTheDocument();
  });

  it('la vista Lista no muestra ningún monto de costo: se usa delante de clientes', () => {
    localStorage.setItem('vehiculos.vista', 'lista');
    const conCosto = vehiculos.map((v) => ({ ...v, costoReal: 3000000 }));

    render(<VehiculosView vehiculos={conCosto} onVolver={vi.fn()} />);

    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByRole('list').textContent).not.toMatch(/\$/);
    expect(screen.queryByText(/3\.000\.000/)).not.toBeInTheDocument();
  });

  it('en Lista, tocar la fila abre el detalle; Compartir es un ícono de 44 px que no lo abre', () => {
    localStorage.setItem('vehiculos.vista', 'lista');
    const onAbrirDetalle = vi.fn();
    const onPedirFotos = vi.fn().mockResolvedValue({ success: false, error: 'sin fotos', urls: [] });

    render(
      <VehiculosView vehiculos={vehiculos} onVolver={vi.fn()} onAbrirDetalle={onAbrirDetalle} onPedirFotos={onPedirFotos} />
    );

    fireEvent.click(screen.getByText('Chevrolet Corsa'));
    expect(onAbrirDetalle).toHaveBeenCalledWith('v14');
    onAbrirDetalle.mockClear();

    const compartir = screen.getByRole('button', { name: 'Compartir fotos de MC-014' });
    expect(compartir).toHaveClass('w-11', 'h-11');
    fireEvent.click(compartir);

    expect(onPedirFotos).toHaveBeenCalledWith('v14');
    expect(onAbrirDetalle).not.toHaveBeenCalled();
  });

  it('en Lista, un auto sin foto no tiene botón Compartir', () => {
    localStorage.setItem('vehiculos.vista', 'lista');

    render(<VehiculosView vehiculos={vehiculos} onVolver={vi.fn()} onPedirFotos={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Compartir fotos de MC-007' })).not.toBeInTheDocument();
  });

  it('las tarjetas muestran los días en stock junto al estado, y un vendido cuenta hasta la venta', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-24T12:00:00-03:00'));
    const conVendido: VehiculoItem[] = [
      ...vehiculos,
      { id: 'v9', codigo: 'MC-009', marca: 'Fiat', modelo: 'Palio', anio: 2009, color: null, patente: null, estado: 'vendido', fotoUrl: null, fechaIngreso: '2026-10-01', fechaVenta: '2026-10-15' },
    ];

    render(<VehiculosView vehiculos={conVendido} onVolver={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));

    const corsa = screen.getByText('MC-014').closest('article') as HTMLElement;
    expect(within(corsa).getByText('23 días en stock')).toBeInTheDocument();

    const palio = screen.getByText('MC-009').closest('article') as HTMLElement;
    expect(within(palio).getByText('14 días en stock')).toBeInTheDocument();
  });

  it('la búsqueda y el filtro andan igual en Tarjetas y en Lista, y se mantienen al cambiar la vista', () => {
    const conVendido: VehiculoItem[] = [
      ...vehiculos,
      { id: 'v9', codigo: 'MC-009', marca: 'Fiat', modelo: 'Palio', anio: 2009, color: null, patente: null, estado: 'vendido', fotoUrl: null, fechaIngreso: '2026-10-01', fechaVenta: '2026-10-15' },
    ];
    const codigos = () => screen.queryAllByText(/^MC-\d+$/).map((el) => el.textContent);
    render(<VehiculosView vehiculos={conVendido} onVolver={vi.fn()} />);

    fireEvent.change(screen.getByRole('searchbox', { name: /buscar vehículos/i }), { target: { value: 'fiat' } });
    expect(codigos()).toEqual(['MC-007']);

    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(codigos()).toEqual(['MC-007', 'MC-009']);

    fireEvent.click(screen.getByRole('button', { name: 'Vendidos' }));
    expect(codigos()).toEqual(['MC-009']);

    fireEvent.click(screen.getByRole('button', { name: 'Lista' }));
    expect(codigos()).toEqual(['MC-009']);
    expect(screen.getByRole('button', { name: 'Vendidos' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('searchbox', { name: /buscar vehículos/i })).toHaveValue('fiat');

    fireEvent.change(screen.getByRole('searchbox', { name: /buscar vehículos/i }), { target: { value: 'zzz' } });
    expect(screen.getByText(/no hay vehículos que coincidan/i)).toBeInTheDocument();
  });

  it('un auto sin fecha de ingreso válida no muestra días, y el listado no se rompe (en Lista y en Tarjetas)', () => {
    const sinFecha: VehiculoItem[] = [{ ...vehiculos[1], fechaIngreso: undefined as unknown as string }];

    const { unmount } = render(<VehiculosView vehiculos={sinFecha} onVolver={vi.fn()} />);
    expect(screen.getByText('Fiat Uno')).toBeInTheDocument();
    expect(screen.queryByText(/días en stock|Ingresó hoy/)).not.toBeInTheDocument();
    unmount();

    localStorage.setItem('vehiculos.vista', 'lista');
    render(<VehiculosView vehiculos={sinFecha} onVolver={vi.fn()} />);
    const fila = screen.getByText('MC-007').closest('li') as HTMLElement;
    expect(within(fila).getByText('Fiat Uno')).toBeInTheDocument();
    expect(within(fila).queryByText(/días en stock|Ingresó hoy/)).not.toBeInTheDocument();
  });

  it('un vendido sin fecha de venta conocida cuenta los días hasta hoy, y la lista sale igual', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-24T12:00:00-03:00'));
    const sinFechaVenta: VehiculoItem[] = [
      { id: 'v9', codigo: 'MC-009', marca: 'Fiat', modelo: 'Palio', anio: 2009, color: null, patente: null, estado: 'vendido', fotoUrl: null, fechaIngreso: '2026-10-01', fechaVenta: null },
    ];

    render(<VehiculosView vehiculos={sinFechaVenta} onVolver={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));

    const palio = screen.getByText('MC-009').closest('article') as HTMLElement;
    expect(within(palio).getByText('54 días en stock')).toBeInTheDocument();
  });

  it('si el navegador no deja leer ni guardar (modo privado), arranca en Tarjetas y no muestra error', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage bloqueado');
    });

    render(<VehiculosView vehiculos={vehiculos} onVolver={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Tarjetas' })).toHaveAttribute('aria-pressed', 'true');

    // Elegir Lista igual funciona en la sesión, aunque no se pueda guardar
    fireEvent.click(screen.getByRole('button', { name: 'Lista' }));
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true');
  });
});
