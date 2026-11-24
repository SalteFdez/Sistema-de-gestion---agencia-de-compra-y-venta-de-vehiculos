import React from 'react';
import { Encabezado } from './ui/Encabezado';
import { Boton } from './ui/Boton';

export interface MoverPlataViewProps {
  onPasar: () => void;
  onAporte: () => void;
  onRetiro: () => void;
  onVolver: () => void;
}

export const MoverPlataView: React.FC<MoverPlataViewProps> = ({ onPasar, onAporte, onRetiro, onVolver }) => {
  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
      <Encabezado titulo="Mover plata" onVolver={onVolver} />

      <div className="space-y-3">
        <Boton anchoCompleto variante="secundario" onClick={onPasar}>
          Pasar entre cuentas
        </Boton>
        <Boton anchoCompleto variante="secundario" onClick={onAporte}>
          Aporte de socio
        </Boton>
        <Boton anchoCompleto variante="secundario" onClick={onRetiro}>
          Retiro de socio
        </Boton>
      </div>
    </div>
  );
};
