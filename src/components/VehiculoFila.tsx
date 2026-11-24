import React from 'react';
import type { VehiculoItem } from '../lib/vehiculos/vehiculos-service';
import { textoDiasDeVehiculo } from '../lib/vehiculos/dias-en-stock';
import { BadgeEstado } from './ui/BadgeEstado';

export interface VehiculoFilaProps {
  vehiculo: VehiculoItem;
  /** Foto a mostrar (la recién agregada, o la del listado) */
  fotoUrl: string | null;
  /** Tocar la fila abre el detalle */
  onAbrir: () => void;
  /** Botón Compartir de la fila: va al lado, fuera del área que abre el detalle */
  compartir?: React.ReactNode;
}

/** Fila compacta de la vista Lista: miniatura, código, datos, estado y días en stock. Sin costo. */
export const VehiculoFila: React.FC<VehiculoFilaProps> = ({ vehiculo: v, fotoUrl, onAbrir, compartir }) => {
  // Sin una fecha de ingreso válida no hay días que mostrar
  const dias = textoDiasDeVehiculo(v);
  return (
    <li className="flex items-stretch gap-2 bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
      <button
        type="button"
        onClick={onAbrir}
        className="flex flex-1 min-w-0 items-center gap-3 text-left"
      >
        {fotoUrl ? (
          <img src={fotoUrl} alt={`${v.marca} ${v.modelo}`} className="w-16 h-16 shrink-0 object-cover rounded" />
        ) : (
          <span className="w-16 h-16 shrink-0 flex items-center justify-center rounded bg-gray-100 text-[10px] text-gray-500 text-center">
            Sin foto
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold text-blue-700">{v.codigo}</span>
          <span className="block text-sm font-semibold text-gray-900 truncate">
            {v.marca} {v.modelo}
          </span>
          <span className="block text-xs text-gray-600">{v.anio}</span>
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <BadgeEstado estado={v.estado} />
            {dias && <span className="text-xs text-gray-600">{dias}</span>}
          </span>
        </span>
      </button>
      {compartir}
    </li>
  );
};
