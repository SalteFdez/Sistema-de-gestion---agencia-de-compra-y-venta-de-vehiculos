export const LADO_MAXIMO_PX = 1280;

/**
 * Comprime la foto en el navegador (celular): lado mayor a 1280 px, JPEG calidad 0,8.
 * No es testeable en Node (usa canvas): se verifica a mano en Android e iPhone.
 */
export async function comprimirFotoEnNavegador(foto: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(foto);
  try {
    const { ancho, alto } = calcularTamanoRedimensionado(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('El navegador no permite procesar la imagen');
    }
    ctx.drawImage(bitmap, 0, 0, ancho, alto);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.8)
    );
    if (!blob) {
      throw new Error('No se pudo generar la imagen comprimida');
    }
    return blob;
  } finally {
    bitmap.close();
  }
}

export function calcularTamanoRedimensionado(
  ancho: number,
  alto: number
): { ancho: number; alto: number } {
  const ladoMayor = Math.max(ancho, alto);
  if (ladoMayor <= LADO_MAXIMO_PX) {
    return { ancho, alto };
  }
  const escala = LADO_MAXIMO_PX / ladoMayor;
  return {
    ancho: Math.round(ancho * escala),
    alto: Math.round(alto * escala),
  };
}
