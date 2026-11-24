import React from 'react';
import { formatMoney } from '../lib/format/money';
import { Cargando } from './ui/Cargando';
import { ErrorReintentar } from './ui/ErrorReintentar';

export interface InicioViewProps {
  nombreSocio: string;
  totalDisponible: number;
  cargandoPlata?: boolean;
  errorPlata?: boolean;
  onReintentarPlata?: () => void;
  cuotasVencidas?: number;
  pendientesTotal?: number;
  onIrABalances: () => void;
  onIrACuotas: () => void;
  onIrAPendientes: () => void;
  onComprar: () => void;
  onVender: () => void;
  onGasto: () => void;
  onIngreso: () => void;
}

export const InicioView: React.FC<InicioViewProps> = ({
  nombreSocio,
  totalDisponible,
  cargandoPlata = false,
  errorPlata = false,
  onReintentarPlata,
  cuotasVencidas = 0,
  pendientesTotal = 0,
  onIrABalances,
  onIrACuotas,
  onIrAPendientes,
  onComprar,
  onVender,
  onGasto,
  onIngreso,
}) => {
  return (
    <div className="w-full max-w-md mx-auto pb-20">
      {/* Saludo superior */}
      <header className="py-3 mb-2">
        <h1 className="text-xl font-bold text-gray-900">Hola, {nombreSocio}</h1>
      </header>

      {/* Tarjeta Dinero disponible */}
      <div className="mb-4">
        {errorPlata ? (
          <div className="w-full bg-white rounded-2xl p-5 border border-gray-200 shadow-sm text-left">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Dinero disponible
              </span>
            </div>
            <div className="py-2">
              <ErrorReintentar onReintentar={onReintentarPlata || (() => {})} />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onIrABalances}
            aria-label="Dinero disponible · Balances"
            className="w-full bg-white rounded-2xl p-5 border border-gray-200 shadow-sm text-left hover:border-gray-300 transition-colors"
          >
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Dinero disponible
              </span>
              <span className="text-xs text-marca font-medium">Ver balances ›</span>
            </div>

            {cargandoPlata ? (
              <div className="py-2">
                <Cargando />
              </div>
            ) : (
              <div
                className={`text-3xl font-extrabold tracking-tight ${
                  totalDisponible < 0 ? 'text-red-600' : 'text-gray-900'
                }`}
              >
                {formatMoney(totalDisponible)}
              </div>
            )}
          </button>
        )}

        {/* Chips de avisos */}
        {(cuotasVencidas > 0 || pendientesTotal > 0) && (
          <div className="flex flex-wrap gap-2 mt-2.5">
            {cuotasVencidas > 0 && (
              <button
                type="button"
                onClick={onIrACuotas}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
              >
                <span className="sr-only">Cuotas por cobrar · {cuotasVencidas} vencida{cuotasVencidas === 1 ? '' : 's'} · </span>
                <span aria-hidden="true">⚠️ </span>
                <span>{cuotasVencidas} cuota{cuotasVencidas === 1 ? '' : 's'} vencida{cuotasVencidas === 1 ? '' : 's'}</span>
              </button>
            )}

            {pendientesTotal > 0 && (
              <button
                type="button"
                onClick={onIrAPendientes}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
              >
                <span className="sr-only">Pendientes de asignar · </span>
                <span>⏳ {formatMoney(pendientesTotal)} sin asignar</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grilla 2x2 de acciones principales */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <button
          type="button"
          onClick={onComprar}
          className="min-h-[100px] p-4 bg-marca hover:bg-marca-oscuro text-white font-bold text-lg rounded-2xl shadow-sm transition-colors flex flex-col items-center justify-center gap-1.5"
        >
          <span className="text-2xl" aria-hidden="true">🚗</span>
          <span>Comprar<span className="sr-only"> vehículo</span></span>
        </button>

        <button
          type="button"
          onClick={onVender}
          className="min-h-[100px] p-4 bg-marca hover:bg-marca-oscuro text-white font-bold text-lg rounded-2xl shadow-sm transition-colors flex flex-col items-center justify-center gap-1.5"
        >
          <span className="text-2xl" aria-hidden="true">🤝</span>
          <span>Vender<span className="sr-only"> vehículo</span></span>
        </button>

        <button
          type="button"
          onClick={onGasto}
          className="min-h-[100px] p-4 bg-marca hover:bg-marca-oscuro text-white font-bold text-lg rounded-2xl shadow-sm transition-colors flex flex-col items-center justify-center gap-1.5"
        >
          <span className="text-2xl" aria-hidden="true">💸</span>
          <span><span className="sr-only">Registrar </span>Gasto</span>
        </button>

        <button
          type="button"
          onClick={onIngreso}
          className="min-h-[100px] p-4 bg-marca hover:bg-marca-oscuro text-white font-bold text-lg rounded-2xl shadow-sm transition-colors flex flex-col items-center justify-center gap-1.5"
        >
          <span className="text-2xl" aria-hidden="true">💰</span>
          <span><span className="sr-only">Registrar </span>Ingreso</span>
        </button>
      </div>
    </div>
  );
};
