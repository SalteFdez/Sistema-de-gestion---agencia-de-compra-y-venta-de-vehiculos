import React from 'react';
import type { VehiculoItem } from '../lib/vehiculos/vehiculos-service';
import { formatMoney } from '../lib/format/money';

export interface FilaVehiculo {
  vehiculoId: string;
  monto: number;
}

export interface FilasVehiculoMontoProps {
  total: number;
  vehiculos: VehiculoItem[];
  filas: FilaVehiculo[];
  onChange: (filas: FilaVehiculo[]) => void;
}

// Vehículos para elegir: los en stock o reservados primero, los vendidos al final y marcados
const ordenarParaElegir = (vehiculos: VehiculoItem[]): VehiculoItem[] => {
  const disponibles = vehiculos.filter((v) => v.estado !== 'vendido');
  const vendidos = vehiculos.filter((v) => v.estado === 'vendido');
  return [...disponibles, ...vendidos];
};

const etiquetaVehiculo = (v: VehiculoItem): string =>
  `${v.codigo} · ${v.marca} ${v.modelo}${v.estado === 'vendido' ? ' · vendido' : ''}`;

export const FilasVehiculoMonto: React.FC<FilasVehiculoMontoProps> = ({ total, vehiculos, filas, onChange }) => {
  const opciones = ordenarParaElegir(vehiculos);
  const asignado = filas.reduce((acc, f) => acc + (f.monto || 0), 0);
  const sinAsignar = total - asignado;

  const agregar = () => {
    if (opciones.length === 0) return;
    onChange([...filas, { vehiculoId: opciones[0].id, monto: 0 }]);
  };

  const cambiar = (indice: number, cambio: Partial<FilaVehiculo>) => {
    onChange(filas.map((f, i) => (i === indice ? { ...f, ...cambio } : f)));
  };

  const quitar = (indice: number) => {
    onChange(filas.filter((_, i) => i !== indice));
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-800">
        Asignado {formatMoney(asignado)} ·{' '}
        {sinAsignar >= 0 ? `Sin asignar ${formatMoney(sinAsignar)}` : `Sobran ${formatMoney(-sinAsignar)}`}
      </p>

      <ul className="space-y-2">
        {filas.map((f, i) => (
          <li key={i} className="flex gap-2 items-center">
            <select
              aria-label="Vehículo"
              value={f.vehiculoId}
              onChange={(e) => cambiar(i, { vehiculoId: e.target.value })}
              className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white"
            >
              {opciones.map((v) => (
                <option key={v.id} value={v.id}>
                  {etiquetaVehiculo(v)}
                </option>
              ))}
            </select>
            <input
              aria-label="Monto del vehículo"
              type="text"
              inputMode="numeric"
              value={f.monto ? String(f.monto) : ''}
              onChange={(e) => cambiar(i, { monto: Number(e.target.value.replace(/\D/g, '')) })}
              className="w-28 border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white"
            />
            <button
              type="button"
              onClick={() => quitar(i)}
              className="text-xs text-gray-600 border border-gray-300 rounded px-2 py-1"
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={agregar}
        className="w-full py-2 bg-white border border-gray-300 text-gray-800 text-sm font-medium rounded-lg"
      >
        + Agregar otro vehículo
      </button>
    </div>
  );
};
