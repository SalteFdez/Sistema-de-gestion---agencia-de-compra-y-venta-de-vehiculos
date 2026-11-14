import React, { useEffect, useState } from 'react';
import type { CuentaItem } from '../lib/cuentas/cuentas-service';
import { formatMoney, parseMoneyInput } from '../lib/format/money';

export interface FilaReparto {
  cuentaId: string;
  monto: string;
}

export interface RepartoCuentasProps {
  cuentas: CuentaItem[];
  /** Precio total en pesos enteros: la primera fila se precarga con este monto */
  precio: number;
  onChange: (filas: FilaReparto[]) => void;
}

export const RepartoCuentas: React.FC<RepartoCuentasProps> = ({ cuentas, precio, onChange }) => {
  const [filas, setFilas] = useState<FilaReparto[]>(() =>
    cuentas.length > 0 ? [{ cuentaId: cuentas[0].id, monto: precio > 0 ? String(precio) : '' }] : []
  );

  // Las cuentas pueden llegar después del primer render: si todavía no hay filas, se arma la primera
  useEffect(() => {
    if (filas.length === 0 && cuentas.length > 0) {
      setFilas([{ cuentaId: cuentas[0].id, monto: precio > 0 ? String(precio) : '' }]);
    }
  }, [cuentas, filas.length, precio]);

  // Mientras haya una sola fila, su monto sigue al precio completo
  useEffect(() => {
    setFilas((prev) =>
      prev.length === 1 ? [{ ...prev[0], monto: precio > 0 ? String(precio) : '' }] : prev
    );
  }, [precio]);

  useEffect(() => {
    onChange(filas);
  }, [filas]); // eslint-disable-line react-hooks/exhaustive-deps

  const suma = filas.reduce((acc, f) => acc + parseMoneyInput(f.monto), 0);
  const diferencia = precio - suma;
  // Solo cuenta como inválido un monto escrito que sea 0 o negativo (un monto vacío todavía no se evalúa)
  const montosValidos = !filas.some((f) => f.monto.trim() !== '' && parseMoneyInput(f.monto) <= 0);
  const cuentasSinRepetir = new Set(filas.map((f) => f.cuentaId)).size === filas.length;

  return (
    <div className="space-y-2">
      {filas.map((fila, i) => (
        <div key={i} className="flex gap-2">
          <select
            aria-label={`Cuenta de pago ${i + 1}`}
            value={fila.cuentaId}
            onChange={(e) => setFilas((prev) => prev.map((f, j) => (j === i ? { ...f, cuentaId: e.target.value } : f)))}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <input
            aria-label={`Monto pago ${i + 1}`}
            type="text"
            inputMode="numeric"
            value={fila.monto}
            onChange={(e) => setFilas((prev) => prev.map((f, j) => (j === i ? { ...f, monto: e.target.value } : f)))}
            className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          {i > 0 && (
            <button
              type="button"
              aria-label={`Quitar pago ${i + 1}`}
              onClick={() => setFilas((prev) => prev.filter((_, j) => j !== i))}
              className="text-xs text-gray-500 hover:text-red-600 px-2"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setFilas((prev) => {
            // Primera cuenta que todavía no está en el reparto
            const usadas = new Set(prev.map((f) => f.cuentaId));
            const libre = cuentas.find((c) => !usadas.has(c.id)) ?? cuentas[0];
            return [...prev, { cuentaId: libre.id, monto: '' }];
          })
        }
        className="text-xs text-blue-600 hover:underline font-medium"
      >
        + Agregar otra cuenta
      </button>

      {!montosValidos && <p className="text-sm text-red-700">Cada pago tiene que ser mayor que 0</p>}
      {!cuentasSinRepetir && <p className="text-sm text-red-700">No podés repetir una cuenta en los pagos</p>}

      {precio > 0 && diferencia !== 0 && (
        <p className="text-sm font-semibold text-amber-700">
          {diferencia > 0 ? `Faltan ${formatMoney(diferencia)}` : `Sobran ${formatMoney(-diferencia)}`}
        </p>
      )}
    </div>
  );
};
