import React, { useState } from 'react';
import type { CuentaItem, CuentasService, TipoCuenta } from '../lib/cuentas/cuentas-service';
import { formatMoney, parseMoneyInput } from '../lib/format/money';
import { Encabezado } from './ui/Encabezado';
import { Boton } from './ui/Boton';
import { InputMonto } from './ui/InputMonto';

export interface CuentasViewProps {
  cuentasIniciales: CuentaItem[];
  cuentasService: CuentasService;
  onVolver: () => void;
  onCuentaCreada?: () => void;
}

export const CuentasView: React.FC<CuentasViewProps> = ({
  cuentasIniciales,
  cuentasService,
  onVolver,
  onCuentaCreada,
}) => {
  const [cuentas, setCuentas] = useState<CuentaItem[]>(cuentasIniciales);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoCuenta>('efectivo');
  const [saldoStr, setSaldoStr] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setErrorMsg('El nombre no puede estar vacío');
      return;
    }

    // Validar nombre duplicado (case-insensitive) en la lista actual
    const yaExiste = cuentas.some(
      (c) => c.nombre.trim().toLowerCase() === nombreLimpio.toLowerCase()
    );
    if (yaExiste) {
      setErrorMsg('Ya existe una cuenta con ese nombre');
      return;
    }

    const saldoInicial = saldoStr ? parseMoneyInput(saldoStr) : 0;
    if (saldoInicial < 0) {
      setErrorMsg('El saldo inicial no puede ser negativo');
      return;
    }

    setGuardando(true);
    const res = await cuentasService.crearCuenta({
      nombre: nombreLimpio,
      tipo,
      saldoInicial,
    });
    setGuardando(false);

    if (res.success && res.cuenta) {
      setCuentas((prev) => [...prev, res.cuenta!]);
      setNombre('');
      setTipo('efectivo');
      setSaldoStr('');
      setErrorMsg(null);
      if (onCuentaCreada) {
        onCuentaCreada();
      }
    } else {
      setErrorMsg(res.error || 'Error al guardar la cuenta');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
      {/* Header */}
      <Encabezado titulo="Cuentas" onVolver={onVolver} />

      {/* Formulario de carga */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6">
        <h2 className="text-sm font-bold text-gray-800 mb-3">Nueva cuenta</h2>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2.5 mb-3">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="cuenta-nombre" className="block text-xs font-semibold text-gray-600 mb-1">
              Nombre de la cuenta
            </label>
            <input
              id="cuenta-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Caja efectivo, Banco Galicia"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-marca"
            />
          </div>

          <div>
            <label htmlFor="cuenta-tipo" className="block text-xs font-semibold text-gray-600 mb-1">
              Tipo de cuenta
            </label>
            <select
              id="cuenta-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoCuenta)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-marca bg-white"
            >
              <option value="efectivo">Efectivo</option>
              <option value="banco">Banco</option>
              <option value="billetera">Billetera virtual</option>
            </select>
          </div>

          <div>
            <label htmlFor="cuenta-saldo" className="block text-xs font-semibold text-gray-600 mb-1">
              Saldo inicial (ARS)
            </label>
            <InputMonto
              id="cuenta-saldo"
              valor={saldoStr === '' ? null : parseMoneyInput(saldoStr)}
              onChange={(n) => setSaldoStr(n === null ? '' : String(n))}
            />
          </div>

          <Boton anchoCompleto tipo="submit" guardando={guardando}>
            Guardar cuenta
          </Boton>
        </form>
      </section>

      {/* Lista de cuentas existentes */}
      <section className="flex-1">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Cuentas cargadas</h2>
        {cuentas.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">No hay cuentas cargadas.</p>
        ) : (
          <div className="space-y-2">
            {cuentas.map((c) => (
              <div
                key={c.id}
                className="bg-white border border-gray-200 rounded-xl p-3.5 flex justify-between items-center shadow-sm"
              >
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{c.nombre}</div>
                  <span className="text-[11px] text-gray-500 capitalize">{c.tipo}</span>
                </div>
                <div className={`text-sm font-bold whitespace-nowrap ${c.saldo < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatMoney(c.saldo)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
