export interface VehiculoBuscable {
  codigo: string;
  marca: string;
  modelo: string;
  patente?: string | null;
}

// Minúsculas y sin acentos
const normalizar = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Como normalizar, pero sin espacios ni guiones: "AB 123" y "ab-123" quedan como "ab123"
const compacto = (s: string): string => normalizar(s).replace(/[\s-]/g, '');

/**
 * Un auto coincide si cualquiera de sus campos contiene lo buscado.
 * Código y patente comparan sin espacios ni guiones, así "14", "014", "mc-014" encuentran MC-014.
 */
export function coincideBusqueda(v: VehiculoBuscable, texto: string): boolean {
  const buscado = normalizar(texto).trim();
  if (buscado === '') return true;

  const buscadoCompacto = compacto(texto);
  const campos = [v.codigo, v.marca, v.modelo, `${v.marca} ${v.modelo}`, v.patente ?? ''];
  return campos.some(
    (campo) => normalizar(campo).includes(buscado) || compacto(campo).includes(buscadoCompacto)
  );
}
