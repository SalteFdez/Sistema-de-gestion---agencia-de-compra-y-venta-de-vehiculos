import React from 'react';

// Mientras llegan los datos: nunca "$ 0" ni una lista vacía
export const Cargando: React.FC = () => (
  <p role="status" className="text-sm text-gray-500 py-4 text-center">
    Cargando…
  </p>
);
