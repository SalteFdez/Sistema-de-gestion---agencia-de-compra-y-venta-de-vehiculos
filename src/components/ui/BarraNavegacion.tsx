import React from 'react';
import type { Pestana } from '../../lib/navegacion/useNavegacion';

export interface BarraNavegacionProps {
  pestanaActiva: Pestana;
  onSeleccionar: (pestana: Pestana) => void;
}

interface ItemPestana {
  id: Pestana;
  label: string;
  icono: React.ReactNode;
}

export const BarraNavegacion: React.FC<BarraNavegacionProps> = ({
  pestanaActiva,
  onSeleccionar,
}) => {
  const pestanas: ItemPestana[] = [
    {
      id: 'home',
      label: 'Inicio',
      icono: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      id: 'vehiculos',
      label: 'Vehículos',
      icono: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
          />
        </svg>
      ),
    },
    {
      id: 'movimientos',
      label: 'Movimientos',
      icono: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
    },
    {
      id: 'mas',
      label: 'Más',
      icono: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      ),
    },
  ];

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {pestanas.map((p) => {
          const activa = pestanaActiva === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSeleccionar(p.id)}
              aria-current={activa ? 'page' : undefined}
              className={`flex-1 min-h-[48px] py-1.5 px-2 flex flex-col items-center justify-center gap-1 transition-colors ${
                activa
                  ? 'text-marca font-semibold'
                  : 'text-gray-500 hover:text-gray-800 font-normal'
              }`}
            >
              <span className="flex items-center justify-center">{p.icono}</span>
              <span className="text-[11px] leading-tight">{p.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
