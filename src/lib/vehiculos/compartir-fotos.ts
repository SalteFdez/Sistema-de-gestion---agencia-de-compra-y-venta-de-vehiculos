// Compartir y descargar las fotos de un auto. Las dependencias del navegador se pueden inyectar para testear.

export type EstadoCompartir = 'compartido' | 'cancelado' | 'descargado' | 'pendiente';

export interface NavegadorCompartir {
  canShare?: (datos: { files: File[] }) => boolean;
  share?: (datos: { files: File[]; text?: string }) => Promise<void>;
}

export interface DepsCompartir {
  nav?: NavegadorCompartir;
  descargar?: (archivo: File) => void;
}

/**
 * Baja cada foto (URL firmada) como JPEG con nombre MC-001-<n>.jpg, en el orden recibido.
 * Una foto que no se puede bajar no frena a las demás: se cuenta en `fallidas`.
 */
export async function prepararArchivos(
  urls: string[],
  codigo: string,
  fetchFn: typeof fetch = fetch,
  desde = 1
): Promise<{ archivos: File[]; fallidas: number }> {
  const resultados = await Promise.all(
    urls.map(async (url, i): Promise<File | null> => {
      try {
        const res = await fetchFn(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        return new File([blob], `${codigo}-${i + desde}.jpg`, { type: 'image/jpeg' });
      } catch {
        return null;
      }
    })
  );
  const archivos = resultados.filter((f): f is File => f !== null);
  return { archivos, fallidas: resultados.length - archivos.length };
}

/**
 * Abre el menú de compartir del celular con los archivos. Si el aparato no comparte archivos,
 * los descarga uno por uno. Cancelar el menú no es error. Si el navegador rechaza el compartir
 * porque el toque ya venció (NotAllowedError), devuelve 'pendiente': los archivos quedan listos
 * para un segundo toque.
 */
export async function compartir(
  archivos: File[],
  texto: string,
  deps: DepsCompartir = {}
): Promise<EstadoCompartir> {
  const nav = deps.nav ?? (typeof navigator !== 'undefined' ? (navigator as NavegadorCompartir) : undefined);
  const puedeCompartir = nav?.canShare?.({ files: archivos }) === true && typeof nav.share === 'function';

  if (puedeCompartir && nav) {
    try {
      await nav.share!({ files: archivos, text: texto });
      return 'compartido';
    } catch (error) {
      const nombre = (error as { name?: string }).name;
      if (nombre === 'AbortError') return 'cancelado';
      if (nombre === 'NotAllowedError') return 'pendiente';
      throw error;
    }
  }

  const bajar = deps.descargar ?? ((archivo: File) => descargar(archivo));
  archivos.forEach((archivo) => bajar(archivo));
  return 'descargado';
}

/** Baja un archivo con un enlace download sobre una URL de objeto (se libera después). */
export function descargar(archivo: File, deps: { url?: typeof URL } = {}): void {
  const u = deps.url ?? URL;
  const href = u.createObjectURL(archivo);
  const enlace = document.createElement('a');
  enlace.href = href;
  enlace.download = archivo.name;
  enlace.click();
  setTimeout(() => u.revokeObjectURL(href), 1000);
}
