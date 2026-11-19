import React, { useRef, useState } from 'react';
import type {
  VehiculoItem,
  CargarStockParams,
  CargarStockResult,
  AgregarFotoResult,
} from '../lib/vehiculos/vehiculos-service';
import { comprimirFotoEnNavegador } from '../lib/vehiculos/comprimir-foto';
import { CargarStockForm } from './CargarStockForm';
import { coincideBusqueda } from '../lib/vehiculos/busqueda';

export interface VehiculosViewProps {
  vehiculos: VehiculoItem[];
  errorCarga?: boolean;
  onReintentar?: () => void;
  onVolver: () => void;
  onCargarStock?: (params: CargarStockParams) => Promise<CargarStockResult>;
  onAgregarFoto?: (id: string, foto: Blob) => Promise<AgregarFotoResult>;
  comprimirFoto?: (foto: Blob) => Promise<Blob>;
  onAbrirDetalle?: (id: string) => void;
  /** Filtro por estado; si lo maneja quien navega, se pasa así sobrevive al detalle */
  filtro?: FiltroEstado;
  onCambiarFiltro?: (filtro: FiltroEstado) => void;
  /** Texto buscado; si lo maneja quien navega, se pasa así sobrevive al detalle */
  busqueda?: string;
  onCambiarBusqueda?: (texto: string) => void;
}

export type FiltroEstado = 'stock' | 'vendidos' | 'todos';

const ETIQUETA_ESTADO: Record<VehiculoItem['estado'], string> = {
  en_stock: 'En stock',
  reservado: 'Reservado',
  vendido: 'Vendido',
};

export const VehiculosView: React.FC<VehiculosViewProps> = ({
  vehiculos,
  errorCarga = false,
  onReintentar,
  onVolver,
  onCargarStock,
  onAgregarFoto,
  comprimirFoto = comprimirFotoEnNavegador,
  onAbrirDetalle,
  filtro,
  onCambiarFiltro,
  busqueda,
  onCambiarBusqueda,
}) => {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtroInterno, setFiltroInterno] = useState<FiltroEstado>('stock');
  const filtroEstado = filtro ?? filtroInterno;
  const setFiltroEstado = (f: FiltroEstado) => {
    setFiltroInterno(f);
    onCambiarFiltro?.(f);
  };
  // Texto buscado: si lo maneja quien navega, sobrevive al detalle
  const [busquedaInterna, setBusquedaInterna] = useState<string>('');
  const busquedaActual = busqueda ?? busquedaInterna;
  const setBusqueda = (texto: string) => {
    setBusquedaInterna(texto);
    onCambiarBusqueda?.(texto);
  };

  // En stock incluye "reservado" (sigue sin vender); Vendidos solo "vendido"
  const porEstado = vehiculos.filter((v) => {
    if (filtroEstado === 'todos') return true;
    if (filtroEstado === 'vendidos') return v.estado === 'vendido';
    return v.estado === 'en_stock' || v.estado === 'reservado';
  });
  // La búsqueda se aplica sobre lo que deja el filtro de estado
  const visibles = porEstado.filter((v) => coincideBusqueda(v, busquedaActual));
  const etiquetaFiltro = filtroEstado === 'stock' ? 'En stock' : filtroEstado === 'vendidos' ? 'Vendidos' : 'Todos';
  // Fotos agregadas desde el listado, por id de vehículo (se muestran sin recargar la lista)
  const [fotosNuevas, setFotosNuevas] = useState<Record<string, string>>({});
  const [erroresFoto, setErroresFoto] = useState<Record<string, string>>({});
  const inputsFoto = useRef<Record<string, HTMLInputElement | null>>({});

  const agregarFoto = async (v: VehiculoItem, archivo: File) => {
    if (!onAgregarFoto) return;
    try {
      const comprimida = await comprimirFoto(archivo);
      const res = await onAgregarFoto(v.id, comprimida);
      if (res.success && res.fotoUrl) {
        const url = res.fotoUrl;
        setFotosNuevas((prev) => ({ ...prev, [v.id]: url }));
        setErroresFoto((prev) => ({ ...prev, [v.id]: '' }));
      } else {
        setErroresFoto((prev) => ({ ...prev, [v.id]: res.error ?? 'No se pudo guardar la foto. Podés intentar de nuevo.' }));
      }
    } catch {
      setErroresFoto((prev) => ({ ...prev, [v.id]: 'No se pudo preparar la foto. Podés intentar de nuevo.' }));
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
      <header className="flex justify-between items-center py-3 mb-4">
        <h1 className="text-xl font-bold text-gray-900">Vehículos</h1>
        <button
          type="button"
          onClick={onVolver}
          className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2.5 py-1"
        >
          Volver
        </button>
      </header>

      <div className="mb-4">
        {mostrarFormulario ? (
          <CargarStockForm
            onGuardar={onCargarStock}
            onVolverAlListado={() => setMostrarFormulario(false)}
            comprimirFoto={comprimirFoto}
          />
        ) : (
          <button
            type="button"
            onClick={() => setMostrarFormulario(true)}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-sm"
          >
            Cargar stock existente
          </button>
        )}
      </div>

      {errorCarga && (
        <div role="alert" className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-sm text-red-700 mb-3">No se pudieron cargar los vehículos.</p>
          <button
            type="button"
            onClick={onReintentar}
            className="py-2 px-4 bg-white border border-red-300 text-red-700 text-sm font-medium rounded-lg"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="relative mb-3">
        <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
        <input
          type="search"
          role="searchbox"
          aria-label="Buscar vehículos"
          placeholder="Buscar por código, marca, modelo o patente"
          value={busquedaActual}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full border border-gray-300 rounded-xl pl-9 pr-9 py-2.5 text-sm bg-white"
        />
        {busquedaActual !== '' && (
          <button
            type="button"
            aria-label="Borrar búsqueda"
            onClick={() => setBusqueda('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 px-2"
          >
            ×
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4" role="group" aria-label="Filtrar por estado">
        {(['En stock', 'Vendidos', 'Todos'] as const).map((etiqueta) => {
          const valor = etiqueta === 'En stock' ? 'stock' : etiqueta === 'Vendidos' ? 'vendidos' : 'todos';
          const activo = filtroEstado === valor;
          return (
            <button
              key={valor}
              type="button"
              aria-pressed={activo}
              onClick={() => setFiltroEstado(valor)}
              className={`py-2 text-sm font-medium rounded-xl border ${
                activo ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              {etiqueta}
            </button>
          );
        })}
      </div>

      {visibles.length === 0 && (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-6 text-center mb-4">
          <p className="text-sm text-gray-600">
            {busquedaActual.trim() !== ''
              ? `No hay vehículos que coincidan con '${busquedaActual.trim()}' en ${etiquetaFiltro}`
              : filtroEstado === 'vendidos'
                ? 'No hay vehículos vendidos todavía'
                : filtroEstado === 'stock'
                  ? 'No hay vehículos en stock'
                  : 'No hay vehículos cargados todavía'}
          </p>
          {busquedaActual.trim() !== '' && filtroEstado !== 'todos' && vehiculos.some((v) => coincideBusqueda(v, busquedaActual)) && (
            <button
              type="button"
              onClick={() => setFiltroEstado('todos')}
              className="mt-3 py-2 px-4 bg-white border border-gray-300 text-sm font-medium text-gray-800 rounded-lg"
            >
              Buscar en Todos
            </button>
          )}
        </div>
      )}

      <div className="space-y-3">
        {visibles.map((v) => {
          const fotoMostrada = fotosNuevas[v.id] ?? v.fotoUrl;
          return (
            <article
              key={v.id}
              onClick={() => onAbrirDetalle?.(v.id)}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm cursor-pointer"
            >
              {fotoMostrada ? (
                <img src={fotoMostrada} alt={`${v.marca} ${v.modelo}`} className="w-full h-48 object-cover" />
              ) : (
                <div
                  className="w-full h-48 flex flex-col items-center justify-center gap-2 bg-gray-100 px-4"
                  // El toque sobre el aviso de foto no debe abrir el detalle de la tarjeta
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => inputsFoto.current[v.id]?.click()}
                    className="py-2 px-4 bg-white border border-gray-300 text-sm text-gray-700 rounded-lg"
                  >
                    Sin foto · Agregar
                  </button>
                  {erroresFoto[v.id] && (
                    <p role="alert" className="text-xs text-red-700 text-center">
                      {erroresFoto[v.id]}
                    </p>
                  )}
                  <input
                    ref={(el) => {
                      inputsFoto.current[v.id] = el;
                    }}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    aria-label={`Elegir foto de ${v.codigo}`}
                    className="hidden"
                    onChange={(e) => {
                      const archivo = e.target.files?.[0];
                      if (archivo) void agregarFoto(v, archivo);
                    }}
                  />
                </div>
              )}
              <div className="p-4">
                <span className="text-xs font-bold text-blue-700">{v.codigo}</span>
                <h2 className="text-base font-semibold text-gray-900">
                  {v.marca} {v.modelo}
                </h2>
                <p className="text-sm text-gray-600">
                  {v.anio}
                  {v.color ? ` · ${v.color}` : ''}
                </p>
                <span className="inline-block mt-2 text-xs font-medium text-green-700 bg-green-50 rounded px-2 py-0.5">
                  {ETIQUETA_ESTADO[v.estado]}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
