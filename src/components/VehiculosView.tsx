import React, { useState } from 'react';
import type { VehiculoItem, CargarStockParams, CargarStockResult } from '../lib/vehiculos/vehiculos-service';
import { CargarStockForm } from './CargarStockForm';

export interface VehiculosViewProps {
  vehiculos: VehiculoItem[];
  onVolver: () => void;
  onCargarStock?: (params: CargarStockParams) => Promise<CargarStockResult>;
  comprimirFoto?: (foto: Blob) => Promise<Blob>;
}

const ETIQUETA_ESTADO: Record<VehiculoItem['estado'], string> = {
  en_stock: 'En stock',
  reservado: 'Reservado',
  vendido: 'Vendido',
};

export const VehiculosView: React.FC<VehiculosViewProps> = ({ vehiculos, onVolver, onCargarStock, comprimirFoto }) => {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
      <header className="flex justify-between items-center py-3 mb-4">
        <h1 className="text-xl font-bold text-gray-900">Vehículos</h1>
        <button
          type="button"
          onClick={onVolver}
          className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2.5 py-1"
        >
          Volver
        </button>
      </header>

      <div className="mb-4">
        {mostrarFormulario ? (
          <CargarStockForm
            onGuardar={onCargarStock}
            onVolverAlListado={() => setMostrarFormulario(false)}
            comprimirFoto={comprimirFoto}
          />
        ) : (
          <button
            type="button"
            onClick={() => setMostrarFormulario(true)}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-sm"
          >
            Cargar stock existente
          </button>
        )}
      </div>

      <div className="space-y-3">
        {vehiculos.map((v) => (
          <article key={v.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {v.fotoUrl ? (
              <img src={v.fotoUrl} alt={`${v.marca} ${v.modelo}`} className="w-full h-48 object-cover" />
            ) : (
              <div className="w-full h-48 flex items-center justify-center bg-gray-100 text-sm text-gray-500">
                Sin foto
              </div>
            )}
            <div className="p-4">
              <span className="text-xs font-bold text-blue-700">{v.codigo}</span>
              <h2 className="text-base font-semibold text-gray-900">
                {v.marca} {v.modelo}
              </h2>
              <p className="text-sm text-gray-600">
                {v.anio}
                {v.color ? ` · ${v.color}` : ''}
              </p>
              <span className="inline-block mt-2 text-xs font-medium text-green-700 bg-green-50 rounded px-2 py-0.5">
                {ETIQUETA_ESTADO[v.estado]}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
