import React, { useState } from 'react';
import type { CuotaPorCobrar } from '../lib/vehiculos/vehiculos-service';
import { formatMoney, parseMoneyInput } from '../lib/format/money';
import { Encabezado } from './ui/Encabezado';
import { Boton } from './ui/Boton';
import { InputMonto } from './ui/InputMonto';
import { Opciones } from './ui/Opciones';

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
        <Boton anchoCompleto variante="secundario" onClick={onVolver}>
          Listo
        </Boton>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
      <Encabezado titulo={`Cobrar cuota ${cuota.numero} de ${cuota.totalCuotas}`} onVolver={onVolver} />

      <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
        <p className="text-sm text-gray-800">{`${cuota.vehiculoCodigo} · ${cuota.comprador ?? 'Sin comprador'}`}</p>
        <p className="text-sm text-gray-700">{`Falta ${formatMoney(cuota.saldo)}`}</p>

        <div>
          <label htmlFor="cobro-monto" className="block text-xs font-semibold text-gray-700 mb-1">Monto a cobrar ($)</label>
          <InputMonto
            id="cobro-monto"
            aria-label="Monto a cobrar ($)"
            valor={monto === '' ? null : parseMoneyInput(monto)}
            onChange={(n) => setMonto(n === null ? '' : String(n))}
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
          <Opciones
            etiqueta="¿En qué cuenta entró?"
            columnas={2}
            opciones={cuentas.map((c) => ({ id: c.id, nombre: c.nombre, secundario: formatMoney(c.saldo), negativo: c.saldo < 0 }))}
            seleccionada={cuentaId}
            onElegir={setCuentaId}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <Boton anchoCompleto disabled={!valido} guardando={guardando} onClick={() => void confirmar()}>
          Confirmar cobro
        </Boton>
      </section>
    </div>
  );
};
