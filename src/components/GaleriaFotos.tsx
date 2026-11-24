import React, { useRef, useState } from 'react';
import type { FotoVehiculo } from '../lib/vehiculos/vehiculos-service';
import { prepararArchivos, compartir, descargar } from '../lib/vehiculos/compartir-fotos';
import { Boton } from './ui/Boton';

export interface GaleriaFotosProps {
  fotos: FotoVehiculo[];
  anulado: boolean;
  /** Para compartir: código del auto (nombres MC-001-<n>.jpg) y el texto "Marca Modelo Año" */
  paraCompartir?: { codigo: string; texto: string };
  progreso?: { hecho: number; total: number };
  /** Error de la última acción (subida, principal o quitar), para mostrarlo en la galería */
  error?: string | null;
  onAgregar: (archivos: File[]) => void;
  onUsarComoPrincipal: (fotoId: string) => void;
  onQuitar: (fotoId: string) => void;
}

export const GaleriaFotos: React.FC<GaleriaFotosProps> = ({
  fotos,
  anulado,
  paraCompartir,
  progreso,
  error,
  onAgregar,
  onUsarComoPrincipal,
  onQuitar,
}) => {
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [confirmandoQuitar, setConfirmandoQuitar] = useState<boolean>(false);
  const [indiceVisor, setIndiceVisor] = useState<number | null>(null);
  // Compartir / descargar: cuál acción está preparando, aviso en pantalla y las fotos listas para el segundo toque
  const [preparando, setPreparando] = useState<'esta' | 'todas' | 'descargar' | null>(null);
  const [avisoCompartir, setAvisoCompartir] = useState<string | null>(null);
  const [listas, setListas] = useState<{ archivos: File[]; texto: string } | null>(null);
  const entrada = useRef<HTMLInputElement | null>(null);
  // Posición inicial del dedo al deslizar en el visor
  const inicioDedo = useRef<number | null>(null);

  if (fotos.length === 0) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center gap-2 bg-gray-100 px-4">
        <span className="text-sm text-gray-500">Sin foto</span>
        {!anulado && (
          <>
            <button
              type="button"
              onClick={() => entrada.current?.click()}
              className="py-2 px-4 bg-white border border-gray-300 text-sm text-gray-700 rounded-lg"
            >
              Agregar fotos
            </button>
            <input
              ref={entrada}
              type="file"
              accept="image/*"
              multiple
              aria-label="Elegir fotos"
              className="hidden"
              onChange={(e) => {
                const archivos = Array.from(e.target.files ?? []);
                if (archivos.length > 0) onAgregar(archivos);
              }}
            />
          </>
        )}
      </div>
    );
  }

  const principal = fotos.find((f) => f.esPrincipal) ?? fotos[0];
  const seleccionada = fotos.find((f) => f.id === seleccionadaId) ?? principal;
  const indiceSeleccionada = fotos.indexOf(seleccionada);

  // Arma los archivos de las fotos indicadas (cada una con su número en la galería)
  const armar = async (indices: number[]) => {
    const resultados = await Promise.all(
      indices.map((i) =>
        fotos[i].url
          ? prepararArchivos([fotos[i].url as string], paraCompartir?.codigo ?? '', undefined, i + 1)
          : Promise.resolve({ archivos: [] as File[], fallidas: 1 })
      )
    );
    return {
      archivos: resultados.flatMap((r) => r.archivos),
      fallidas: resultados.reduce((acc, r) => acc + r.fallidas, 0),
    };
  };

  const accion = async (indices: number[], modo: 'esta' | 'todas' | 'descargar') => {
    if (!paraCompartir) return;
    setAvisoCompartir(null);
    setListas(null);
    setPreparando(modo);
    try {
      const { archivos, fallidas } = await armar(indices);
      const total = indices.length;
      if (archivos.length === 0) {
        setAvisoCompartir(`No se pudo preparar ${total === 1 ? 'la foto' : 'ninguna foto'}. Podés intentar de nuevo.`);
        return;
      }
      if (fallidas > 0) setAvisoCompartir(`No se pudo preparar ${fallidas} de ${total} fotos`);
      if (modo === 'descargar') {
        archivos.forEach((archivo) => descargar(archivo));
        return;
      }
      const estado = await compartir(archivos, paraCompartir.texto);
      if (estado === 'pendiente') {
        // El toque venció mientras se bajaban las fotos: el segundo toque las comparte sin esperar
        setListas({ archivos, texto: paraCompartir.texto });
      }
    } catch {
      setAvisoCompartir('No se pudo compartir. Podés intentar de nuevo.');
    } finally {
      setPreparando(null);
    }
  };

  const compartirListas = async () => {
    if (!listas) return;
    const estado = await compartir(listas.archivos, listas.texto);
    if (estado !== 'pendiente') setListas(null);
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        aria-label="Ver foto grande"
        onClick={() => setIndiceVisor(indiceSeleccionada)}
        className="block w-full"
      >
        <img
          src={seleccionada.url ?? undefined}
          alt="Foto grande"
          className="w-full h-64 object-cover"
        />
      </button>

      {progreso && (
        <p className="text-sm text-gray-700">{`Subiendo ${progreso.hecho} de ${progreso.total}`}</p>
      )}

      {error && (
        <p role="alert" className="mx-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
          {error}
        </p>
      )}

      <div className="flex gap-2 overflow-x-auto px-3">
        {fotos.map((f, i) => (
          <button
            key={f.id}
            type="button"
            aria-label={`Foto ${i + 1}`}
            onClick={() => {
              setSeleccionadaId(f.id);
              setConfirmandoQuitar(false);
            }}
            className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 ${
              f.id === seleccionada.id ? 'border-blue-600' : 'border-transparent'
            }`}
          >
            {f.url && <img src={f.url} alt="" className="w-full h-full object-cover" />}
            {f.esPrincipal && (
              <span aria-label="Principal" className="absolute top-0 right-0 text-yellow-400 text-xs bg-black/50 px-1">
                ★
              </span>
            )}
          </button>
        ))}
      </div>

      {!anulado && (
        <div className="px-3 space-y-2">
          {paraCompartir && (
            <div className="space-y-2">
              {listas ? (
                <Boton anchoCompleto onClick={() => void compartirListas()}>
                  Compartir ahora (fotos listas)
                </Boton>
              ) : (
                <>
                  <Boton
                    anchoCompleto
                    guardando={preparando === 'todas'}
                    textoGuardando="Preparando…"
                    onClick={() => void accion(fotos.map((_, i) => i), 'todas')}
                  >
                    Compartir todas
                  </Boton>
                  <div className="grid grid-cols-2 gap-2">
                    <Boton
                      anchoCompleto
                      variante="secundario"
                      guardando={preparando === 'esta'}
                      textoGuardando="Preparando…"
                      onClick={() => void accion([indiceSeleccionada], 'esta')}
                    >
                      Compartir esta foto
                    </Boton>
                    <Boton
                      anchoCompleto
                      variante="secundario"
                      guardando={preparando === 'descargar'}
                      textoGuardando="Preparando…"
                      onClick={() => void accion([indiceSeleccionada], 'descargar')}
                    >
                      Descargar
                    </Boton>
                  </div>
                </>
              )}
              {avisoCompartir && (
                <p role="alert" className="text-sm text-red-700">
                  {avisoCompartir}
                </p>
              )}
            </div>
          )}
          <input
            ref={entrada}
            type="file"
            accept="image/*"
            multiple
            aria-label="Elegir fotos"
            className="hidden"
            onChange={(e) => {
              const archivos = Array.from(e.target.files ?? []);
              if (archivos.length > 0) onAgregar(archivos);
            }}
          />

          <Boton anchoCompleto variante="secundario" onClick={() => entrada.current?.click()}>
            Agregar fotos
          </Boton>

          {!seleccionada.esPrincipal && (
            <Boton anchoCompleto variante="secundario" onClick={() => onUsarComoPrincipal(seleccionada.id)}>
              Usar como principal
            </Boton>
          )}

          {!confirmandoQuitar ? (
            <Boton anchoCompleto variante="secundario" onClick={() => setConfirmandoQuitar(true)}>
              Quitar foto
            </Boton>
          ) : (
            <div role="group" aria-label="¿Seguro?" className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
              <p className="text-sm text-red-900">¿Seguro? La foto deja de verse en la galería. El archivo queda guardado.</p>
              <div className="flex gap-2">
                <Boton anchoCompleto variante="secundario" onClick={() => setConfirmandoQuitar(false)}>
                  Volver
                </Boton>
                <Boton
                  anchoCompleto
                  variante="peligro"
                  onClick={() => {
                    setConfirmandoQuitar(false);
                    onQuitar(seleccionada.id);
                  }}
                >
                  Sí, quitar
                </Boton>
              </div>
            </div>
          )}
        </div>
      )}

      {indiceVisor !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Fotos del vehículo"
          className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center p-4 z-50"
          onTouchStart={(e) => {
            inicioDedo.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const inicio = inicioDedo.current;
            inicioDedo.current = null;
            const fin = e.changedTouches[0]?.clientX;
            if (inicio === null || fin === undefined) return;
            // Un movimiento corto no cambia de foto
            const UMBRAL = 50;
            if (fin - inicio <= -UMBRAL) setIndiceVisor((indiceVisor + 1) % fotos.length);
            if (fin - inicio >= UMBRAL) setIndiceVisor((indiceVisor - 1 + fotos.length) % fotos.length);
          }}
        >
          <img
            src={fotos[indiceVisor].url ?? undefined}
            alt="Foto del vehículo"
            className="max-h-[80vh] max-w-full object-contain"
          />
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => setIndiceVisor((indiceVisor - 1 + fotos.length) % fotos.length)}
              className="py-2 px-4 bg-white text-gray-900 rounded-lg text-sm"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setIndiceVisor((indiceVisor + 1) % fotos.length)}
              className="py-2 px-4 bg-white text-gray-900 rounded-lg text-sm"
            >
              Siguiente
            </button>
            <button
              type="button"
              onClick={() => setIndiceVisor(null)}
              className="py-2 px-4 bg-white text-gray-900 rounded-lg text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
