import React, { useState } from 'react';
import { cuentasQueQuedaranNegativas } from '../lib/vehiculos/vehiculos-service';
import { formatMoney } from '../lib/format/money';

export interface MovimientoSocioViewProps {
  modo: 'aporte' | 'retiro';
  socios: Array<{ id: string; nombre: string }>;
  socioActualId: string;
  cuentas: Array<{ id: string; nombre: string; saldo: number }>;
  onRegistrar: (params: {
    socioId: string;
    cuentaId: string;
    monto: number;
    descripcion?: string;
  }) => Promise<{ success: boolean; error?: string } | void>;
  onVolver: () => void;
}

// Mismo estilo de elegido que Registrar gasto
const botonOpcion = (elegida: boolean) =>
  `w-full py-3 border text-sm font-medium rounded-lg ${
    elegida ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
  }`;

export const MovimientoSocioView: React.FC<MovimientoSocioViewProps> = ({
  modo,
  socios,
  socioActualId,
  cuentas,
  onRegistrar,
  onVolver,
}) => {
  const [socioId, setSocioId] = useState<string>(socioActualId);
  const [cuentaId, setCuentaId] = useState<string | null>(null);
  const [monto, setMonto] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  // Aviso de saldo negativo: solo en el retiro (un aporte nunca deja una cuenta en negativo)
  const [aviso, setAviso] = useState<string | null>(null);
  // Resumen después de un movimiento exitoso
  const [resumen, setResumen] = useState<string | null>(null);
  // Mientras se guarda, el botón queda deshabilitado con "Guardando…" (evita el doble registro)
  const [guardando, setGuardando] = useState<boolean>(false);

  // Si falla, se muestra el error y el formulario conserva todo lo cargado
  const enviar = async (montoNumero: number) => {
    if (guardando) return;
    setGuardando(true);
    const res = await onRegistrar({
      socioId,
      cuentaId: cuentaId ?? '',
      monto: montoNumero,
      descripcion: descripcion.trim() || undefined,
    });
    setGuardando(false);
    setAviso(null);
    if (res && !res.success) {
      setError(res.error ?? 'No se pudo registrar. No se registró nada.');
      return;
    }
    const nombreSocio = socios.find((s) => s.id === socioId)?.nombre ?? '';
    const nombreCuenta = cuentas.find((c) => c.id === cuentaId)?.nombre ?? '';
    setResumen(
      modo === 'aporte'
        ? `${nombreSocio} aportó ${formatMoney(montoNumero)} en ${nombreCuenta}`
        : `${nombreSocio} retiró ${formatMoney(montoNumero)} de ${nombreCuenta}`
    );
  };

  const confirmar = () => {
    const montoNumero = Number(monto.replace(/\D/g, ''));
    if (!(montoNumero > 0)) {
      setError('El monto tiene que ser mayor que 0');
      return;
    }
    setError(null);
    if (modo === 'retiro') {
      const negativas = cuentasQueQuedaranNegativas(
        [{ cuentaId: cuentaId ?? '', monto: montoNumero }],
        cuentas.map((c) => ({ cuentaId: c.id, nombre: c.nombre, saldo: c.saldo }))
      );
      if (negativas.length > 0) {
        const n = negativas[0];
        setAviso(`La cuenta ${n.nombre} va a quedar en $ −${formatMoney(Math.abs(n.saldoResultante)).replace('$ ', '')}`);
        return;
      }
    }
    enviar(montoNumero);
  };

  const etiqueta = modo === 'aporte' ? 'Aporte de socio' : 'Retiro de socio';

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
        <h1 className="text-xl font-bold text-gray-900">{etiqueta}</h1>
        <button
          type="button"
          onClick={onVolver}
          className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2.5 py-1"
        >
          Volver
        </button>
      </header>

      <fieldset className="mb-4">
        <legend className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Socio</legend>
        <div className="space-y-2">
          {socios.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={socioId === s.id}
              onClick={() => setSocioId(s.id)}
              className={botonOpcion(socioId === s.id)}
            >
              {s.nombre}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mb-4">
        <legend className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Cuenta</legend>
        <div className="space-y-2">
          {cuentas.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={cuentaId === c.id}
              onClick={() => setCuentaId(c.id)}
              className={botonOpcion(cuentaId === c.id)}
            >
              {c.nombre} · {formatMoney(c.saldo)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mb-3">
        <label htmlFor="socio-monto" className="block text-xs font-semibold text-gray-700 mb-1">
          Monto
        </label>
        <input
          id="socio-monto"
          type="text"
          inputMode="numeric"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="socio-descripcion" className="block text-xs font-semibold text-gray-700 mb-1">
          Descripción (opcional)
        </label>
        <input
          id="socio-descripcion"
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
          disabled={guardando}
          onClick={() => enviar(Number(monto.replace(/\D/g, '')))}
          className="w-full py-3 bg-red-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg"
        >
          {guardando ? 'Guardando…' : 'Confirmar igual'}
        </button>
      ) : (
        <button
          type="button"
          disabled={guardando}
          onClick={confirmar}
          className="w-full py-3 bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg"
        >
          {guardando ? 'Guardando…' : modo === 'aporte' ? 'Registrar aporte' : 'Registrar retiro'}
        </button>
      )}
    </div>
  );
};
