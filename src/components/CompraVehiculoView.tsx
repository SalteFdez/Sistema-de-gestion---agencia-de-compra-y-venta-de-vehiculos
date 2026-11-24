import React, { useState } from 'react';
import type { CuentaItem } from '../lib/cuentas/cuentas-service';
import { formatMoney, parseMoneyInput } from '../lib/format/money';
import { comprimirFotoEnNavegador } from '../lib/vehiculos/comprimir-foto';
import {
  cuentasQueQuedaranNegativas,
  type RegistrarCompraParams,
  type RegistrarCompraResult,
} from '../lib/vehiculos/vehiculos-service';
import { RepartoCuentas, type FilaReparto } from './RepartoCuentas';

export interface CompraVehiculoViewProps {
  cuentas: CuentaItem[];
  onVolver: () => void;
  onIrACuentas: () => void;
  onRegistrar?: (params: RegistrarCompraParams) => Promise<RegistrarCompraResult>;
  onVerVehiculos?: () => void;
  comprimirFoto?: (foto: Blob) => Promise<Blob>;
}

// Saldo negativo con el signo menos típico: "$ −500.000"
const formatoNegativo = (n: number): string => `$ −${formatMoney(Math.abs(n)).replace('$ ', '')}`;

export const CompraVehiculoView: React.FC<CompraVehiculoViewProps> = ({
  cuentas,
  onVolver,
  onIrACuentas,
  onRegistrar,
  onVerVehiculos,
  comprimirFoto = comprimirFotoEnNavegador,
}) => {
  const [marca, setMarca] = useState<string>('');
  const [color, setColor] = useState<string>('');
  const [patente, setPatente] = useState<string>('');
  const [vendedor, setVendedor] = useState<string>('');
  const [fotoElegida, setFotoElegida] = useState<File | null>(null);
  const [avisoNegativo, setAvisoNegativo] = useState<Array<{ nombre: string; saldoResultante: number }> | null>(null);
  const [confirmacion, setConfirmacion] = useState<{ codigo: string; resumen: string } | null>(null);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  // Mientras se guarda, el botón queda deshabilitado con "Guardando…" (evita el doble registro)
  const [guardando, setGuardando] = useState<boolean>(false);
  const [modelo, setModelo] = useState<string>('');
  const [anio, setAnio] = useState<string>('');
  const [precio, setPrecio] = useState<string>('');
  // Reparto entre cuentas: lo mantiene el componente RepartoCuentas
  const [pagos, setPagos] = useState<FilaReparto[]>([]);

  const precioNumero = parseMoneyInput(precio);
  const sumaPagos = pagos.reduce((acc, f) => acc + parseMoneyInput(f.monto), 0);
  const diferencia = precioNumero - sumaPagos;
  const anioNumero = parseInt(anio, 10);
  const anioMaximo = new Date().getFullYear() + 1;
  const anioFueraDeRango = anio !== '' && (anioNumero < 1950 || anioNumero > anioMaximo);
  const datosCompletos = marca.trim() !== '' && modelo.trim() !== '' && anioNumero > 0 && !anioFueraDeRango;
  // Solo cuenta como inválido un monto escrito que sea 0 o negativo (un monto vacío todavía no se evalúa)
  const montosValidos = !pagos.some((p) => p.monto.trim() !== '' && parseMoneyInput(p.monto) <= 0);
  const cuentasSinRepetir = new Set(pagos.map((p) => p.cuentaId)).size === pagos.length;
  const puedeConfirmar =
    datosCompletos && precioNumero > 0 && pagos.length > 0 && diferencia === 0 && montosValidos && cuentasSinRepetir;

  const registrar = async () => {
    if (!onRegistrar || guardando) return;
    setGuardando(true);
    // Si la foto no se puede preparar, la compra igual se guarda sin foto.
    let foto: Blob | undefined;
    if (fotoElegida) {
      try {
        foto = await comprimirFoto(fotoElegida);
      } catch {
        foto = undefined;
      }
    }

    let res: RegistrarCompraResult;
    try {
      res = await onRegistrar({
        marca: marca.trim(),
        modelo: modelo.trim(),
        anio: parseInt(anio, 10),
        precio: precioNumero,
        color,
        patente,
        vendedor,
        foto,
        pagos: pagos.map((p) => ({ cuentaId: p.cuentaId, monto: parseMoneyInput(p.monto) })),
      });
    } catch {
      res = { success: false, error: 'Sin conexión' };
    }
    setGuardando(false);
    setAvisoNegativo(null);
    if (res.success && res.codigo) {
      setErrorGuardado(null);
      const partes = pagos.map((p) => {
        const nombre = cuentas.find((c) => c.id === p.cuentaId)?.nombre ?? '';
        return `${formatMoney(parseMoneyInput(p.monto))} de ${nombre}`;
      });
      setConfirmacion({ codigo: res.codigo, resumen: `Salieron ${partes.join(' y ')}` });
    } else {
      // Nada quedó guardado: los datos y pagos siguen en pantalla para reintentar
      setErrorGuardado(`No se pudo registrar la compra. No se guardó nada. Podés reintentar. (${res.error ?? 'error'})`);
    }
  };

  const intentarConfirmar = () => {
    const negativas = cuentasQueQuedaranNegativas(
      pagos.map((p) => ({ cuentaId: p.cuentaId, monto: parseMoneyInput(p.monto) })),
      cuentas.map((c) => ({ cuentaId: c.id, nombre: c.nombre, saldo: c.saldo }))
    );
    if (negativas.length > 0) {
      setAvisoNegativo(negativas);
    } else {
      registrar();
    }
  };

  if (confirmacion) {
    return (
      <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-center mt-6">
          <span className="text-xs uppercase font-semibold text-gray-500 tracking-wider">Compra registrada</span>
          <div data-testid="codigo-compra" className="text-4xl font-extrabold text-blue-700 mt-2">
            {confirmacion.codigo}
          </div>
          <p className="text-sm text-gray-700 mt-4">{confirmacion.resumen}</p>
          <div className="flex flex-col gap-2 mt-6">
            <button
              type="button"
              onClick={onVerVehiculos}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-sm"
            >
              Ver vehículos
            </button>
            <button
              type="button"
              onClick={onVolver}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium text-sm rounded-xl"
            >
              Volver al inicio
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
      <header className="flex justify-between items-center py-3 mb-4">
        <h1 className="text-xl font-bold text-gray-900">Comprar vehículo</h1>
        <button
          type="button"
          onClick={onVolver}
          className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2.5 py-1"
        >
          Volver
        </button>
      </header>

      {cuentas.length === 0 && (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-600 mb-4">
            No hay cuentas cargadas todavía. Cargá una cuenta para poder pagar una compra.
          </p>
          <button
            type="button"
            onClick={onIrACuentas}
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-sm"
          >
            Cargar la primera cuenta
          </button>
        </div>
      )}

      {cuentas.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div>
            <label htmlFor="compra-marca" className="block text-xs font-semibold text-gray-700 mb-1">Marca</label>
            <input
              id="compra-marca"
              type="text"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="compra-modelo" className="block text-xs font-semibold text-gray-700 mb-1">Modelo</label>
            <input
              id="compra-modelo"
              type="text"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="compra-anio" className="block text-xs font-semibold text-gray-700 mb-1">Año</label>
            <input
              id="compra-anio"
              type="number"
              inputMode="numeric"
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="compra-color" className="block text-xs font-semibold text-gray-700 mb-1">Color (opcional)</label>
            <input
              id="compra-color"
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="compra-patente" className="block text-xs font-semibold text-gray-700 mb-1">Patente (opcional)</label>
            <input
              id="compra-patente"
              type="text"
              value={patente}
              onChange={(e) => setPatente(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="compra-vendedor" className="block text-xs font-semibold text-gray-700 mb-1">Vendedor (opcional)</label>
            <input
              id="compra-vendedor"
              type="text"
              value={vendedor}
              onChange={(e) => setVendedor(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="compra-foto" className="block text-xs font-semibold text-gray-700 mb-1">Foto (opcional)</label>
            <input
              id="compra-foto"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFotoElegida(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </div>

          <div>
            <label htmlFor="compra-precio" className="block text-xs font-semibold text-gray-700 mb-1">
              Precio de compra ($)
            </label>
            <input
              id="compra-precio"
              type="text"
              inputMode="numeric"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">¿De dónde salió la plata?</h2>
          <RepartoCuentas cuentas={cuentas} precio={precioNumero} onChange={setPagos} />

          {anioFueraDeRango && (
            <p className="text-sm text-red-700">El año tiene que estar entre 1950 y {anioMaximo}</p>
          )}

          {errorGuardado && (
            <p role="alert" className="text-sm text-red-700">
              {errorGuardado}
            </p>
          )}

          <button
            type="button"
            disabled={!puedeConfirmar || guardando}
            onClick={intentarConfirmar}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl shadow-sm"
          >
            {guardando ? 'Guardando…' : 'Confirmar'}
          </button>

          {avisoNegativo && (
            <div role="dialog" aria-modal="true" className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
              {avisoNegativo.map((c) => (
                <p key={c.nombre} className="text-sm text-amber-900">
                  La cuenta {c.nombre} va a quedar en {formatoNegativo(c.saldoResultante)}
                </p>
              ))}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAvisoNegativo(null)}
                  className="flex-1 py-2 bg-white border border-gray-300 text-gray-800 text-sm rounded-lg"
                >
                  Volver
                </button>
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => void registrar()}
                  className="flex-1 py-2 bg-amber-600 disabled:opacity-50 text-white text-sm rounded-lg"
                >
                  {guardando ? 'Guardando…' : 'Confirmar igual'}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
