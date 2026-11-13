import React, { useState } from 'react';
import { parseMoneyInput } from '../lib/format/money';
import { comprimirFotoEnNavegador } from '../lib/vehiculos/comprimir-foto';
import type { CargarStockParams, CargarStockResult } from '../lib/vehiculos/vehiculos-service';

export interface CargarStockFormProps {
  onGuardar?: (params: CargarStockParams) => Promise<CargarStockResult>;
  onVolverAlListado?: () => void;
  comprimirFoto?: (foto: Blob) => Promise<Blob>;
}

export const CargarStockForm: React.FC<CargarStockFormProps> = ({
  onGuardar,
  onVolverAlListado,
  comprimirFoto = comprimirFotoEnNavegador,
}) => {
  const [codigoAsignado, setCodigoAsignado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avisoFoto, setAvisoFoto] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!onGuardar) return;
    const form = e.currentTarget;
    const valor = (name: string) => (form.elements.namedItem(name) as HTMLInputElement).value;

    const fotoElegida = (form.elements.namedItem('foto') as HTMLInputElement).files?.[0];
    let foto: Blob | undefined;
    let avisoCompresion: string | null = null;
    if (fotoElegida) {
      try {
        foto = await comprimirFoto(fotoElegida);
      } catch {
        avisoCompresion = 'No se pudo preparar la foto. El vehículo se guarda sin foto.';
      }
    }

    const res = await onGuardar({
      marca: valor('marca'),
      modelo: valor('modelo'),
      anio: parseInt(valor('anio'), 10),
      costo: parseMoneyInput(valor('costo')),
      color: valor('color'),
      patente: valor('patente'),
      foto,
    });
    if (res.success && res.codigo) {
      setCodigoAsignado(res.codigo);
      setAvisoFoto(res.avisoFoto ?? avisoCompresion);
    } else if (!res.success) {
      setError(res.error ?? 'No se pudo guardar el vehículo');
    }
  };

  if (codigoAsignado) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-center">
        <span className="text-xs uppercase font-semibold text-gray-500 tracking-wider">Código asignado</span>
        <div data-testid="codigo-asignado" className="text-4xl font-extrabold text-blue-700 mt-2">{codigoAsignado}</div>
        {avisoFoto && <p className="mt-3 text-sm text-amber-700">{avisoFoto}</p>}
        <button
          type="button"
          onClick={onVolverAlListado}
          className="mt-4 w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium text-sm rounded-xl"
        >
          Volver al listado
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
      <div>
        <label htmlFor="stock-marca" className="block text-xs font-semibold text-gray-700 mb-1">
          Marca
        </label>
        <input id="stock-marca" name="marca" type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label htmlFor="stock-modelo" className="block text-xs font-semibold text-gray-700 mb-1">
          Modelo
        </label>
        <input id="stock-modelo" name="modelo" type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label htmlFor="stock-anio" className="block text-xs font-semibold text-gray-700 mb-1">
          Año
        </label>
        <input id="stock-anio" name="anio" type="number" inputMode="numeric" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label htmlFor="stock-costo" className="block text-xs font-semibold text-gray-700 mb-1">
          Costo ($)
        </label>
        <input id="stock-costo" name="costo" type="text" inputMode="numeric" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label htmlFor="stock-color" className="block text-xs font-semibold text-gray-700 mb-1">
          Color (opcional)
        </label>
        <input id="stock-color" name="color" type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label htmlFor="stock-patente" className="block text-xs font-semibold text-gray-700 mb-1">
          Patente (opcional)
        </label>
        <input id="stock-patente" name="patente" type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label htmlFor="stock-foto" className="block text-xs font-semibold text-gray-700 mb-1">
          Foto (opcional)
        </label>
        <input id="stock-foto" name="foto" type="file" accept="image/*" capture="environment" className="w-full text-sm" />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-sm">
        Guardar
      </button>
    </form>
  );
};
