import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    expect(screen.getByText('En stock')).toBeInTheDocument();
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

  it('tocar la tarjeta de un vehículo abre su detalle', () => {
    const vehiculos: VehiculoItem[] = [
      { id: 'v2', codigo: 'MC-002', marca: 'Ford', modelo: 'Ka', anio: 2012, color: null, estado: 'en_stock', fotoUrl: 'https://storage.test/ka.jpg', fechaIngreso: '2026-11-13' },
    ];
    const onAbrirDetalle = vi.fn();

    render(<VehiculosView vehiculos={vehiculos} onVolver={vi.fn()} onAbrirDetalle={onAbrirDetalle} />);

    fireEvent.click(screen.getByText('MC-002'));

    expect(onAbrirDetalle).toHaveBeenCalledWith('v2');
  });

  it('tocar "Sin foto · Agregar" no abre el detalle del vehículo', () => {
    const vehiculos: VehiculoItem[] = [
      { id: 'v5', codigo: 'MC-005', marca: 'Renault', modelo: 'Clio', anio: 2008, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-14' },
    ];
    const onAbrirDetalle = vi.fn();

    render(<VehiculosView vehiculos={vehiculos} onVolver={vi.fn()} onAbrirDetalle={onAbrirDetalle} />);

    fireEvent.click(screen.getByRole('button', { name: /sin foto · agregar/i }));

    expect(onAbrirDetalle).not.toHaveBeenCalled();
  });

  it('el botón "Cargar stock existente" abre el formulario con marca, modelo, año y costo', () => {
    render(<VehiculosView vehiculos={[]} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /cargar stock existente/i }));

    expect(screen.getByLabelText(/marca/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/modelo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/año/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/costo/i)).toBeInTheDocument();
  });

  it('al guardar llama al servicio con los datos y muestra en grande el código asignado', async () => {
    const onCargarStock = vi.fn().mockResolvedValue({
      success: true,
      codigo: 'MC-001',
      fechaIngreso: '2026-11-13',
    });

    render(<VehiculosView vehiculos={[]} onVolver={vi.fn()} onCargarStock={onCargarStock} />);

    fireEvent.click(screen.getByRole('button', { name: /cargar stock existente/i }));
    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/costo/i), { target: { value: '5000000' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText('MC-001')).toBeInTheDocument();
    expect(onCargarStock).toHaveBeenCalledWith(
      expect.objectContaining({ marca: 'Fiat', modelo: 'Uno', anio: 2010, costo: 5000000 })
    );
  });

  it('el color es opcional: si se completa, se manda al servicio', async () => {
    const onCargarStock = vi.fn().mockResolvedValue({
      success: true,
      codigo: 'MC-011',
      fechaIngreso: '2026-11-13',
    });

    render(<VehiculosView vehiculos={[]} onVolver={vi.fn()} onCargarStock={onCargarStock} />);

    fireEvent.click(screen.getByRole('button', { name: /cargar stock existente/i }));
    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/costo/i), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/color/i), { target: { value: 'Rojo' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText('MC-011')).toBeInTheDocument();
    expect(onCargarStock).toHaveBeenCalledWith(expect.objectContaining({ color: 'Rojo' }));
  });

  it('la patente es opcional: si se completa, se manda al servicio', async () => {
    const onCargarStock = vi.fn().mockResolvedValue({
      success: true,
      codigo: 'MC-012',
      fechaIngreso: '2026-11-13',
    });

    render(<VehiculosView vehiculos={[]} onVolver={vi.fn()} onCargarStock={onCargarStock} />);

    fireEvent.click(screen.getByRole('button', { name: /cargar stock existente/i }));
    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/costo/i), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/patente/i), { target: { value: 'AB123CD' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText('MC-012')).toBeInTheDocument();
    expect(onCargarStock).toHaveBeenCalledWith(expect.objectContaining({ patente: 'AB123CD' }));
  });

  it('la foto es opcional: si se elige una, se manda al servicio', async () => {
    const onCargarStock = vi.fn().mockResolvedValue({
      success: true,
      codigo: 'MC-013',
      fechaIngreso: '2026-11-13',
    });
    const foto = new File(['jpeg'], 'auto.jpg', { type: 'image/jpeg' });

    render(
      <VehiculosView
        vehiculos={[]}
        onVolver={vi.fn()}
        onCargarStock={onCargarStock}
        comprimirFoto={async (f) => f}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /cargar stock existente/i }));
    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/costo/i), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/foto/i), { target: { files: [foto] } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText('MC-013')).toBeInTheDocument();
    expect(onCargarStock).toHaveBeenCalledWith(expect.objectContaining({ foto }));
  });

  it('la foto se comprime antes de enviarla al servicio', async () => {
    const onCargarStock = vi.fn().mockResolvedValue({
      success: true,
      codigo: 'MC-015',
      fechaIngreso: '2026-11-13',
    });
    const original = new File(['grande'], 'grande.jpg', { type: 'image/jpeg' });
    const comprimida = new File(['chica'], 'chica.jpg', { type: 'image/jpeg' });
    const comprimir = vi.fn().mockResolvedValue(comprimida);

    render(
      <VehiculosView
        vehiculos={[]}
        onVolver={vi.fn()}
        onCargarStock={onCargarStock}
        comprimirFoto={comprimir}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /cargar stock existente/i }));
    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/costo/i), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/foto/i), { target: { files: [original] } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText('MC-015')).toBeInTheDocument();
    expect(comprimir).toHaveBeenCalledWith(original);
    expect(onCargarStock).toHaveBeenCalledWith(expect.objectContaining({ foto: comprimida }));
  });

  it('si la foto no se puede comprimir, el vehículo se guarda sin foto y avisa', async () => {
    const onCargarStock = vi.fn().mockResolvedValue({
      success: true,
      codigo: 'MC-016',
      fechaIngreso: '2026-11-13',
    });
    const comprimir = vi.fn().mockRejectedValue(new Error('canvas no disponible'));

    render(
      <VehiculosView
        vehiculos={[]}
        onVolver={vi.fn()}
        onCargarStock={onCargarStock}
        comprimirFoto={comprimir}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /cargar stock existente/i }));
    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/costo/i), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/foto/i), {
      target: { files: [new File(['x'], 'x.heic', { type: 'image/heic' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByTestId('codigo-asignado')).toHaveTextContent('MC-016');
    expect(onCargarStock).toHaveBeenCalledWith(expect.objectContaining({ foto: undefined }));
    expect(screen.getByText(/no se pudo preparar la foto/i)).toBeInTheDocument();
  });

  it('si el vehículo se guarda pero la foto no se pudo subir, lo avisa junto al código', async () => {
    const onCargarStock = vi.fn().mockResolvedValue({
      success: true,
      codigo: 'MC-014',
      fechaIngreso: '2026-11-13',
      avisoFoto: 'No se pudo subir la foto. El vehículo quedó guardado sin foto.',
    });

    render(<VehiculosView vehiculos={[]} onVolver={vi.fn()} onCargarStock={onCargarStock} />);

    fireEvent.click(screen.getByRole('button', { name: /cargar stock existente/i }));
    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/costo/i), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByTestId('codigo-asignado')).toHaveTextContent('MC-014');
    expect(screen.getByText(/no se pudo subir la foto/i)).toBeInTheDocument();
  });

  it('si el servicio rechaza los datos, muestra el motivo y deja el formulario abierto', async () => {
    const onCargarStock = vi.fn().mockResolvedValue({
      success: false,
      error: 'La marca es obligatoria',
    });

    render(<VehiculosView vehiculos={[]} onVolver={vi.fn()} onCargarStock={onCargarStock} />);

    fireEvent.click(screen.getByRole('button', { name: /cargar stock existente/i }));
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText('La marca es obligatoria')).toBeInTheDocument();
    expect(screen.getByLabelText(/marca/i)).toBeInTheDocument();
  });

  it('después de ver el código asignado, "Volver al listado" cierra el formulario', async () => {
    const onCargarStock = vi.fn().mockResolvedValue({
      success: true,
      codigo: 'MC-001',
      fechaIngreso: '2026-11-13',
    });

    render(<VehiculosView vehiculos={[]} onVolver={vi.fn()} onCargarStock={onCargarStock} />);

    fireEvent.click(screen.getByRole('button', { name: /cargar stock existente/i }));
    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/costo/i), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText('MC-001')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /volver al listado/i }));

    expect(screen.getByRole('button', { name: /cargar stock existente/i })).toBeInTheDocument();
    expect(screen.queryByText('MC-001')).not.toBeInTheDocument();
  });
});
