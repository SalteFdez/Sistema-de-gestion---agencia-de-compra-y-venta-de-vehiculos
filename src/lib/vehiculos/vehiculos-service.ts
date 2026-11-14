import { formatMoney } from '../format/money';

export interface VehiculoItem {
  id: string;
  codigo: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string | null;
  estado: 'en_stock' | 'reservado' | 'vendido';
  fotoUrl: string | null;
  fechaIngreso: string;
}

export interface CargarStockParams {
  marca: string;
  modelo: string;
  anio: number;
  costo: number;
  color?: string;
  patente?: string;
  foto?: Blob;
}

export interface CargarStockResult {
  success: boolean;
  error?: string;
  codigo?: string;
  fechaIngreso?: string;
  avisoFoto?: string;
}

/** Consulta de lectura encadenable (eq / order); al await devuelve { data, error }. */
export interface Consulta extends PromiseLike<{ data: unknown; error: { message: string } | null }> {
  eq: (col: string, value: unknown) => Consulta;
  order: (col: string, options: { ascending: boolean }) => Consulta;
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
}

export interface VehiculosDbClient {
  rpc: (fn: string, params: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
  from: (table: string) => {
    select: (columns: string) => Consulta;
    insert: (values: Record<string, unknown>) => {
      select: () => {
        single: () => Promise<{
          data: unknown;
          error: { message: string } | null;
        }>;
      };
    };
    update: (values: Record<string, unknown>) => {
      eq: (col: string, value: string) => Promise<{
        error: { message: string } | null;
      }>;
    };
  };
}

export interface VehiculosStorageClient {
  from: (bucket: string) => {
    upload: (path: string, body: Blob, options: { contentType: string }) => Promise<{
      error: { message: string } | null;
    }>;
    createSignedUrls: (paths: string[], expiresIn: number) => Promise<{
      data: Array<{ path: string; signedUrl: string }> | null;
      error: { message: string } | null;
    }>;
  };
}

export interface PagoCompra {
  cuentaId: string;
  monto: number;
}

export interface RegistrarCompraParams {
  marca: string;
  modelo: string;
  anio: number;
  precio: number;
  color?: string;
  patente?: string;
  vendedor?: string;
  foto?: Blob;
  pagos: PagoCompra[];
}

export interface RegistrarCompraResult {
  success: boolean;
  error?: string;
  codigo?: string;
  id?: string;
  saldos?: Array<{ cuentaId: string; nombre: string; saldo: number }>;
  avisoFoto?: string;
}

export interface CuentaSaldo {
  cuentaId: string;
  nombre: string;
  saldo: number;
}

/**
 * Cuentas que quedarían con saldo negativo si se aplican los pagos propuestos.
 * Solo sirve para el aviso del cliente: la RPC no bloquea saldos negativos.
 */
export function cuentasQueQuedaranNegativas(
  pagos: PagoCompra[],
  saldos: CuentaSaldo[]
): Array<{ cuentaId: string; nombre: string; saldoResultante: number }> {
  return saldos
    .map((c) => {
      const pagado = pagos.filter((p) => p.cuentaId === c.cuentaId).reduce((acc, p) => acc + p.monto, 0);
      return { cuentaId: c.cuentaId, nombre: c.nombre, saldoResultante: c.saldo - pagado };
    })
    .filter((c) => c.saldoResultante < 0);
}

export interface PagoDetalle {
  cuentaNombre: string;
  monto: number;
}

export interface DetalleVehiculo {
  id: string;
  codigo: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string | null;
  patente: string | null;
  estado: VehiculoItem['estado'];
  origen: 'compra' | 'permuta' | 'inventario_inicial';
  fechaIngreso: string;
  vendedor: string | null;
  valorIngreso: number;
  gastosAsignados: number;
  costoReal: number;
  pagos: PagoDetalle[];
}

export interface ObtenerDetalleResult {
  success: boolean;
  error?: string;
  detalle?: DetalleVehiculo;
}

export interface AgregarFotoResult {
  success: boolean;
  fotoUrl?: string;
  error?: string;
}

const AVISO_FOTO_ALTA: Record<'subida' | 'ruta', string> = {
  subida: 'No se pudo subir la foto. El vehículo quedó guardado sin foto.',
  ruta: 'No se pudo guardar la foto. El vehículo quedó guardado sin foto.',
};

const AVISO_FOTO_AGREGAR: Record<'subida' | 'ruta', string> = {
  subida: 'No se pudo subir la foto. Podés intentar de nuevo.',
  ruta: 'No se pudo guardar la foto. Podés intentar de nuevo.',
};

export class VehiculosService {
  private db: VehiculosDbClient;
  private storage?: VehiculosStorageClient;

  constructor(db: VehiculosDbClient, storage?: VehiculosStorageClient) {
    this.db = db;
    this.storage = storage;
  }

  async registrarCompra(params: RegistrarCompraParams): Promise<RegistrarCompraResult> {
    if (!params.marca?.trim()) {
      return { success: false, error: 'La marca es obligatoria' };
    }
    const anioMaximo = new Date().getFullYear() + 1;
    if (params.anio < 1950 || params.anio > anioMaximo) {
      return { success: false, error: `El año tiene que estar entre 1950 y ${anioMaximo}` };
    }
    if (!(params.precio > 0)) {
      return { success: false, error: 'El precio tiene que ser mayor que 0' };
    }
    if (params.pagos.length === 0) {
      return { success: false, error: 'Tiene que haber al menos un pago' };
    }
    if (params.pagos.some((p) => !(p.monto > 0))) {
      return { success: false, error: 'Cada pago tiene que ser mayor que 0' };
    }
    const cuentasVistas = new Set(params.pagos.map((p) => p.cuentaId));
    if (cuentasVistas.size !== params.pagos.length) {
      return { success: false, error: 'No podés repetir una cuenta en los pagos' };
    }
    const suma = params.pagos.reduce((acc, p) => acc + p.monto, 0);
    if (suma !== params.precio) {
      const diferencia = Math.abs(params.precio - suma);
      const detalle = suma < params.precio
        ? `Faltan ${formatMoney(diferencia)}`
        : `Sobran ${formatMoney(diferencia)}`;
      return { success: false, error: `La suma de los pagos no coincide con el precio. ${detalle}` };
    }

    const { data, error } = await this.db.rpc('registrar_compra', {
      p_marca: params.marca.trim(),
      p_modelo: params.modelo.trim(),
      p_anio: params.anio,
      p_precio: params.precio,
      p_color: params.color?.trim() || null,
      p_patente: params.patente?.trim() || null,
      p_vendedor: params.vendedor?.trim() || null,
      p_pagos: params.pagos.map((p) => ({ cuenta_id: p.cuentaId, monto: p.monto })),
    });
    if (error) {
      return { success: false, error: error.message || 'No se pudo registrar la compra' };
    }

    const fila = data as {
      id: string;
      codigo: string;
      saldos: Array<{ cuenta_id: string; nombre: string; saldo: number | string }>;
    };
    const saldos = fila.saldos.map((s) => ({ cuentaId: s.cuenta_id, nombre: s.nombre, saldo: Number(s.saldo) || 0 }));

    // La foto va después de la RPC: si falla, la compra igual queda guardada.
    let avisoFoto: string | undefined;
    if (params.foto) {
      const foto = await this.agregarFoto(fila.id, params.foto);
      if (!foto.success) {
        avisoFoto = foto.error;
      }
    }

    return { success: true, id: fila.id, codigo: fila.codigo, saldos, avisoFoto };
  }

  async obtenerDetalle(id: string): Promise<ObtenerDetalleResult> {
    const { data, error } = await this.db
      .from('vehiculos')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      return { success: false, error: error.message };
    }
    if (!data) {
      return { success: false, error: 'No se encontró el vehículo' };
    }

    const fila = data as Record<string, unknown>;
    const { data: costo, error: errorCosto } = await this.db
      .from('v_costo_vehiculo')
      .select('*')
      .eq('vehiculo_id', id)
      .maybeSingle();
    if (errorCosto) {
      return { success: false, error: errorCosto.message };
    }
    const filaCosto = (costo ?? {}) as Record<string, unknown>;

    // Pagos: movimientos de compra no anulados, con el nombre de la cuenta; el monto sale en positivo
    const { data: movimientos, error: errorPagos } = await this.db
      .from('movimientos')
      .select('monto, cuenta:cuentas(nombre)')
      .eq('vehiculo_id', id)
      .eq('tipo', 'compra')
      .eq('anulado', false);
    if (errorPagos) {
      return { success: false, error: errorPagos.message };
    }
    const filasPago = (movimientos ?? []) as Array<{ monto: number | string; cuenta: { nombre: string } | null }>;
    const pagos: PagoDetalle[] = filasPago.map((m) => ({
      cuentaNombre: m.cuenta?.nombre ?? '',
      monto: Math.abs(Number(m.monto)) || 0,
    }));

    return {
      success: true,
      detalle: {
        id: String(fila.id),
        codigo: String(fila.codigo),
        marca: String(fila.marca),
        modelo: String(fila.modelo),
        anio: Number(fila.anio),
        color: (fila.color as string | null) ?? null,
        patente: (fila.patente as string | null) ?? null,
        estado: fila.estado as VehiculoItem['estado'],
        origen: fila.origen as DetalleVehiculo['origen'],
        fechaIngreso: String(fila.fecha_ingreso),
        vendedor: (fila.vendedor_texto as string | null) ?? null,
        valorIngreso: Number(filaCosto.valor_ingreso ?? fila.valor_ingreso) || 0,
        gastosAsignados: Number(filaCosto.gastos_asignados) || 0,
        costoReal: Number(filaCosto.costo_real ?? fila.valor_ingreso) || 0,
        pagos,
      },
    };
  }

  async obtenerInventario(): Promise<{ total: number; cantidad: number }> {
    const { data, error } = await this.db
      .from('v_inventario')
      .select('cantidad, total')
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    const fila = (data ?? { cantidad: 0, total: 0 }) as { cantidad: number | string; total: number | string };
    return { total: Number(fila.total) || 0, cantidad: Number(fila.cantidad) || 0 };
  }

  async listarVehiculos(): Promise<VehiculoItem[]> {
    const { data, error } = await this.db
      .from('vehiculos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      throw new Error(error.message);
    }
    const filas = (data ?? []) as Array<Record<string, unknown> & { foto_url?: string | null }>;

    const rutas = filas.map((f) => f.foto_url).filter((r): r is string => Boolean(r));
    let urlPorRuta = new Map<string, string>();
    if (rutas.length > 0 && this.storage) {
      const { data: firmadas } = await this.storage.from('vehiculos').createSignedUrls(rutas, 3600);
      urlPorRuta = new Map((firmadas ?? []).map((f) => [f.path, f.signedUrl]));
    }

    return filas.map((f): VehiculoItem => ({
      id: String(f.id),
      codigo: String(f.codigo),
      marca: String(f.marca),
      modelo: String(f.modelo),
      anio: Number(f.anio),
      color: (f.color as string | null) ?? null,
      estado: f.estado as VehiculoItem['estado'],
      fotoUrl: f.foto_url ? (urlPorRuta.get(f.foto_url) ?? null) : null,
      fechaIngreso: String(f.fecha_ingreso),
    }));
  }

  async cargarStock(params: CargarStockParams): Promise<CargarStockResult> {
    if (!params.marca?.trim()) {
      return { success: false, error: 'La marca es obligatoria' };
    }
    if (!params.modelo?.trim()) {
      return { success: false, error: 'El modelo es obligatorio' };
    }
    if (!params.anio) {
      return { success: false, error: 'El año es obligatorio' };
    }
    if (params.costo == null) {
      return { success: false, error: 'El costo es obligatorio (si no se sabe, cargá $ 0)' };
    }
    const anioMaximo = new Date().getFullYear() + 1;
    if (params.anio < 1950 || params.anio > anioMaximo) {
      return { success: false, error: `El año tiene que estar entre 1950 y ${anioMaximo}` };
    }
    if (params.costo < 0) {
      return { success: false, error: 'El costo no puede ser negativo' };
    }
    const { data, error } = await this.db
      .from('vehiculos')
      .insert({
        marca: params.marca.trim(),
        modelo: params.modelo.trim(),
        anio: params.anio,
        valor_ingreso: params.costo,
        color: params.color?.trim() || null,
        patente: params.patente?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message || 'Error al guardar el vehículo' };
    }

    const fila = data as { id: string; codigo: string; fecha_ingreso: string };

    if (params.foto && this.storage) {
      const { error } = await this.subirFotoYGuardarRuta(fila.id, params.foto);
      if (error) {
        return {
          success: true,
          codigo: fila.codigo,
          fechaIngreso: fila.fecha_ingreso,
          avisoFoto: AVISO_FOTO_ALTA[error],
        };
      }
    }

    return { success: true, codigo: fila.codigo, fechaIngreso: fila.fecha_ingreso };
  }

  /**
   * Sube la foto a `<id>/<uuid>.jpg` en el bucket y guarda la ruta en foto_url.
   * Devuelve la ruta y, si falló, en qué paso: 'subida' o 'ruta'. No lanza.
   */
  private async subirFotoYGuardarRuta(
    id: string,
    foto: Blob
  ): Promise<{ path: string; error: null } | { path: null; error: 'subida' | 'ruta' }> {
    const path = `${id}/${crypto.randomUUID()}.jpg`;
    const { error: errorSubida } = await this.storage!
      .from('vehiculos')
      .upload(path, foto, { contentType: 'image/jpeg' });

    if (errorSubida) {
      return { path: null, error: 'subida' };
    }

    const { error: errorRuta } = await this.db
      .from('vehiculos')
      .update({ foto_url: path })
      .eq('id', id);

    if (errorRuta) {
      return { path: null, error: 'ruta' };
    }

    return { path, error: null };
  }

  async agregarFoto(id: string, foto: Blob): Promise<AgregarFotoResult> {
    if (!this.storage) {
      return { success: false, error: 'No hay conexión para guardar la foto' };
    }
    const subida = await this.subirFotoYGuardarRuta(id, foto);
    if (subida.error) {
      return { success: false, error: AVISO_FOTO_AGREGAR[subida.error] };
    }
    const { data } = await this.storage.from('vehiculos').createSignedUrls([subida.path], 3600);
    return { success: true, fotoUrl: data?.[0]?.signedUrl };
  }
}
