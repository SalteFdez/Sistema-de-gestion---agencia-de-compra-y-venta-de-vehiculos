import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CargarStockView } from './CargarStockView';

describe('CargarStockView', () => {
  it('muestra el título "Cargar stock existente" con Volver, y el formulario con marca, modelo, año y costo', () => {
    const onVolver = vi.fn();
    render(<CargarStockView onVolver={onVolver} />);

    expect(screen.getByRole('heading', { name: 'Cargar stock existente' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onVolver).toHaveBeenCalledTimes(1);

    expect(screen.getByLabelText(/marca/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/modelo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/año/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/costo/i)).toBeInTheDocument();
  });

  it('al guardar llama al servicio con los datos y muestra en grande el código asignado', async () => {
    const onGuardar = vi.fn().mockResolvedValue({
      success: true,
      codigo: 'MC-001',
      fechaIngreso: '2026-11-13',
    });

    render(<CargarStockView onVolver={vi.fn()} onGuardar={onGuardar} />);

    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/costo/i), { target: { value: '5000000' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText('MC-001')).toBeInTheDocument();
    expect(onGuardar).toHaveBeenCalledWith(
      expect.objectContaining({ marca: 'Fiat', modelo: 'Uno', anio: 2010, costo: 5000000 })
    );
  });

  it('el color es opcional: si se completa, se manda al servicio', async () => {
    const onGuardar = vi.fn().mockResolvedValue({
      success: true,
      codigo: 'MC-011',
      fechaIngreso: '2026-11-13',
    });

    render(<CargarStockView onVolver={vi.fn()} onGuardar={onGuardar} />);

    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/costo/i), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/color/i), { target: { value: 'Rojo' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText('MC-011')).toBeInTheDocument();
    expect(onGuardar).toHaveBeenCalledWith(expect.objectContaining({ color: 'Rojo' }));
  });

  it('la patente es opcional: si se completa, se manda al servicio', async () => {
    const onGuardar = vi.fn().mockResolvedValue({
      success: true,
      codigo: 'MC-012',
      fechaIngreso: '2026-11-13',
    });

    render(<CargarStockView onVolver={vi.fn()} onGuardar={onGuardar} />);

    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/costo/i), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/patente/i), { target: { value: 'AB123CD' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText('MC-012')).toBeInTheDocument();
    expect(onGuardar).toHaveBeenCalledWith(expect.objectContaining({ patente: 'AB123CD' }));
  });

  it('la foto es opcional: si se elige una, se manda al servicio', async () => {
    const onGuardar = vi.fn().mockResolvedValue({
      success: true,
      codigo: 'MC-013',
      fechaIngreso: '2026-11-13',
    });
    const foto = new File(['jpeg'], 'auto.jpg', { type: 'image/jpeg' });

    render(<CargarStockView onVolver={vi.fn()} onGuardar={onGuardar} comprimirFoto={async (f) => f} />);

    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/costo/i), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/foto/i), { target: { files: [foto] } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText('MC-013')).toBeInTheDocument();
    expect(onGuardar).toHaveBeenCalledWith(expect.objectContaining({ foto }));
  });

  it('la foto se comprime antes de enviarla al servicio', async () => {
    const onGuardar = vi.fn().mockResolvedValue({
      success: true,
      codigo: 'MC-015',
      fechaIngreso: '2026-11-13',
    });
    const original = new File(['grande'], 'grande.jpg', { type: 'image/jpeg' });
    const comprimida = new File(['chica'], 'chica.jpg', { type: 'image/jpeg' });
    const comprimir = vi.fn().mockResolvedValue(comprimida);

    render(<CargarStockView onVolver={vi.fn()} onGuardar={onGuardar} comprimirFoto={comprimir} />);

    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/costo/i), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/foto/i), { target: { files: [original] } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText('MC-015')).toBeInTheDocument();
    expect(comprimir).toHaveBeenCalledWith(original);
    expect(onGuardar).toHaveBeenCalledWith(expect.objectContaining({ foto: comprimida }));
  });

  it('si la foto no se puede comprimir, el vehículo se guarda sin foto y avisa', async () => {
    const onGuardar = vi.fn().mockResolvedValue({
      success: true,
      codigo: 'MC-016',
      fechaIngreso: '2026-11-13',
    });
    const comprimir = vi.fn().mockRejectedValue(new Error('canvas no disponible'));

    render(<CargarStockView onVolver={vi.fn()} onGuardar={onGuardar} comprimirFoto={comprimir} />);

    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/costo/i), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/foto/i), {
      target: { files: [new File(['x'], 'x.heic', { type: 'image/heic' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByTestId('codigo-asignado')).toHaveTextContent('MC-016');
    expect(onGuardar).toHaveBeenCalledWith(expect.objectContaining({ foto: undefined }));
    expect(screen.getByText(/no se pudo preparar la foto/i)).toBeInTheDocument();
  });

  it('si el vehículo se guarda pero la foto no se pudo subir, lo avisa junto al código', async () => {
    const onGuardar = vi.fn().mockResolvedValue({
      success: true,
      codigo: 'MC-014',
      fechaIngreso: '2026-11-13',
      avisoFoto: 'No se pudo subir la foto. El vehículo quedó guardado sin foto.',
    });

    render(<CargarStockView onVolver={vi.fn()} onGuardar={onGuardar} />);

    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/costo/i), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByTestId('codigo-asignado')).toHaveTextContent('MC-014');
    expect(screen.getByText(/no se pudo subir la foto/i)).toBeInTheDocument();
  });

  it('si el servicio rechaza los datos, muestra el motivo y deja el formulario abierto', async () => {
    const onGuardar = vi.fn().mockResolvedValue({
      success: false,
      error: 'La marca es obligatoria',
    });

    render(<CargarStockView onVolver={vi.fn()} onGuardar={onGuardar} />);

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText('La marca es obligatoria')).toBeInTheDocument();
    expect(screen.getByLabelText(/marca/i)).toBeInTheDocument();
  });

  it('después de ver el código asignado, "Volver al listado" lleva al listado', async () => {
    const onGuardar = vi.fn().mockResolvedValue({
      success: true,
      codigo: 'MC-001',
      fechaIngreso: '2026-11-13',
    });
    const onVolverAlListado = vi.fn();

    render(<CargarStockView onVolver={vi.fn()} onGuardar={onGuardar} onVolverAlListado={onVolverAlListado} />);

    fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
    fireEvent.change(screen.getByLabelText(/costo/i), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText('MC-001')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /volver al listado/i }));
    expect(onVolverAlListado).toHaveBeenCalledTimes(1);
  });
});
