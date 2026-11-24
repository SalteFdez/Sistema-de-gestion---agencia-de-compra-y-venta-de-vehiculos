import React, { useEffect, useRef } from 'react';

export interface DialogoProps {
  titulo: string;
  onCerrar: () => void;
  /** Mientras guarda, el fondo y Escape no cierran */
  guardando?: boolean;
  children: React.ReactNode;
}

// Hoja desde abajo con fondo oscuro. El foco va al primer botón; Escape y el fondo cierran.
export const Dialogo: React.FC<DialogoProps> = ({ titulo, onCerrar, guardando = false, children }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector('button')?.focus();
  }, []);

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !guardando) onCerrar();
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [onCerrar, guardando]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        data-testid="fondo"
        aria-hidden="true"
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!guardando) onCerrar();
        }}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="relative w-full max-w-md bg-white rounded-t-2xl p-4 space-y-3 shadow-xl"
      >
        <h2 className="text-base font-semibold text-gray-900">{titulo}</h2>
        {children}
      </div>
    </div>
  );
};
