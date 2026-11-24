/**
 * Celular argentino cargado como texto libre ("011 15-1234-5678", "+54 9 387 412 3456"):
 * queda en 10 dígitos, código de área + número, sin 54, sin 9, sin 0 y sin el 15.
 * Devuelve null si no da 10 dígitos (fijo, número corto, vacío): en ese caso no se ofrece WhatsApp.
 */
export function normalizarCelularAR(texto: string): string | null {
  let d = texto.replace(/\D/g, '');

  // Código de país: 54, y el 9 de celular que lo sigue
  if (d.startsWith('54')) {
    d = d.slice(2);
    if (d.startsWith('9')) d = d.slice(1);
  }
  // Troncal de larga distancia
  if (d.startsWith('0')) d = d.slice(1);

  // Con 12 dígitos, el "15" del celular va justo después del código de área (2, 3 o 4 dígitos)
  if (d.length === 12) {
    for (const area of [2, 3, 4]) {
      if (d.slice(area, area + 2) === '15') {
        d = d.slice(0, area) + d.slice(area + 2);
        break;
      }
    }
  }

  return d.length === 10 ? d : null;
}
