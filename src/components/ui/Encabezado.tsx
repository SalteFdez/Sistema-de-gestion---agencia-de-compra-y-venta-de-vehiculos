import React from 'react';

export interface EncabezadoProps {
  titulo: string;
  onVolver: () => void;
}

// Título de la pantalla con un Volver grande (área táctil de 44 px)
export const Encabezado: React.FC<EncabezadoProps> = ({ titulo, onVolver }) => (
  <header className="flex justify-between items-center py-3 mb-4">
    <h1 className="text-xl font-bold text-gray-900">{titulo}</h1>
    <button
      type="button"
      onClick={onVolver}
      className="min-h-11 min-w-11 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg"
    >
      Volver
    </button>
  </header>
);
