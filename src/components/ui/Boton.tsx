import React from 'react';

export type VarianteBoton = 'primario' | 'secundario' | 'peligro' | 'peligroBorde';

export interface BotonProps {
  variante?: VarianteBoton;
  /** Ancho completo del contenedor */
  anchoCompleto?: boolean;
  /** Mientras se guarda: deshabilitado y con "Guardando…" (evita el doble toque) */
  guardando?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  /** "submit" para enviar un formulario */
  tipo?: 'button' | 'submit';
  /** Texto mientras se guarda (por defecto "Guardando…"; por ejemplo "Preparando…" al compartir) */
  textoGuardando?: string;
  children: React.ReactNode;
}

const CLASES_VARIANTE: Record<VarianteBoton, string> = {
  primario: 'bg-marca hover:bg-marca-oscuro text-white border border-transparent',
  secundario: 'bg-white text-gray-800 border border-gray-300',
  peligro: 'bg-red-600 hover:bg-red-700 text-white border border-transparent',
  // Acción destructiva que no compite con la info: borde y texto rojos sobre blanco
  peligroBorde: 'bg-white hover:bg-red-50 text-red-600 border border-red-300',
};

export const Boton: React.FC<BotonProps> = ({
  variante = 'primario',
  anchoCompleto = false,
  guardando = false,
  disabled = false,
  onClick,
  tipo = 'button',
  textoGuardando = 'Guardando…',
  children,
}) => (
  <button
    type={tipo}
    disabled={disabled || guardando}
    onClick={guardando ? undefined : onClick}
    className={`min-h-11 px-4 text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed ${CLASES_VARIANTE[variante]} ${anchoCompleto ? 'w-full' : ''}`}
  >
    {guardando ? textoGuardando : children}
  </button>
);
