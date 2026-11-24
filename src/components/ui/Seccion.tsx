import React from 'react';

export interface SeccionProps {
  titulo: string;
  /** Valor inicial: abierta o cerrada al montar. No se guarda: al volver a entrar vuelve a este valor. */
  abierta?: boolean;
  children: React.ReactNode;
}

/**
 * Bloque plegable sobre <details>/<summary>. El título es un h2 dentro del resumen:
 * teclado y lector de pantalla vienen de la propia etiqueta.
 */
export const Seccion: React.FC<SeccionProps> = ({ titulo, abierta = false, children }) => (
  <section className="border-b border-gray-200 last:border-b-0">
    <details open={abierta} className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 [&::-webkit-details-marker]:hidden">
        <h2 className="text-base font-semibold text-gray-900">{titulo}</h2>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-5 w-5 shrink-0 text-gray-500 transition-transform group-open:rotate-180"
        >
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="pb-3">{children}</div>
    </details>
  </section>
);
