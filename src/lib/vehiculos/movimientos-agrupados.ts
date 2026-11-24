import { hoyBuenosAires } from './financiacion';

export interface GrupoDia<T> {
  /** Fecha AAAA-MM-DD del día */
  fecha: string;
  /** "Hoy", "Ayer" o "lun 16/11" */
  etiqueta: string;
  items: T[];
}

const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

// Días desde una fecha AAAA-MM-DD, en UTC: la resta no depende de la zona horaria ni del horario de verano
const aDiasUTC = (iso: string): number => {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return Date.UTC(anio, mes - 1, dia) / 86400000;
};

/** "Hoy", "Ayer" o el día abreviado con la fecha ("lun 16/11"), respecto de `hoy` */
export function etiquetaDia(fecha: string, hoy: string): string {
  const diferencia = Math.round(aDiasUTC(hoy) - aDiasUTC(fecha));
  if (diferencia === 0) return 'Hoy';
  if (diferencia === 1) return 'Ayer';
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const diaSemana = DIAS_SEMANA[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];
  return `${diaSemana} ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`;
}

/**
 * Agrupa la lista en el orden en que llega: cada grupo es un tramo consecutivo del mismo día.
 * Si una fecha reaparece más abajo (la lista viene ordenada por carga), queda como otro grupo.
 * Si se pasan más páginas juntas, un día que sigue en la página nueva se une al grupo anterior.
 */
export function agruparPorDia<T extends { fecha: string }>(lista: T[], hoy: string = hoyBuenosAires()): GrupoDia<T>[] {
  const grupos: GrupoDia<T>[] = [];
  for (const item of lista) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.fecha === item.fecha) {
      ultimo.items.push(item);
    } else {
      grupos.push({ fecha: item.fecha, etiqueta: etiquetaDia(item.fecha, hoy), items: [item] });
    }
  }
  return grupos;
}
