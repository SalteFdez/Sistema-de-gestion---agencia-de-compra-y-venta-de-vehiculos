import React from 'react';
import { formatMoney, parseMoneyInput } from '../../lib/format/money';

export interface InputMontoProps {
  /** Monto entero; null = sin valor (campo vacío) */
  valor: number | null;
  onChange: (valor: number | null) => void;
  'aria-label'?: string;
  id?: string;
  className?: string;
}

// Monto con miles en vivo: se escribe con teclado numérico y se guarda el entero.
export const InputMonto: React.FC<InputMontoProps> = ({ valor, onChange, className = '', ...resto }) => {
  const mostrado = valor === null ? '' : formatMoney(valor);

  const cambiar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitos = e.target.value.replace(/\D/g, '');
    onChange(digitos === '' ? null : parseMoneyInput(digitos));
  };

  return (
    <input
      {...resto}
      type="text"
      inputMode="numeric"
      value={mostrado}
      onChange={cambiar}
      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-base bg-white ${className}`}
    />
  );
};
