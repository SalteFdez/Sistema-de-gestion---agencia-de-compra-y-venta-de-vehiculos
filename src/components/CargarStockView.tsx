import React from 'react';
import { CargarStockForm } from './CargarStockForm';
import { Encabezado } from './ui/Encabezado';
import type { CargarStockParams, CargarStockResult } from '../lib/vehiculos/vehiculos-service';

export interface CargarStockViewProps {
  onVolver: () => void;
  onGuardar?: (params: CargarStockParams) => Promise<CargarStockResult>;
  /** Después de ver el código asignado: vuelve al listado de Vehículos */
  onVolverAlListado?: () => void;
  comprimirFoto?: (foto: Blob) => Promise<Blob>;
}

// Alta de un auto que ya estaba en el negocio. Se abre desde Más.
export const CargarStockView: React.FC<CargarStockViewProps> = ({
  onVolver,
  onGuardar,
  onVolverAlListado,
  comprimirFoto,
}) => (
  <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
    <Encabezado titulo="Cargar stock existente" onVolver={onVolver} />
    <CargarStockForm
      onGuardar={onGuardar}
      onVolverAlListado={onVolverAlListado}
      comprimirFoto={comprimirFoto}
    />
  </div>
);
