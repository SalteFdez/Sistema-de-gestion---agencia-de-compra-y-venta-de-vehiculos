export interface CuotaPlan {
  numero: number;
  monto: number;
  /** AAAA-MM-DD */
  fechaVencimiento: string;
}

export interface DividirCuotasParams {
  monto: number;
  cantidad: number;
  /** AAAA-MM-DD */
  fechaPrimera: string;
}

const diasDelMes = (anio: number, mes: number): number => new Date(Date.UTC(anio, mes, 0)).getUTCDate();

const pad = (n: number, largo = 2): string => String(n).padStart(largo, '0');

// Vencimiento de la cuota n: la primera + (n − 1) meses, calculado siempre desde la primera.
// Si el día no existe en ese mes (31 en uno de 30), cae el último día del mes.
const vencimientoDe = (fechaPrimera: string, n: number): string => {
  const [anio, mes, dia] = fechaPrimera.split('-').map(Number);
  const total = anio * 12 + (mes - 1) + (n - 1);
  const anioNuevo = Math.floor(total / 12);
  const mesNuevo = (total % 12) + 1;
  const diaNuevo = Math.min(dia, diasDelMes(anioNuevo, mesNuevo));
  return `${pad(anioNuevo, 4)}-${pad(mesNuevo)}-${pad(diaNuevo)}`;
};

export function dividirCuotas({ monto, cantidad, fechaPrimera }: DividirCuotasParams): CuotaPlan[] {
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    throw new Error('La cantidad de cuotas tiene que ser al menos 1');
  }
  if (!(monto > 0)) {
    throw new Error('El monto tiene que ser mayor que 0');
  }

  // Cuotas iguales en entero; la diferencia va en la última
  const base = Math.floor(monto / cantidad);
  const ultima = monto - base * (cantidad - 1);

  return Array.from({ length: cantidad }, (_, i) => ({
    numero: i + 1,
    monto: i === cantidad - 1 ? ultima : base,
    fechaVencimiento: vencimientoDe(fechaPrimera, i + 1),
  }));
}
