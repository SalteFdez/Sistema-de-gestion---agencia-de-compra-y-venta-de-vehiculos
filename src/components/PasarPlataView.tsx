import React, { useState } from 'react';
import { cuentasQueQuedaranNegativas } from '../lib/vehiculos/vehiculos-service';
import { formatMoney } from '../lib/format/money';

export interface PasarPlataViewProps {
  cuentas: Array<{ id: string; nombre: string; saldo: number }>;
  onRegistrar: (params: {
    origenId: string;
    destinoId: string;
    monto: number;
    descripcion?: string;
  }) => Promise<{ success: boolean; error?: string } | void>;
  onVolver: () => void;
}

const botonCuenta = 'w-full py-3 bg-white border border-gray-300 text-gray-900 text-sm font-medium rounded-lg';

export const PasarPlataView: React.FC<PasarPlataViewProps> = ({ cuentas, onRegistrar, onVolver }) => {
  const [origenId, setOrigenId] = useState<string | null>(null);
  const [destinoId, setDestinoId] = useState<string | null>(null);
  const [monto, setMonto] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  // Aviso de saldo negativo en el origen: se muestra antes de registrar y pide confirmación
  const [aviso, setAviso] = useState<string | null>(null);
  // Resumen después de un pase exitoso
  const [resumen, setResumen] = useState<string | null>(null);

  // Si falla, se muestra el error y el formulario conserva todo lo cargado
  const enviar = async (montoNumero: number) => {
    const res = await onRegistrar({
      origenId: origenId ?? '',
      destinoId: destinoId ?? '',
      monto: montoNumero,
      descripcion: descripcion.trim() || undefined,
    });
    if (res && !res.success) {
      setError(res.error ?? 'No se pudo pasar la plata. No se pasó nada.');
      return;
    }
    const nombreDe = (id: string | null) => cuentas.find((c) => c.id === id)?.nombre ?? '';
    setResumen(`Pasaste ${formatMoney(montoNumero)} de ${nombreDe(origenId)} a ${nombreDe(destinoId)}`);
  };

  const confirmar = () => {
    const montoNumero = Number(monto.replace(/\D/g, ''));
    if (!(montoNumero > 0)) {
      setError('El monto tiene que ser mayor que 0');
      return;
    }
    setError(null);
    const negativas = cuentasQueQuedaranNegativas(
      [{ cuentaId: origenId ?? '', monto: montoNumero }],
      cuentas.map((c) => ({ cuentaId: c.id, nombre: c.nombre, saldo: c.saldo }))
    );
    if (negativas.length > 0) {
      const n = negativas[0];
      setAviso(`La cuenta ${n.nombre} va a quedar en $ −${formatMoney(Math.abs(n.saldoResultante)).replace('$ ', '')}`);
      return;
    }
    enviar(montoNumero);
  };

  if (resumen) {
    return (
      <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
        <p role="status" className="text-lg font-semibold text-green-700 bg-green-50 border border-green-200 rounded-xl p-4">
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
        <h1 className="text-xl font-bold text-gray-900">Pasar entre cuentas</h1>
        <button
          type="button"
          onClick={onVolver}
          className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2.5 py-1"
        >
          Volver
        </button>
      </header>

      <fieldset className="mb-4">
        <legend className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Desde</legend>
        <div className="space-y-2">
          {cuentas.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={origenId === c.id}
              onClick={() => setOrigenId(c.id)}
              className={botonCuenta}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mb-4">
        <legend className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Hacia</legend>
        <div className="space-y-2">
          {cuentas
            .filter((c) => c.id !== origenId)
            .map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={destinoId === c.id}
                onClick={() => setDestinoId(c.id)}
                className={botonCuenta}
              >
                {c.nombre}
              </button>
            ))}
        </div>
      </fieldset>

      <div className="mb-3">
        <label htmlFor="pase-monto" className="block text-xs font-semibold text-gray-700 mb-1">
          Monto
        </label>
        <input
          id="pase-monto"
          type="text"
          inputMode="numeric"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="pase-descripcion" className="block text-xs font-semibold text-gray-700 mb-1">
          Descripción (opcional)
        </label>
        <input
          id="pase-descripcion"
          type="text"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        />
      </div>

      {(error || aviso) && (
        <p role="alert" className="text-sm text-red-700 mb-3">
          {error ?? aviso}
        </p>
      )}

      {aviso ? (
        <button
          type="button"
          onClick={() => {
            setAviso(null);
            enviar(Number(monto.replace(/\D/g, '')));
          }}
          className="w-full py-3 bg-red-600 text-white text-sm font-semibold rounded-lg"
        >
          Confirmar igual
        </button>
      ) : (
        <button
          type="button"
          onClick={confirmar}
          className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg"
        >
          Pasar plata
        </button>
      )}
    </div>
  );
};
