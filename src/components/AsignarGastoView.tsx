import React, { useState } from 'react';
import type { PendienteAsignar, VehiculoItem, AsignarGastoResult } from '../lib/vehiculos/vehiculos-service';
import { FilasVehiculoMonto, type FilaVehiculo } from './FilasVehiculoMonto';
import { formatMoney } from '../lib/format/money';

export interface AsignarGastoViewProps {
  gasto: PendienteAsignar;
  vehiculos: VehiculoItem[];
  onAsignar: (params: {
    gastoId: string;
    pendiente: number;
    asignaciones: Array<{ vehiculoId: string; monto: number }>;
  }) => Promise<AsignarGastoResult>;
  onVolver: () => void;
}

// "2026-11-14" -> "14/11/2026"
const formatoFecha = (iso: string): string => {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
};

export const AsignarGastoView: React.FC<AsignarGastoViewProps> = ({ gasto, vehiculos, onAsignar, onVolver }) => {
  // La primera fila viene con todo lo pendiente
  const [filas, setFilas] = useState<FilaVehiculo[]>(
    vehiculos.length > 0 ? [{ vehiculoId: vehiculos[0].id, monto: gasto.pendiente }] : []
  );
  const [error, setError] = useState<string | null>(null);

  const asignado = filas.reduce((acc, f) => acc + (f.monto || 0), 0);
  const valido =
    filas.length > 0 &&
    filas.every((f) => f.monto > 0) &&
    new Set(filas.map((f) => f.vehiculoId)).size === filas.length &&
    asignado <= gasto.pendiente;

  const confirmar = async () => {
    if (!valido) return;
    const res = await onAsignar({
      gastoId: gasto.gastoId,
      pendiente: gasto.pendiente,
      asignaciones: filas.map((f) => ({ vehiculoId: f.vehiculoId, monto: f.monto })),
    });
    if (res.success) {
      onVolver();
      return;
    }
    // Nada quedó asignado: los datos siguen en pantalla para reintentar
    setError(res.error ?? 'No se pudo asignar. No se asignó nada.');
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
      <header className="flex justify-between items-center py-3 mb-4">
        <h1 className="text-xl font-bold text-gray-900">Asignar gasto</h1>
        <button
          type="button"
          onClick={onVolver}
          className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2.5 py-1"
        >
          Volver
        </button>
      </header>

      <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div>
          <p className="text-xs text-gray-500">
            {formatoFecha(gasto.fecha)} · {gasto.categoria}
            {gasto.proveedorNombre ? ` · ${gasto.proveedorNombre}` : ''}
          </p>
          {gasto.descripcion && <p className="text-sm text-gray-900 mt-1">{gasto.descripcion}</p>}
          <p className="text-sm text-gray-700 mt-1">
            Total {formatMoney(gasto.montoTotal)} · Pendiente {formatMoney(gasto.pendiente)}
          </p>
        </div>

        <FilasVehiculoMonto
          total={gasto.pendiente}
          vehiculos={vehiculos}
          filas={filas}
          onChange={setFilas}
          etiquetaRestante="Queda pendiente"
        />

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={!valido}
          onClick={() => void confirmar()}
          className="w-full py-2.5 bg-blue-600 disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl"
        >
          Confirmar asignación
        </button>
      </section>
    </div>
  );
};
