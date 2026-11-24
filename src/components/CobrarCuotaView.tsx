import React, { useState } from 'react';
import type { CuotaPorCobrar } from '../lib/vehiculos/vehiculos-service';
import { formatMoney, parseMoneyInput } from '../lib/format/money';

export interface CobrarCuotaViewProps {
  cuota: CuotaPorCobrar;
  cuentas: Array<{ id: string; nombre: string; saldo: number }>;
  onCobrar: (params: { cuotaId: string; cuentaId: string; monto: number; saldo: number }) => Promise<{ success: boolean; error?: string }>;
  onVolver: () => void;
}

export const CobrarCuotaView: React.FC<CobrarCuotaViewProps> = ({ cuota, cuentas, onCobrar, onVolver }) => {
  // El monto viene con lo que falta de la cuota; se puede bajar para un cobro parcial
  const [monto, setMonto] = useState<string>(String(cuota.saldo));
  const [cuentaId, setCuentaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<string | null>(null);
  // Mientras se guarda, el botón queda deshabilitado con "Guardando…" (evita el doble cobro)
  const [guardando, setGuardando] = useState<boolean>(false);

  const montoNumero = parseMoneyInput(monto);
  const valido = montoNumero > 0 && montoNumero <= cuota.saldo && cuentaId !== null;

  const confirmar = async () => {
    if (!valido || cuentaId === null || guardando) return;
    setGuardando(true);
    const res = await onCobrar({ cuotaId: cuota.cuotaId, cuentaId, monto: montoNumero, saldo: cuota.saldo });
    setGuardando(false);
    if (res.success) {
      setError(null);
      const cuenta = cuentas.find((c) => c.id === cuentaId)?.nombre ?? '';
      setResumen(
        `Cobraste ${formatMoney(montoNumero)} de la cuota ${cuota.numero} de ${cuota.totalCuotas} de ${cuota.vehiculoCodigo} · entró en ${cuenta}`
      );
    } else {
      // Nada quedó cobrado: los datos siguen en pantalla para reintentar
      setError(res.error ?? 'No se pudo cobrar. No se cobró nada.');
    }
  };

  if (resumen) {
    return (
      <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
        <p role="status" className="text-lg font-semibold text-green-700 bg-green-50 border border-green-200 rounded-xl p-4 mt-6">
          {resumen}
        </p>
        <button
          type="button"
          onClick={onVolver}
          className="w-full mt-4 py-3 bg-white border border-gray-300 text-gray-800 text-sm font-medium rounded-lg"
        >
          Listo
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
      <header className="flex justify-between items-center py-3 mb-4">
        <h1 className="text-xl font-bold text-gray-900">{`Cobrar cuota ${cuota.numero} de ${cuota.totalCuotas}`}</h1>
        <button
          type="button"
          onClick={onVolver}
          className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2.5 py-1"
        >
          Volver
        </button>
      </header>

      <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
        <p className="text-sm text-gray-800">{`${cuota.vehiculoCodigo} · ${cuota.comprador ?? 'Sin comprador'}`}</p>
        <p className="text-sm text-gray-700">{`Falta ${formatMoney(cuota.saldo)}`}</p>

        <div>
          <label htmlFor="cobro-monto" className="block text-xs font-semibold text-gray-700 mb-1">Monto a cobrar ($)</label>
          <input
            id="cobro-monto"
            aria-label="Monto a cobrar ($)"
            type="text"
            inputMode="numeric"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          {montoNumero > cuota.saldo && (
            <p className="text-sm text-red-700 mt-1">{`Solo quedan ${formatMoney(cuota.saldo)} de esta cuota`}</p>
          )}
          {montoNumero <= 0 && monto.trim() !== '' && (
            <p className="text-sm text-red-700 mt-1">El monto tiene que ser mayor que 0</p>
          )}
        </div>

        <div>
          <span className="block text-xs font-semibold text-gray-700 mb-1">¿En qué cuenta entró?</span>
          <div className="grid grid-cols-2 gap-2">
            {cuentas.map((c) => {
              const activa = cuentaId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => setCuentaId(c.id)}
                  className={`py-2 px-2 text-left text-sm rounded-xl border ${
                    activa ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  <span className="block font-medium">{c.nombre}</span>
                  <span className="block text-xs opacity-80">{formatMoney(c.saldo)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={!valido || guardando}
          onClick={() => void confirmar()}
          className="w-full py-2.5 bg-blue-600 disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl"
        >
          {guardando ? 'Guardando…' : 'Confirmar cobro'}
        </button>
      </section>
    </div>
  );
};
