import React from 'react';

export type EstadoBadge = 'en_stock' | 'reservado' | 'vendido' | 'anulado';

const ETIQUETA: Record<EstadoBadge, string> = {
  en_stock: 'En stock',
  reservado: 'Reservado',
  vendido: 'Vendido',
  anulado: 'Anulado',
};

const COLOR: Record<EstadoBadge, string> = {
  en_stock: 'bg-green-50 text-green-700',
  reservado: 'bg-amber-50 text-amber-800',
  vendido: 'bg-gray-100 text-gray-700',
  anulado: 'bg-red-50 text-red-700',
};

export const BadgeEstado: React.FC<{ estado: EstadoBadge }> = ({ estado }) => (
  <span className={`inline-block text-xs font-medium rounded px-2 py-0.5 ${COLOR[estado]}`}>{ETIQUETA[estado]}</span>
);
