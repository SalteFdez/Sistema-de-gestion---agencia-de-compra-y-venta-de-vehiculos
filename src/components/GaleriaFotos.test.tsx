import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { GaleriaFotos } from './GaleriaFotos';
import type { FotoVehiculo } from '../lib/vehiculos/vehiculos-service';

const fotos: FotoVehiculo[] = [
  { id: 'f1', ruta: 'v1/a.jpg', url: 'https://storage.test/a', orden: 1, esPrincipal: true },
  { id: 'f2', ruta: 'v1/b.jpg', url: 'https://storage.test/b', orden: 2, esPrincipal: false },
  { id: 'f3', ruta: 'v1/c.jpg', url: 'https://storage.test/c', orden: 3, esPrincipal: false },
];

const props = () => ({
  fotos,
  anulado: false,
  onAgregar: vi.fn(),
  onUsarComoPrincipal: vi.fn(),
  onQuitar: vi.fn(),
});

describe('GaleriaFotos', () => {
  it('muestra la principal grande, las miniaturas en orden y marca la principal', () => {
    render(<GaleriaFotos {...props()} />);

    expect(screen.getByRole('img', { name: 'Foto grande' })).toHaveAttribute('src', 'https://storage.test/a');
    const miniaturas = screen.getAllByRole('button', { name: /^Foto \d$/ });
    expect(miniaturas.map((m) => m.textContent)).toEqual(expect.any(Array));
    expect(within(miniaturas[0]).getByLabelText('Principal')).toBeInTheDocument();
    expect(within(miniaturas[1]).queryByLabelText('Principal')).not.toBeInTheDocument();
  });

  it('tocar una miniatura la muestra grande; "Usar como principal" la hace principal', () => {
    const p = props();
    render(<GaleriaFotos {...p} />);

    fireEvent.click(screen.getByRole('button', { name: 'Foto 3' }));
    expect(screen.getByRole('img', { name: 'Foto grande' })).toHaveAttribute('src', 'https://storage.test/c');

    fireEvent.click(screen.getByRole('button', { name: 'Usar como principal' }));
    expect(p.onUsarComoPrincipal).toHaveBeenCalledWith('f3');
  });

  it('"Quitar foto" pide confirmación y recién entonces quita', () => {
    const p = props();
    render(<GaleriaFotos {...p} />);

    fireEvent.click(screen.getByRole('button', { name: 'Quitar foto' }));
    expect(p.onQuitar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /sí, quitar/i }));
    expect(p.onQuitar).toHaveBeenCalledWith('f1');
  });

  it('mientras se suben, muestra "Subiendo 2 de 3"', () => {
    render(<GaleriaFotos {...props()} progreso={{ hecho: 2, total: 3 }} />);

    expect(screen.getByText('Subiendo 2 de 3')).toBeInTheDocument();
  });

  it('"Agregar fotos" acepta varias y las entrega juntas', () => {
    const p = props();
    render(<GaleriaFotos {...p} />);

    const entrada = screen.getByLabelText('Elegir fotos') as HTMLInputElement;
    expect(entrada).toHaveAttribute('multiple');
    const a = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
    const b = new File(['b'], 'b.jpg', { type: 'image/jpeg' });
    fireEvent.change(entrada, { target: { files: [a, b] } });

    expect(p.onAgregar).toHaveBeenCalledWith([a, b]);
  });

  it('sin fotos muestra "Sin foto" y el botón para agregar', () => {
    render(<GaleriaFotos {...props()} fotos={[]} />);

    expect(screen.getByText('Sin foto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar fotos' })).toBeInTheDocument();
  });

  it('si una acción falla, el error se muestra en la galería, no en una ventana del navegador', () => {
    const alerta = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    render(<GaleriaFotos {...props()} error="La foto 2 no se subió: sin conexión" />);

    expect(screen.getByRole('alert')).toHaveTextContent('La foto 2 no se subió: sin conexión');
    expect(alerta).not.toHaveBeenCalled();
    alerta.mockRestore();
  });

  it('un auto anulado muestra sus fotos pero sin acciones', () => {
    render(<GaleriaFotos {...props()} anulado />);

    expect(screen.getByRole('img', { name: 'Foto grande' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agregar fotos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Usar como principal' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar foto' })).not.toBeInTheDocument();
  });

  it('la foto grande abre un visor a pantalla completa que se recorre con Siguiente', () => {
    render(<GaleriaFotos {...props()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ver foto grande' }));
    const visor = screen.getByRole('dialog', { name: 'Fotos del vehículo' });
    expect(within(visor).getByRole('img')).toHaveAttribute('src', 'https://storage.test/a');

    fireEvent.click(within(visor).getByRole('button', { name: 'Siguiente' }));
    expect(within(visor).getByRole('img')).toHaveAttribute('src', 'https://storage.test/b');
  });

  it('en el visor, deslizar a la izquierda pasa a la siguiente y a la derecha a la anterior', () => {
    render(<GaleriaFotos {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver foto grande' }));
    const visor = screen.getByRole('dialog', { name: 'Fotos del vehículo' });

    fireEvent.touchStart(visor, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(visor, { changedTouches: [{ clientX: 60 }] });
    expect(within(visor).getByRole('img')).toHaveAttribute('src', 'https://storage.test/b');

    fireEvent.touchStart(visor, { touches: [{ clientX: 60 }] });
    fireEvent.touchEnd(visor, { changedTouches: [{ clientX: 220 }] });
    expect(within(visor).getByRole('img')).toHaveAttribute('src', 'https://storage.test/a');
  });

  it('un movimiento corto del dedo no cambia de foto', () => {
    render(<GaleriaFotos {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver foto grande' }));
    const visor = screen.getByRole('dialog', { name: 'Fotos del vehículo' });

    fireEvent.touchStart(visor, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(visor, { changedTouches: [{ clientX: 180 }] });

    expect(within(visor).getByRole('img')).toHaveAttribute('src', 'https://storage.test/a');
  });
});
