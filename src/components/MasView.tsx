import React, { useState } from 'react';
import { Dialogo } from './ui/Dialogo';
import { Boton } from './ui/Boton';

export interface MasViewProps {
  onBalances: () => void;
  onMoverPlata: () => void;
  onCuotas: () => void;
  onPendientes: () => void;
  onGanancia: () => void;
  onCuentas?: () => void;
  onChangePin: () => void;
  onBloquear: () => void;
  onDesvincular: () => void;
}

export const MasView: React.FC<MasViewProps> = ({
  onBalances,
  onMoverPlata,
  onCuotas,
  onPendientes,
  onGanancia,
  onCuentas,
  onChangePin,
  onBloquear,
  onDesvincular,
}) => {
  const [mostrarDialogoDesvincular, setMostrarDialogoDesvincular] = useState(false);

  const opciones = [
    { label: 'Balances', onClick: onBalances },
    { label: 'Mover plata', onClick: onMoverPlata },
    { label: 'Cuotas por cobrar', onClick: onCuotas },
    { label: 'Pendientes de asignar', onClick: onPendientes },
    { label: 'Ganancia por mes', onClick: onGanancia },
    ...(onCuentas ? [{ label: 'Cuentas', onClick: onCuentas }] : []),
    { label: 'Cambiar PIN', onClick: onChangePin },
    { label: 'Bloquear', onClick: onBloquear },
    {
      label: 'Desvincular dispositivo',
      onClick: () => setMostrarDialogoDesvincular(true),
      peligro: true,
    },
  ];

  return (
    <div className="w-full max-w-md mx-auto pb-20">
      <header className="py-4 mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Más</h1>
      </header>

      <div className="flex flex-col gap-2.5">
        {opciones.map((opcion) => (
          <button
            key={opcion.label}
            type="button"
            onClick={opcion.onClick}
            className={`w-full min-h-[52px] px-4 py-3 text-left font-medium rounded-xl border transition-colors flex items-center justify-between shadow-xs ${
              opcion.peligro
                ? 'bg-white border-red-200 text-red-600 hover:bg-red-50'
                : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="text-base">{opcion.label}</span>
            <span className={opcion.peligro ? 'text-red-400' : 'text-gray-400'} aria-hidden="true">
              ›
            </span>
          </button>
        ))}
      </div>

      {mostrarDialogoDesvincular && (
        <Dialogo
          titulo="¿Desvincular dispositivo?"
          onCerrar={() => setMostrarDialogoDesvincular(false)}
        >
          <p className="text-sm text-gray-600">
            Vas a tener que volver a ingresar el email y la contraseña.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Boton
              variante="peligro"
              anchoCompleto
              onClick={() => {
                setMostrarDialogoDesvincular(false);
                onDesvincular();
              }}
            >
              Desvincular
            </Boton>
            <Boton
              variante="secundario"
              anchoCompleto
              onClick={() => setMostrarDialogoDesvincular(false)}
            >
              Volver
            </Boton>
          </div>
        </Dialogo>
      )}
    </div>
  );
};
