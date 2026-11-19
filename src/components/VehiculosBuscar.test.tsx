import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { VehiculosView } from './VehiculosView';
import type { VehiculoItem } from '../lib/vehiculos/vehiculos-service';

const vehiculos: VehiculoItem[] = [
  { id: 'v14', codigo: 'MC-014', marca: 'Chevrolet', modelo: 'Corsa', anio: 2010, color: null, patente: 'AB123CD', estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-01' },
  { id: 'v7', codigo: 'MC-007', marca: 'Fiat', modelo: 'Uno', anio: 2012, color: null, patente: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-02' },
];

const codigosVisibles = () => screen.queryAllByText(/^MC-\d+$/).map((el) => el.textContent);

describe('VehiculosView: buscar', () => {
  it('la lista se achica mientras se escribe, y encuentra por marca, código o patente', () => {
    render(<VehiculosView vehiculos={vehiculos} onVolver={vi.fn()} />);
    const buscador = screen.getByRole('searchbox', { name: /buscar vehículos/i });

    expect(codigosVisibles()).toEqual(['MC-014', 'MC-007']);

    fireEvent.change(buscador, { target: { value: 'corsa' } });
    expect(codigosVisibles()).toEqual(['MC-014']);

    fireEvent.change(buscador, { target: { value: '007' } });
    expect(codigosVisibles()).toEqual(['MC-007']);

    fireEvent.change(buscador, { target: { value: 'ab 123' } });
    expect(codigosVisibles()).toEqual(['MC-014']);
  });

  it('el buscador tiene el placeholder de la historia', () => {
    render(<VehiculosView vehiculos={vehiculos} onVolver={vi.fn()} />);

    expect(screen.getByPlaceholderText('Buscar por código, marca, modelo o patente')).toBeInTheDocument();
  });

  it('la × borra la búsqueda y vuelve a mostrar todo lo del filtro', () => {
    render(<VehiculosView vehiculos={vehiculos} onVolver={vi.fn()} />);
    const buscador = screen.getByRole('searchbox', { name: /buscar vehículos/i });

    fireEvent.change(buscador, { target: { value: 'corsa' } });
    fireEvent.click(screen.getByRole('button', { name: /borrar búsqueda/i }));

    expect(buscador).toHaveValue('');
    expect(codigosVisibles()).toEqual(['MC-014', 'MC-007']);
  });

  it('la búsqueda y el filtro se aplican juntos', () => {
    const conVendido: VehiculoItem[] = [
      ...vehiculos,
      { id: 'v9', codigo: 'MC-009', marca: 'Fiat', modelo: 'Palio', anio: 2009, color: null, patente: null, estado: 'vendido', fotoUrl: null, fechaIngreso: '2026-10-01' },
    ];
    render(<VehiculosView vehiculos={conVendido} onVolver={vi.fn()} />);

    fireEvent.change(screen.getByRole('searchbox', { name: /buscar vehículos/i }), { target: { value: 'fiat' } });
    expect(codigosVisibles()).toEqual(['MC-007']);

    fireEvent.click(screen.getByRole('button', { name: 'Vendidos' }));
    expect(codigosVisibles()).toEqual(['MC-009']);
  });

  it('sin resultados en el filtro, dice que no hay coincidencias en En stock', () => {
    render(<VehiculosView vehiculos={vehiculos} onVolver={vi.fn()} />);

    fireEvent.change(screen.getByRole('searchbox', { name: /buscar vehículos/i }), { target: { value: 'ford' } });

    expect(screen.getByText("No hay vehículos que coincidan con 'ford' en En stock")).toBeInTheDocument();
  });

  it('si en Todos sí hay coincidencias, el botón Buscar en Todos cambia el filtro', () => {
    const conVendido: VehiculoItem[] = [
      ...vehiculos,
      { id: 'v9', codigo: 'MC-009', marca: 'Fiat', modelo: 'Palio', anio: 2009, color: null, patente: null, estado: 'vendido', fotoUrl: null, fechaIngreso: '2026-10-01' },
    ];
    render(<VehiculosView vehiculos={conVendido} onVolver={vi.fn()} />);

    fireEvent.change(screen.getByRole('searchbox', { name: /buscar vehículos/i }), { target: { value: 'palio' } });
    expect(screen.getByRole('button', { name: /buscar en todos/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /buscar en todos/i }));
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true');
    expect(codigosVisibles()).toEqual(['MC-009']);
  });

  it('sin coincidencias ni en Todos, no ofrece Buscar en Todos', () => {
    render(<VehiculosView vehiculos={vehiculos} onVolver={vi.fn()} />);

    fireEvent.change(screen.getByRole('searchbox', { name: /buscar vehículos/i }), { target: { value: 'ford' } });

    expect(screen.queryByRole('button', { name: /buscar en todos/i })).not.toBeInTheDocument();
  });
});
