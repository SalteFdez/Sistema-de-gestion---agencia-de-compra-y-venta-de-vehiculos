import React, { useState } from 'react';
import { cuentasQueQuedaranNegativas } from '../lib/vehiculos/vehiculos-service';
import { formatMoney, parseMoneyInput } from '../lib/format/money';
import { Encabezado } from './ui/Encabezado';
import { Boton } from './ui/Boton';
import { InputMonto } from './ui/InputMonto';
import { Dialogo } from './ui/Dialogo';
import { Opciones } from './ui/Opciones';

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
        setAviso(`La cuenta ${n.nombre} va a quedar en ${formatMoney(n.saldoResultante)}`);
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
        <Boton anchoCompleto variante="secundario" onClick={onVolver}>
          Listo
        </Boton>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
      <Encabezado titulo={etiqueta} onVolver={onVolver} />

      <div className="mb-4">
        <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Socio</h2>
        <Opciones
          etiqueta="Socio"
          opciones={socios.map((s) => ({ id: s.id, nombre: s.nombre }))}
          seleccionada={socioId}
          onElegir={setSocioId}
        />
      </div>

      <div className="mb-4">
        <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Cuenta</h2>
        <Opciones
          etiqueta="Cuenta"
          opciones={cuentas.map((c) => ({ id: c.id, nombre: c.nombre, secundario: formatMoney(c.saldo), negativo: c.saldo < 0 }))}
          seleccionada={cuentaId}
          onElegir={setCuentaId}
        />
      </div>

      <div className="mb-3">
        <label htmlFor="socio-monto" className="block text-xs font-semibold text-gray-700 mb-1">
          Monto
        </label>
        <InputMonto
          id="socio-monto"
          valor={monto === '' ? null : parseMoneyInput(monto)}
          onChange={(n) => setMonto(n === null ? '' : String(n))}
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
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base bg-white"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700 mb-3">
          {error}
        </p>
      )}

      <Boton anchoCompleto guardando={guardando} onClick={confirmar}>
        {modo === 'aporte' ? 'Registrar aporte' : 'Registrar retiro'}
      </Boton>

      {aviso && (
        <Dialogo titulo="Saldo negativo" onCerrar={() => setAviso(null)} guardando={guardando}>
          <p className="text-sm text-gray-900">{aviso}</p>
          <Boton anchoCompleto variante="peligro" guardando={guardando} onClick={() => enviar(Number(monto.replace(/\D/g, '')))}>
            Confirmar igual
          </Boton>
          <Boton anchoCompleto variante="secundario" onClick={() => setAviso(null)}>
            Volver
          </Boton>
        </Dialogo>
      )}
    </div>
  );
};
