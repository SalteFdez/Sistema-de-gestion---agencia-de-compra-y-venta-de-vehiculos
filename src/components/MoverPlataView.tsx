import React from 'react';

export interface MoverPlataViewProps {
  onPasar: () => void;
  onAporte: () => void;
  onRetiro: () => void;
  onVolver: () => void;
}

export const MoverPlataView: React.FC<MoverPlataViewProps> = ({ onPasar, onAporte, onRetiro, onVolver }) => {
  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
      <header className="flex justify-between items-center py-3 mb-4">
        <h1 className="text-xl font-bold text-gray-900">Mover plata</h1>
        <button
          type="button"
          onClick={onVolver}
          className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2.5 py-1"
        >
          Volver
        </button>
      </header>

      <div className="space-y-3">
        <button
          type="button"
          onClick={onPasar}
          className="w-full py-4 bg-white border border-gray-300 text-gray-900 text-base font-semibold rounded-xl shadow-sm"
        >
          Pasar entre cuentas
        </button>
        <button
          type="button"
          onClick={onAporte}
          className="w-full py-4 bg-white border border-gray-300 text-gray-900 text-base font-semibold rounded-xl shadow-sm"
        >
          Aporte de socio
        </button>
        <button
          type="button"
          onClick={onRetiro}
          className="w-full py-4 bg-white border border-gray-300 text-gray-900 text-base font-semibold rounded-xl shadow-sm"
        >
          Retiro de socio
        </button>
      </div>
    </div>
  );
};
