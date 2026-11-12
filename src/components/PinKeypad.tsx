import React, { useState, useEffect } from 'react';

export interface PinKeypadProps {
  onComplete: (pin: string) => void;
  isLocked?: boolean;
  remainingSeconds?: number;
  error?: boolean;
  onForgotPin?: () => void;
}

export const PinKeypad: React.FC<PinKeypadProps> = ({
  onComplete,
  isLocked = false,
  remainingSeconds = 0,
  error = false,
  onForgotPin,
}) => {
  const [digits, setDigits] = useState<string[]>([]);

  // Limpiar dígitos si entra en error
  useEffect(() => {
    if (error) {
      setDigits([]);
    }
  }, [error]);

  const handleDigit = (digit: string) => {
    if (isLocked || digits.length >= 4) return;
    const next = [...digits, digit];
    setDigits(next);
    if (next.length === 4) {
      onComplete(next.join(''));
    }
  };

  const handleDelete = () => {
    if (isLocked || digits.length === 0) return;
    setDigits(digits.slice(0, -1));
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xs mx-auto p-4 select-none">
      {/* 4 Círculos indicadores */}
      <div
        data-testid="pin-circles"
        className={`flex items-center justify-center gap-4 my-6 ${error ? 'shake animate-shake' : ''}`}
      >
        {[0, 1, 2, 3].map((idx) => {
          const isFilled = idx < digits.length;
          return (
            <div
              key={idx}
              data-testid="pin-circle"
              className={`w-4 h-4 rounded-full border-2 transition-colors duration-150 ${
                isFilled
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-transparent border-gray-400'
              }`}
            />
          );
        })}
      </div>

      {/* Aviso de bloqueo */}
      {isLocked && (
        <div className="text-red-600 font-medium text-center text-sm mb-4">
          Teclado bloqueado. Reintentá en {remainingSeconds} segundos.
        </div>
      )}

      {/* Grilla numérica 3x4 */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <button
            key={num}
            type="button"
            disabled={isLocked}
            onClick={() => handleDigit(num)}
            className="h-16 text-2xl font-semibold bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center shadow-sm"
          >
            {num}
          </button>
        ))}

        {/* Fila inferior: vacío / olvidé, 0, borrar */}
        <div className="flex items-center justify-center">
          {onForgotPin ? (
            <button
              type="button"
              onClick={onForgotPin}
              className="text-xs text-blue-600 hover:underline text-center font-medium"
            >
              Me olvidé
            </button>
          ) : null}
        </div>

        <button
          type="button"
          disabled={isLocked}
          onClick={() => handleDigit('0')}
          className="h-16 text-2xl font-semibold bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center shadow-sm"
        >
          0
        </button>

        <button
          type="button"
          aria-label="Borrar"
          disabled={isLocked || digits.length === 0}
          onClick={handleDelete}
          className="h-16 text-xl font-medium bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center shadow-sm"
        >
          ⌫
        </button>
      </div>

      {onForgotPin && (
        <button
          type="button"
          onClick={onForgotPin}
          className="mt-6 text-sm text-gray-600 hover:text-gray-900 underline"
        >
          Me olvidé el PIN
        </button>
      )}
    </div>
  );
};
