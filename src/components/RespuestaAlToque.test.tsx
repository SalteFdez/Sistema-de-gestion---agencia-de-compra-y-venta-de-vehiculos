import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Boton } from './ui/Boton';
import { Opciones } from './ui/Opciones';
import { BarraNavegacion } from './ui/BarraNavegacion';
import { VehiculoFila } from './VehiculoFila';
import { VehiculosView } from './VehiculosView';
import { MovimientosView } from './MovimientosView';
import type { MovimientoItem, VehiculoItem } from '../lib/vehiculos/vehiculos-service';

const MOVIMIENTO: MovimientoItem = {
  id: 'm1', fecha: '2026-11-14', tipo: 'ingreso_otro', monto: 80000, descripcion: 'Comisión',
  cuentaNombre: 'Banco', vehiculoId: null, vehiculoCodigo: null, categoriaNombre: 'Comisión', creadoPor: 'Lautaro',
  anulado: false, anuladoPor: null, anuladoEl: null, motivoAnulacion: null, gastoId: null, ventaId: null,
};

const VEHICULO: VehiculoItem = {
  id: 'v14', codigo: 'MC-014', marca: 'Chevrolet', modelo: 'Corsa', anio: 2010, color: null, patente: null,
  estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-01',
};

describe('Boton: respuesta al toque', () => {
  it('el primario se oscurece al apretar, y se achica levemente', () => {
    render(<Boton onClick={vi.fn()}>Guardar</Boton>);

    const boton = screen.getByRole('button', { name: 'Guardar' });
    expect(boton).toHaveClass('active:bg-marca-oscuro', 'enabled:active:scale-[0.98]', 'transition');
  });

  it('los demás se oscurecen con gris al apretar', () => {
    render(<Boton variante="secundario" onClick={vi.fn()}>Volver</Boton>);

    expect(screen.getByRole('button', { name: 'Volver' })).toHaveClass('active:bg-gray-100');
  });

  it('los peligrosos tienen su propio tono al apretar', () => {
    const { unmount } = render(<Boton variante="peligro" onClick={vi.fn()}>Sí, anular</Boton>);
    expect(screen.getByRole('button', { name: 'Sí, anular' })).toHaveClass('active:bg-red-700');
    unmount();

    render(<Boton variante="peligroBorde" onClick={vi.fn()}>Anular compra</Boton>);
    expect(screen.getByRole('button', { name: 'Anular compra' })).toHaveClass('active:bg-red-50');
  });

  it('un botón deshabilitado no reacciona al toque (el efecto va solo con enabled:)', () => {
    render(<Boton disabled onClick={vi.fn()}>Cobrar</Boton>);

    expect(screen.getByRole('button', { name: 'Cobrar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cobrar' })).toHaveClass('enabled:active:scale-[0.98]');
  });
});

describe('Opciones: respuesta al toque', () => {
  it('cada opción se achica y se pone gris al apretar', () => {
    render(
      <Opciones
        etiqueta="Ver"
        opciones={[{ id: 'todos', nombre: 'Todos' }, { id: 'salidas', nombre: 'Salidas' }]}
        seleccionada="todos"
        onElegir={vi.fn()}
      />
    );

    const salidas = screen.getByRole('button', { name: 'Salidas' });
    expect(salidas).toHaveClass('active:scale-[0.98]', 'active:bg-gray-100');
  });
});

describe('BarraNavegacion: respuesta al toque', () => {
  it('cada pestaña se achica al apretar', () => {
    render(<BarraNavegacion pestanaActiva="home" onSeleccionar={vi.fn()} />);

    expect(screen.getByRole('button', { name: /movimientos/i })).toHaveClass('active:scale-[0.98]');
  });
});

describe('filas y tarjetas tocables: respuesta al toque', () => {
  it('la fila de Lista se pone gris al apretar', () => {
    render(<VehiculoFila vehiculo={VEHICULO} fotoUrl={null} onAbrir={vi.fn()} />);

    expect(screen.getByRole('button', { name: /chevrolet corsa/i })).toHaveClass('active:bg-gray-100');
  });

  it('la tarjeta de Tarjetas se achica al apretar', () => {
    render(<VehiculosView vehiculos={[VEHICULO]} onVolver={vi.fn()} />);

    expect(screen.getByText('MC-014').closest('article')).toHaveClass('active:scale-[0.98]');
  });

  it('una fila de Movimientos se pone gris al apretar', () => {
    render(<MovimientosView movimientos={[MOVIMIENTO]} onVolver={vi.fn()} />);

    expect(screen.getByText('Comisión').closest('li')).toHaveClass('active:bg-gray-100');
  });
});
