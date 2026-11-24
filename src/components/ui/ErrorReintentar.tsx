import React from 'react';

export interface ErrorReintentarProps {
  onReintentar: () => void;
}

// Si la carga falla: se avisa y se puede volver a pedir
export const ErrorReintentar: React.FC<ErrorReintentarProps> = ({ onReintentar }) => (
  <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
    <p className="text-sm text-red-700 mb-3">No se pudo cargar.</p>
    <button
      type="button"
      onClick={onReintentar}
      className="min-h-11 px-4 bg-white border border-red-300 text-red-700 text-sm font-medium rounded-lg"
    >
      Reintentar
    </button>
  </div>
);
