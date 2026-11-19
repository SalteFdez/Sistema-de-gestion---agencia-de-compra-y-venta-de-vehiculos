import React, { useRef, useState } from 'react';
import type { FotoVehiculo } from '../lib/vehiculos/vehiculos-service';

export interface GaleriaFotosProps {
  fotos: FotoVehiculo[];
  anulado: boolean;
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
  progreso,
  error,
  onAgregar,
  onUsarComoPrincipal,
  onQuitar,
}) => {
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [confirmandoQuitar, setConfirmandoQuitar] = useState<boolean>(false);
  const [indiceVisor, setIndiceVisor] = useState<number | null>(null);
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
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            className="w-full py-2 bg-white border border-gray-300 text-gray-800 text-sm font-medium rounded-lg"
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

          {!seleccionada.esPrincipal && (
            <button
              type="button"
              onClick={() => onUsarComoPrincipal(seleccionada.id)}
              className="w-full py-2 bg-white border border-gray-300 text-gray-800 text-sm font-medium rounded-lg"
            >
              Usar como principal
            </button>
          )}

          {!confirmandoQuitar ? (
            <button
              type="button"
              onClick={() => setConfirmandoQuitar(true)}
              className="w-full py-2 bg-white border border-red-300 text-red-700 text-sm font-medium rounded-lg"
            >
              Quitar foto
            </button>
          ) : (
            <div role="group" aria-label="¿Seguro?" className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
              <p className="text-sm text-red-900">¿Seguro? La foto deja de verse en la galería. El archivo queda guardado.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmandoQuitar(false)}
                  className="flex-1 py-2 bg-white border border-gray-300 text-gray-800 text-sm rounded-lg"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmandoQuitar(false);
                    onQuitar(seleccionada.id);
                  }}
                  className="flex-1 py-2 bg-red-600 text-white text-sm rounded-lg"
                >
                  Sí, quitar
                </button>
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
