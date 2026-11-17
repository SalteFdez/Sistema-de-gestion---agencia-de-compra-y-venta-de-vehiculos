import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { RegistrarGastoView } from './RegistrarGastoView';
import type { CuentaItem } from '../lib/cuentas/cuentas-service';
import type { VehiculoItem } from '../lib/vehiculos/vehiculos-service';

const cuentas = [
  { id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo', saldo: 3000000 },
] as unknown as CuentaItem[];

const categorias = [{ id: 'cat1', nombre: 'Chapa y pintura' }];

const vehiculos: VehiculoItem[] = [
  { id: 'v10', codigo: 'MC-010', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-01' },
];

const llenarBasicoConUnVehiculo = () => {
  fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '250000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Chapa y pintura' }));
  fireEvent.click(screen.getByRole('button', { name: /caja efectivo/i }));
  fireEvent.click(screen.getByRole('button', { name: /un vehículo/i }));
  fireEvent.click(screen.getByText('MC-010'));
};

describe('RegistrarGastoView: proveedor (opcional)', () => {
  it('con "Un vehículo", busca el proveedor por nombre y el gasto queda con ese proveedor', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({ success: true, vehiculoCodigo: 'MC-010' });
    const onBuscarProveedores = vi.fn().mockResolvedValue([{ id: 'p1', nombre: 'Mecánico Juan', telefono: null }]);
    render(
      <RegistrarGastoView
        categorias={categorias}
        cuentas={cuentas}
        vehiculos={vehiculos}
        onVolver={vi.fn()}
        onRegistrar={onRegistrar}
        onBuscarProveedores={onBuscarProveedores}
        onCrearProveedor={vi.fn()}
      />
    );

    llenarBasicoConUnVehiculo();
    fireEvent.change(screen.getByLabelText(/proveedor/i), { target: { value: 'mec' } });
    fireEvent.click(await screen.findByRole('button', { name: /mecánico juan/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(onBuscarProveedores).toHaveBeenCalledWith('mec');
    expect(onRegistrar).toHaveBeenCalledWith(expect.objectContaining({ proveedorId: 'p1', vehiculoId: 'v10' }));
  });

  it('crear uno nuevo con nombre y teléfono, y usarlo en el gasto', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({ success: true, vehiculoCodigo: 'MC-010' });
    const onCrearProveedor = vi.fn().mockResolvedValue({
      success: true,
      contacto: { id: 'p9', nombre: 'Mecánico Pedro', telefono: '1155' },
    });
    render(
      <RegistrarGastoView
        categorias={categorias}
        cuentas={cuentas}
        vehiculos={vehiculos}
        onVolver={vi.fn()}
        onRegistrar={onRegistrar}
        onBuscarProveedores={vi.fn().mockResolvedValue([])}
        onCrearProveedor={onCrearProveedor}
      />
    );

    llenarBasicoConUnVehiculo();
    fireEvent.change(screen.getByLabelText(/proveedor/i), { target: { value: 'Mecánico Pedro' } });
    fireEvent.change(screen.getByLabelText(/teléfono/i), { target: { value: '1155' } });
    fireEvent.click(screen.getByRole('button', { name: /crear nuevo/i }));

    expect(await screen.findByText('Mecánico Pedro', { selector: 'span' })).toBeInTheDocument();
    expect(onCrearProveedor).toHaveBeenCalledWith({ nombre: 'Mecánico Pedro', telefono: '1155' });

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onRegistrar).toHaveBeenCalledWith(expect.objectContaining({ proveedorId: 'p9' }));
  });

  it('con "General del negocio" no aparece el campo Proveedor', () => {
    render(
      <RegistrarGastoView
        categorias={categorias}
        cuentas={cuentas}
        vehiculos={vehiculos}
        onVolver={vi.fn()}
        onRegistrar={vi.fn()}
        onBuscarProveedores={vi.fn()}
        onCrearProveedor={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /general del negocio/i }));

    expect(screen.queryByLabelText(/proveedor/i)).not.toBeInTheDocument();
  });
});
