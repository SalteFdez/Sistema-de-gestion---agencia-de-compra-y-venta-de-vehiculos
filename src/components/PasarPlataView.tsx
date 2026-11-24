import React, { useState } from 'react';
import { cuentasQueQuedaranNegativas } from '../lib/vehiculos/vehiculos-service';
import { formatMoney, parseMoneyInput } from '../lib/format/money';
import { Encabezado } from './ui/Encabezado';
import { Boton } from './ui/Boton';
import { InputMonto } from './ui/InputMonto';
import { Dialogo } from './ui/Dialogo';
import { Opciones } from './ui/Opciones';

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
  // Mientras se guarda, el botón queda deshabilitado con "Guardando…" (evita el doble registro)
  const [guardando, setGuardando] = useState<boolean>(false);

  // Si falla, se muestra el error y el formulario conserva todo lo cargado
  const enviar = async (montoNumero: number) => {
    if (guardando) return;
    setGuardando(true);
    const res = await onRegistrar({
      origenId: origenId ?? '',
      destinoId: destinoId ?? '',
      monto: montoNumero,
      descripcion: descripcion.trim() || undefined,
    });
    setGuardando(false);
    setAviso(null);
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
      setAviso(`La cuenta ${n.nombre} va a quedar en ${formatMoney(n.saldoResultante)}`);
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
        <Boton anchoCompleto variante="secundario" onClick={onVolver}>
          Listo
        </Boton>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
      <Encabezado titulo="Pasar entre cuentas" onVolver={onVolver} />

      <div className="mb-4">
        <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Desde</h2>
        <Opciones
          etiqueta="Desde"
          opciones={cuentas.map((c) => ({ id: c.id, nombre: c.nombre, secundario: formatMoney(c.saldo), negativo: c.saldo < 0 }))}
          seleccionada={origenId}
          onElegir={setOrigenId}
        />
      </div>

      <div className="mb-4">
        <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Hacia</h2>
        <Opciones
          etiqueta="Hacia"
          opciones={cuentas
            .filter((c) => c.id !== origenId)
            .map((c) => ({ id: c.id, nombre: c.nombre, secundario: formatMoney(c.saldo), negativo: c.saldo < 0 }))}
          seleccionada={destinoId}
          onElegir={setDestinoId}
        />
      </div>

      <div className="mb-3">
        <label htmlFor="pase-monto" className="block text-xs font-semibold text-gray-700 mb-1">
          Monto
        </label>
        <InputMonto
          id="pase-monto"
          valor={monto === '' ? null : parseMoneyInput(monto)}
          onChange={(n) => setMonto(n === null ? '' : String(n))}
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
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base bg-white"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700 mb-3">
          {error}
        </p>
      )}

      <Boton anchoCompleto guardando={guardando} onClick={confirmar}>
        Pasar plata
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
