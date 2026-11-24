import React from 'react';

export interface OpcionItem {
  id: string;
  nombre: string;
  /** Línea secundaria opcional, por ejemplo el saldo */
  secundario?: string;
  /** Si la línea secundaria es un saldo negativo, se ve en rojo */
  negativo?: boolean;
  /** Nombre accesible, si hace falta más contexto que el texto visible */
  ariaLabel?: string;
}

export interface OpcionesProps {
  /** Nombre del grupo (accesible) */
  etiqueta: string;
  opciones: OpcionItem[];
  /** Id de la opción elegida, o null si no hay ninguna */
  seleccionada: string | null;
  onElegir: (id: string) => void;
  columnas?: 1 | 2 | 3;
}

const CLASES_COLUMNAS: Record<1 | 2 | 3, string> = {
  1: 'space-y-2',
  2: 'grid grid-cols-2 gap-2',
  3: 'grid grid-cols-3 gap-2',
};

// Grupo de botones seleccionables: el elegido va en el color de marca.
export const Opciones: React.FC<OpcionesProps> = ({ etiqueta, opciones, seleccionada, onElegir, columnas = 1 }) => (
  <div role="group" aria-label={etiqueta} className={CLASES_COLUMNAS[columnas]}>
    {opciones.map((o) => {
      const elegida = seleccionada === o.id;
      return (
        <button
          key={o.id}
          type="button"
          aria-pressed={elegida}
          aria-label={o.ariaLabel}
          onClick={() => onElegir(o.id)}
          className={`min-h-11 px-3 py-2 text-left text-sm font-medium rounded-xl border transition duration-100 active:scale-[0.98] ${
            elegida ? 'bg-marca text-white border-marca' : 'bg-white text-gray-800 border-gray-300 active:bg-gray-100'
          }`}
        >
          <span className="block">{o.nombre}</span>
          {o.secundario !== undefined && (
            <span className={`block text-xs ${o.negativo ? 'text-red-600' : elegida ? 'opacity-90' : 'text-gray-500'}`}>
              {o.secundario}
            </span>
          )}
        </button>
      );
    })}
  </div>
);
