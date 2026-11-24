import React from 'react';
import { Boton } from './ui/Boton';

export interface CompartirVehiculoProps {
  codigo: string;
  /** Tarjeta: botón con texto. Fila: ícono de 44 px */
  modo: 'tarjeta' | 'fila';
  /** Armando las fotos para compartir */
  preparando: boolean;
  /** Las fotos ya están armadas: el segundo toque comparte directo */
  listo: boolean;
  aviso?: string;
  onCompartir: () => void;
  onCompartirAhora: () => void;
}

const ICONO_COMPARTIR = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

/** Compartir fotos de un auto: el mismo flujo en la tarjeta (con texto) y en la fila (ícono) */
export const CompartirVehiculo: React.FC<CompartirVehiculoProps> = ({
  codigo,
  modo,
  preparando,
  listo,
  aviso,
  onCompartir,
  onCompartirAhora,
}) => {
  if (modo === 'fila') {
    return (
      <div className="flex flex-col items-center justify-center gap-1 shrink-0">
        <button
          type="button"
          aria-label={`Compartir fotos de ${codigo}`}
          disabled={preparando}
          onClick={listo ? onCompartirAhora : onCompartir}
          className="w-11 h-11 flex items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-800 disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
        {aviso && (
          <p role="alert" className="w-24 text-[10px] leading-tight text-red-700 text-center">
            {aviso}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      {listo ? (
        <Boton anchoCompleto onClick={onCompartirAhora}>
          Compartir ahora (fotos listas)
        </Boton>
      ) : (
        <Boton
          anchoCompleto
          variante="secundario"
          guardando={preparando}
          textoGuardando="Preparando…"
          onClick={onCompartir}
        >
          {ICONO_COMPARTIR}
          Compartir
        </Boton>
      )}
      {aviso && (
        <p role="alert" className="text-xs text-red-700 mt-1">
          {aviso}
        </p>
      )}
    </>
  );
};
