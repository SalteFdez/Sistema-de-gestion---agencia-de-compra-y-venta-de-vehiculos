import React, { useRef, useState } from 'react';
import type { VehiculoItem, AgregarFotoResult } from '../lib/vehiculos/vehiculos-service';
import { comprimirFotoEnNavegador } from '../lib/vehiculos/comprimir-foto';
import { coincideBusqueda } from '../lib/vehiculos/busqueda';
import { prepararArchivos, compartir } from '../lib/vehiculos/compartir-fotos';
import { Encabezado } from './ui/Encabezado';
import { Boton } from './ui/Boton';
import { Opciones } from './ui/Opciones';
import { VehiculoFila } from './VehiculoFila';
import { CompartirVehiculo } from './CompartirVehiculo';
import { textoDiasDeVehiculo } from '../lib/vehiculos/dias-en-stock';

/** Lo que devuelve el servicio al pedir las fotos vigentes de un auto para compartir */
export interface FotosParaCompartirRes {
  success: boolean;
  error?: string;
  codigo?: string;
  marca?: string;
  modelo?: string;
  urls: string[];
}
import { BadgeEstado } from './ui/BadgeEstado';
import { Cargando } from './ui/Cargando';
import { ErrorReintentar } from './ui/ErrorReintentar';

export interface VehiculosViewProps {
  vehiculos: VehiculoItem[];
  errorCarga?: boolean;
  /** Mientras llegan los vehículos: se muestra "Cargando…" en vez de una lista vacía */
  cargando?: boolean;
  onReintentar?: () => void;
  /** Solo si Vehículos se muestra como pantalla secundaria; como pestaña raíz no hay Volver */
  onVolver?: () => void;
  onAgregarFoto?: (id: string, foto: Blob) => Promise<AgregarFotoResult>;
  /** Pide las fotos vigentes de un auto (URLs firmadas, la principal primero) para compartirlas */
  onPedirFotos?: (id: string) => Promise<FotosParaCompartirRes>;
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

/** Forma del listado: tarjetas con foto grande, o filas compactas */
export type VistaListado = 'tarjetas' | 'lista';

// Lo elegido se recuerda en este celular. Si el navegador no deja usar localStorage
// (modo privado, datos bloqueados), no es un error: arranca en Tarjetas y no guarda.
const CLAVE_VISTA = 'vehiculos.vista';
const leerVista = (): VistaListado => {
  try {
    return localStorage.getItem(CLAVE_VISTA) === 'lista' ? 'lista' : 'tarjetas';
  } catch {
    return 'tarjetas';
  }
};
const guardarVista = (v: VistaListado) => {
  try {
    localStorage.setItem(CLAVE_VISTA, v);
  } catch {
    // Sin guardar: la elección vale para esta sesión
  }
};

export const VehiculosView: React.FC<VehiculosViewProps> = ({
  vehiculos,
  errorCarga = false,
  cargando = false,
  onReintentar,
  onVolver,
  onAgregarFoto,
  onPedirFotos,
  comprimirFoto = comprimirFotoEnNavegador,
  onAbrirDetalle,
  filtro,
  onCambiarFiltro,
  busqueda,
  onCambiarBusqueda,
}) => {
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
  const [vista, setVista] = useState<VistaListado>(leerVista);
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

  // Compartir fotos: estado por auto (preparando, o listo para el segundo toque) y aviso en pantalla
  const [compartiendo, setCompartiendo] = useState<Record<string, 'preparando' | 'listo'>>({});
  const [listasParaCompartir, setListasParaCompartir] = useState<Record<string, { archivos: File[]; texto: string }>>({});
  const [avisoCompartir, setAvisoCompartir] = useState<Record<string, string>>({});

  const fijarAviso = (id: string, aviso: string) => setAvisoCompartir((prev) => ({ ...prev, [id]: aviso }));
  const quitarEstado = (id: string) =>
    setCompartiendo((prev) => {
      const { [id]: _quitado, ...resto } = prev;
      return resto;
    });

  const compartirAuto = async (v: VehiculoItem) => {
    if (!onPedirFotos) return;
    fijarAviso(v.id, '');
    setCompartiendo((prev) => ({ ...prev, [v.id]: 'preparando' }));
    const texto = `${v.marca} ${v.modelo} ${v.anio}`;
    let quedaListo = false;
    try {
      const pedido = await onPedirFotos(v.id);
      if (!pedido.success) {
        fijarAviso(v.id, pedido.error ?? 'No se pudieron preparar las fotos. Podés intentar de nuevo.');
        return;
      }
      const total = pedido.urls.length;
      const { archivos, fallidas } = await prepararArchivos(pedido.urls, pedido.codigo ?? v.codigo);
      if (archivos.length === 0) {
        fijarAviso(v.id, `No se pudo preparar ${total === 1 ? 'la foto' : 'ninguna foto'}. Podés intentar de nuevo.`);
        return;
      }
      if (fallidas > 0) {
        fijarAviso(v.id, `No se pudo preparar ${fallidas} de ${total} fotos`);
      }
      const estado = await compartir(archivos, texto);
      if (estado === 'pendiente') {
        // El toque venció mientras se bajaban las fotos: el segundo toque las comparte sin esperar
        setListasParaCompartir((prev) => ({ ...prev, [v.id]: { archivos, texto } }));
        setCompartiendo((prev) => ({ ...prev, [v.id]: 'listo' }));
        quedaListo = true;
      }
    } catch {
      fijarAviso(v.id, 'No se pudo compartir. Podés intentar de nuevo.');
    } finally {
      if (!quedaListo) quitarEstado(v.id);
    }
  };

  // Segundo toque: comparte con las fotos ya armadas, directo desde el toque
  const compartirAhora = async (v: VehiculoItem) => {
    const lista = listasParaCompartir[v.id];
    if (!lista) return;
    const estado = await compartir(lista.archivos, lista.texto);
    if (estado !== 'pendiente') {
      setListasParaCompartir((prev) => {
        const { [v.id]: _quitada, ...resto } = prev;
        return resto;
      });
      quitarEstado(v.id);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
      <Encabezado titulo="Vehículos" onVolver={onVolver} />

      {errorCarga && (
        <div className="mb-4">
          <ErrorReintentar onReintentar={onReintentar ?? (() => undefined)} />
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
          className="w-full border border-gray-300 rounded-xl pl-9 pr-9 py-2.5 text-base bg-white"
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

      <div className="mb-4">
        <Opciones
          etiqueta="Vista del listado"
          columnas={2}
          opciones={[
            { id: 'tarjetas', nombre: 'Tarjetas' },
            { id: 'lista', nombre: 'Lista' },
          ]}
          seleccionada={vista}
          onElegir={(id) => {
            const elegida = id as VistaListado;
            setVista(elegida);
            guardarVista(elegida);
          }}
        />
      </div>

      {cargando && vehiculos.length === 0 && <Cargando />}

      {visibles.length === 0 && !(cargando && vehiculos.length === 0) && (
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

      {vista === 'lista' ? (
        <ul className="space-y-2">
          {visibles.map((v) => (
            <VehiculoFila
              key={v.id}
              vehiculo={v}
              fotoUrl={fotosNuevas[v.id] ?? v.fotoUrl}
              onAbrir={() => onAbrirDetalle?.(v.id)}
              compartir={
                v.fotoUrl ? (
                  <CompartirVehiculo
                    codigo={v.codigo}
                    modo="fila"
                    preparando={compartiendo[v.id] === 'preparando'}
                    listo={compartiendo[v.id] === 'listo' && !!listasParaCompartir[v.id]}
                    aviso={avisoCompartir[v.id]}
                    onCompartir={() => void compartirAuto(v)}
                    onCompartirAhora={() => void compartirAhora(v)}
                  />
                ) : undefined
              }
            />
          ))}
        </ul>
      ) : (
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
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <BadgeEstado estado={v.estado} />
                  {textoDiasDeVehiculo(v) && <span className="text-xs text-gray-600">{textoDiasDeVehiculo(v)}</span>}
                </div>
                {v.fotoUrl && (
                  <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                    <CompartirVehiculo
                      codigo={v.codigo}
                      modo="tarjeta"
                      preparando={compartiendo[v.id] === 'preparando'}
                      listo={compartiendo[v.id] === 'listo' && !!listasParaCompartir[v.id]}
                      aviso={avisoCompartir[v.id]}
                      onCompartir={() => void compartirAuto(v)}
                      onCompartirAhora={() => void compartirAhora(v)}
                    />
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
      )}
    </div>
  );
};
