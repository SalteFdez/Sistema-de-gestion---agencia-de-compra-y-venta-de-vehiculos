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
  in: (col: string, values: unknown[]) => Promise<{ data: unknown; error: { message: string } | null }>;
  order: (col: string, options: { ascending: boolean }) => Consulta;
  range: (desde: number, hasta: number) => Consulta;
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

export interface CobroVenta {
  cuentaId: string;
  monto: number;
}

export interface RegistrarVentaParams {
  vehiculoId: string;
  precio: number;
  comprador?: string;
  cobros: CobroVenta[];
}

export interface RegistrarVentaResult {
  success: boolean;
  error?: string;
  ventaId?: string;
  codigo?: string;
  ganancia?: number;
}

export interface MovimientoItem {
  id: string;
  fecha: string;
  tipo: string;
  monto: number;
  descripcion: string | null;
  cuentaNombre: string;
  vehiculoId: string | null;
  vehiculoCodigo: string | null;
  categoriaNombre: string | null;
  creadoPor: string;
  anulado: boolean;
  anuladoPor: string | null;
  /** Momento de la anulación (timestamptz, ISO) */
  anuladoEl: string | null;
  motivoAnulacion: string | null;
  gastoId: string | null;
  ventaId: string | null;
  /** Agrupa las dos patas de un pase */
  transferenciaId?: string | null;
  /** Para un pase: la cuenta de la otra pata ("Pase a Banco") */
  cuentaContraparte?: string | null;
  /** Para un aporte o un retiro: el socio */
  socioNombre?: string | null;
}

export const TAMANO_PAGINA_MOVIMIENTOS = 50;

export interface TransferirParams {
  origenId: string;
  destinoId: string;
  monto: number;
  descripcion?: string;
}

export interface TransferirResult {
  success: boolean;
  error?: string;
}

export interface GastoRepartidoParams {
  monto: number;
  categoriaId: string;
  cuentaId: string;
  descripcion?: string;
  /** Puede venir vacío: el gasto queda sin asignar */
  asignaciones: Array<{ vehiculoId: string; monto: number }>;
}

export interface GastoRepartidoResult {
  success: boolean;
  error?: string;
}

export interface MovimientoSocioParams {
  socioId: string;
  cuentaId: string;
  monto: number;
  descripcion?: string;
}

export interface MovimientoSocioResult {
  success: boolean;
  error?: string;
}

export interface AnularVentaParams {
  ventaId: string;
  motivo: string;
}

export interface AnularVentaResult {
  success: boolean;
  error?: string;
}

export interface AnularVehiculoParams {
  vehiculoId: string;
  estado: VehiculoItem['estado'];
  motivo: string;
}

export interface AnularVehiculoResult {
  success: boolean;
  error?: string;
  gastosAnulados?: number;
  totalGastos?: number;
}

export interface VistaPreviaAnulacion {
  pagosCompra: PagoDetalle[];
  /** Legado: cantidad y suma de asignaciones vigentes. El aviso usa gastosQueSeAnulan y partesSinAsignar. */
  gastosCantidad?: number;
  gastosTotal?: number;
  /** Gastos que se anulan enteros (solo de este auto) */
  gastosQueSeAnulan?: { cantidad: number; total: number };
  /** Partes de gastos compartidos que quedan sin asignar */
  partesSinAsignar?: { cantidad: number; total: number };
}

export interface AnularMovimientoParams {
  movimientoId: string;
  /** Si el movimiento es de un gasto, se anula el gasto completo */
  gastoId: string | null;
  motivo: string;
  /** Tipo del movimiento, para no anular suelto lo que se anula por su operación completa */
  tipo?: string;
  anulado?: boolean;
}

export interface AnularMovimientoResult {
  success: boolean;
  error?: string;
}

export interface RegistrarIngresoParams {
  monto: number;
  categoriaId: string;
  cuentaId: string;
  descripcion?: string;
}

export interface RegistrarIngresoResult {
  success: boolean;
  error?: string;
  saldoCuenta?: number;
}

export interface RegistrarGastoParams {
  monto: number;
  categoriaId: string;
  cuentaId: string;
  descripcion?: string;
  /** null = gasto general del negocio; un id = gasto de ese vehículo */
  vehiculoId: string | null;
}

export interface RegistrarGastoResult {
  success: boolean;
  error?: string;
  gastoId?: string;
  saldoCuenta?: number;
  vehiculoCodigo?: string | null;
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

export interface VentaDetalle {
  ventaId: string;
  fecha: string;
  comprador: string | null;
  precioVenta: number;
  ganancia: number;
  cobros: PagoDetalle[];
}

export interface GastoDetalle {
  fecha: string;
  categoria: string;
  descripcion: string | null;
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
  venta: VentaDetalle | null;
  gastos: GastoDetalle[];
  /** Presente solo si el vehículo fue anulado (se llega desde el historial) */
  anulado?: { por: string | null; motivo: string | null; el: string | null } | null;
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

  /** Movimientos de a 50, del más nuevo al más viejo. `desde` es el índice del primer movimiento a traer. */
  async listarMovimientos(desde: number): Promise<MovimientoItem[]> {
    const { data, error } = await this.db
      .from('movimientos')
      .select(
        'id, fecha, tipo, monto, descripcion, anulado, anulado_at, motivo_anulacion, gasto_id, venta_id, vehiculo_id, ' +
          'transferencia_id, socio_id, socio:usuarios!socio_id(nombre), ' +
          'cuenta:cuentas(nombre), vehiculo:vehiculos(codigo), categoria:categorias(nombre), ' +
          'creador:usuarios!created_by(nombre), anulador:usuarios!anulado_por(nombre)'
      )
      .order('created_at', { ascending: false })
      .range(desde, desde + TAMANO_PAGINA_MOVIMIENTOS - 1);
    if (error) {
      throw new Error(error.message);
    }
    type Fila = {
      id: string;
      fecha: string;
      tipo: string;
      monto: number | string;
      descripcion: string | null;
      anulado: boolean;
      anulado_at: string | null;
      motivo_anulacion: string | null;
      gasto_id: string | null;
      venta_id: string | null;
      vehiculo_id: string | null;
      transferencia_id: string | null;
      socio_id: string | null;
      socio: { nombre: string } | null;
      cuenta: { nombre: string } | null;
      vehiculo: { codigo: string } | null;
      categoria: { nombre: string } | null;
      creador: { nombre: string } | null;
      anulador: { nombre: string } | null;
    };
    const filas = (Array.isArray(data) ? data : []) as Fila[];

    // Las patas de los pases de esta página: la otra pata da el nombre de la cuenta contraparte
    const idsTransferencia = [...new Set(filas.map((f) => f.transferencia_id).filter((t): t is string => !!t))];
    const patas: Array<{ id: string; transferencia_id: string; cuenta: { nombre: string } | null }> = [];
    if (idsTransferencia.length > 0) {
      const { data: otras, error: errorOtras } = await this.db
        .from('movimientos')
        .select('id, transferencia_id, cuenta:cuentas(nombre)')
        .in('transferencia_id', idsTransferencia);
      if (errorOtras) {
        throw new Error(errorOtras.message);
      }
      patas.push(...((Array.isArray(otras) ? otras : []) as typeof patas));
    }

    return filas.map((f) => ({
      id: f.id,
      transferenciaId: f.transferencia_id ?? null,
      cuentaContraparte: f.transferencia_id
        ? patas.find((p) => p.transferencia_id === f.transferencia_id && p.id !== f.id)?.cuenta?.nombre ?? null
        : null,
      socioNombre: f.socio?.nombre ?? null,
      fecha: f.fecha,
      tipo: f.tipo,
      monto: Number(f.monto) || 0,
      descripcion: f.descripcion ?? null,
      cuentaNombre: f.cuenta?.nombre ?? '',
      vehiculoId: f.vehiculo_id ?? null,
      vehiculoCodigo: f.vehiculo?.codigo ?? null,
      categoriaNombre: f.categoria?.nombre ?? null,
      creadoPor: f.creador?.nombre ?? '',
      anulado: f.anulado,
      anuladoPor: f.anulador?.nombre ?? null,
      anuladoEl: f.anulado_at ?? null,
      motivoAnulacion: f.motivo_anulacion ?? null,
      gastoId: f.gasto_id ?? null,
      ventaId: f.venta_id ?? null,
    }));
  }

  async transferir(params: TransferirParams): Promise<TransferirResult> {
    if (params.origenId === params.destinoId) {
      return { success: false, error: 'Elegí dos cuentas distintas' };
    }
    if (!(params.monto > 0)) {
      return { success: false, error: 'El monto tiene que ser mayor que 0' };
    }
    let error: { message: string } | null;
    try {
      ({ error } = await this.db.rpc('transferir', {
        p_origen_id: params.origenId,
        p_destino_id: params.destinoId,
        p_monto: params.monto,
        p_descripcion: params.descripcion ?? null,
      }));
    } catch {
      return { success: false, error: 'Sin conexión. No se pudo confirmar si se pasó la plata: revisá antes de reintentar.' };
    }
    if (error) {
      return { success: false, error: `${error.message}. No se pasó nada.` };
    }
    return { success: true };
  }

  async registrarAporte(params: MovimientoSocioParams): Promise<MovimientoSocioResult> {
    return this.registrarMovimientoSocio('registrar_aporte', params);
  }

  async registrarRetiro(params: MovimientoSocioParams): Promise<MovimientoSocioResult> {
    return this.registrarMovimientoSocio('registrar_retiro', params);
  }

  async anularTransferencia(params: { movimientoId: string; motivo: string }): Promise<{ success: boolean; error?: string }> {
    if (!params.motivo?.trim()) {
      return { success: false, error: 'El motivo es obligatorio' };
    }
    const { error } = await this.db.rpc('anular_transferencia', {
      p_movimiento_id: params.movimientoId,
      p_motivo: params.motivo.trim(),
    });
    if (error) {
      return { success: false, error: `${error.message}. No se anuló nada.` };
    }
    return { success: true };
  }

  /** Autos y montos que bajan si se anula un gasto (solo asignaciones vigentes). */
  async vistaPreviaAnularGasto(gastoId: string): Promise<Array<{ codigo: string; monto: number }>> {
    const { data } = await this.db
      .from('asignaciones_gasto')
      .select('monto, anulada, vehiculo:vehiculos(codigo)')
      .eq('gasto_id', gastoId)
      .eq('anulada', false);
    const filas = (Array.isArray(data) ? data : []) as Array<{ monto: number | string; vehiculo: { codigo: string } | null }>;
    return filas.map((f) => ({ codigo: f.vehiculo?.codigo ?? '', monto: Math.abs(Number(f.monto)) || 0 }));
  }

  async registrarGastoRepartido(params: GastoRepartidoParams): Promise<GastoRepartidoResult> {
    if (!(params.monto > 0)) {
      return { success: false, error: 'El monto tiene que ser mayor que 0' };
    }
    if (!params.categoriaId) {
      return { success: false, error: 'Elegí una categoría' };
    }
    if (!params.cuentaId) {
      return { success: false, error: 'Elegí una cuenta' };
    }
    if (params.asignaciones.some((a) => !(a.monto > 0))) {
      return { success: false, error: 'Cada asignación tiene que ser mayor que 0' };
    }
    const ids = params.asignaciones.map((a) => a.vehiculoId);
    if (new Set(ids).size !== ids.length) {
      return { success: false, error: 'Repetiste un vehículo: cada vehículo va una sola vez' };
    }
    const asignado = params.asignaciones.reduce((acc, a) => acc + a.monto, 0);
    if (asignado > params.monto) {
      return { success: false, error: `Sobran ${formatMoney(asignado - params.monto)} asignados de más` };
    }

    let error: { message: string } | null;
    try {
      ({ error } = await this.db.rpc('registrar_gasto_repartido', {
        p_monto: params.monto,
        p_categoria_id: params.categoriaId,
        p_cuenta_id: params.cuentaId,
        p_descripcion: params.descripcion?.trim() || null,
        p_asignaciones: params.asignaciones.map((a) => ({ vehiculo_id: a.vehiculoId, monto: a.monto })),
      }));
    } catch {
      return { success: false, error: 'Sin conexión. No se pudo confirmar si se guardó el gasto: revisá antes de reintentar.' };
    }
    if (error) {
      return { success: false, error: `${error.message}. No se guardó nada.` };
    }
    return { success: true };
  }

  async listarSocios(): Promise<Array<{ id: string; nombre: string }>> {
    const { data } = await this.db.from('usuarios').select('id, nombre').order('nombre', { ascending: true });
    return ((data ?? []) as Array<{ id: string; nombre: string }>).map((s) => ({ id: s.id, nombre: s.nombre }));
  }

  private async registrarMovimientoSocio(
    fn: 'registrar_aporte' | 'registrar_retiro',
    params: MovimientoSocioParams
  ): Promise<MovimientoSocioResult> {
    if (!params.socioId) {
      return { success: false, error: 'Elegí el socio' };
    }
    if (!params.cuentaId) {
      return { success: false, error: 'Elegí la cuenta' };
    }
    if (!(params.monto > 0)) {
      return { success: false, error: 'El monto tiene que ser mayor que 0' };
    }
    let error: { message: string } | null;
    try {
      ({ error } = await this.db.rpc(fn, {
        p_socio_id: params.socioId,
        p_cuenta_id: params.cuentaId,
        p_monto: params.monto,
        p_descripcion: params.descripcion ?? null,
      }));
    } catch {
      return { success: false, error: 'Sin conexión. No se pudo confirmar si se registró el movimiento: revisá antes de reintentar.' };
    }
    if (error) {
      return { success: false, error: `${error.message}. No se registró nada.` };
    }
    return { success: true };
  }

  async anularVenta(params: AnularVentaParams): Promise<AnularVentaResult> {
    if (!params.motivo?.trim()) {
      return { success: false, error: 'El motivo es obligatorio' };
    }
    let error: { message: string } | null;
    try {
      ({ error } = await this.db.rpc('anular_venta', { p_venta_id: params.ventaId, p_motivo: params.motivo.trim() }));
    } catch {
      return { success: false, error: 'Sin conexión. No se pudo confirmar si se anuló: revisá antes de reintentar.' };
    }
    if (error) {
      return { success: false, error: `${error.message || 'No se pudo anular la venta'}. No se anuló nada.` };
    }
    return { success: true };
  }

  async anularVehiculo(params: AnularVehiculoParams): Promise<AnularVehiculoResult> {
    if (!params.motivo?.trim()) {
      return { success: false, error: 'El motivo es obligatorio' };
    }
    if (params.estado === 'vendido') {
      return { success: false, error: 'Primero anulá la venta de este vehículo' };
    }
    const motivo = params.motivo.trim();
    let data: unknown;
    let error: { message: string } | null;
    try {
      ({ data, error } = await this.db.rpc('anular_vehiculo', { p_vehiculo_id: params.vehiculoId, p_motivo: motivo }));
    } catch {
      return { success: false, error: 'Sin conexión. No se pudo confirmar si se anuló: revisá antes de reintentar.' };
    }
    if (error) {
      return { success: false, error: `${error.message || 'No se pudo anular el vehículo'}. No se anuló nada.` };
    }
    const fila = data as { gastos_anulados: number; total_gastos: number | string };
    return {
      success: true,
      gastosAnulados: Number(fila.gastos_anulados) || 0,
      totalGastos: Number(fila.total_gastos) || 0,
    };
  }

  /** Lo que se va a anular con un vehículo, para mostrarlo en el aviso antes de confirmar. */
  async vistaPreviaAnulacionVehiculo(vehiculoId: string): Promise<VistaPreviaAnulacion> {
    const { data: pagos } = await this.db
      .from('movimientos')
      .select('monto, cuenta:cuentas(nombre)')
      .eq('vehiculo_id', vehiculoId)
      .eq('tipo', 'compra')
      .eq('anulado', false);
    const filasPago = (Array.isArray(pagos) ? pagos : []) as Array<{
      monto: number | string;
      cuenta: { nombre: string } | null;
    }>;

    const { data: asignaciones } = await this.db
      .from('asignaciones_gasto')
      .select('gasto_id, monto, gasto:gastos(monto_total, anulado)')
      .eq('vehiculo_id', vehiculoId)
      .eq('anulada', false);
    const filasGasto = (Array.isArray(asignaciones) ? asignaciones : []) as Array<{
      gasto_id: string;
      monto: number | string;
      gasto: { monto_total: number | string; anulado: boolean } | null;
    }>;
    const vigentes = filasGasto.filter((a) => a.gasto !== null && a.gasto.anulado === false);

    // Un gasto se anula entero si todas sus asignaciones vigentes son de este auto y cubren el total;
    // si es compartido, solo queda sin asignar la parte de este auto (la RPC anular_vehiculo hace lo mismo)
    const idsGastos = [...new Set(vigentes.map((a) => a.gasto_id))];
    const todas: Array<{ gasto_id: string; vehiculo_id: string; monto: number | string; anulada: boolean }> = [];
    if (idsGastos.length > 0) {
      const { data: otras } = await this.db
        .from('asignaciones_gasto')
        .select('gasto_id, vehiculo_id, monto, anulada')
        .in('gasto_id', idsGastos);
      todas.push(...((Array.isArray(otras) ? otras : []) as typeof todas));
    }
    const gastosQueSeAnulan = { cantidad: 0, total: 0 };
    const partesSinAsignar = { cantidad: 0, total: 0 };
    for (const a of vigentes) {
      const delGasto = todas.filter((x) => x.gasto_id === a.gasto_id && !x.anulada);
      const soloDelAuto = delGasto.every((x) => x.vehiculo_id === vehiculoId);
      const cubreTotal =
        delGasto.reduce((acc, x) => acc + (Math.abs(Number(x.monto)) || 0), 0) ===
        (Math.abs(Number(a.gasto?.monto_total)) || 0);
      if (soloDelAuto && cubreTotal) {
        gastosQueSeAnulan.cantidad += 1;
        gastosQueSeAnulan.total += Math.abs(Number(a.gasto?.monto_total)) || 0;
      } else {
        partesSinAsignar.cantidad += 1;
        partesSinAsignar.total += Math.abs(Number(a.monto)) || 0;
      }
    }

    return {
      pagosCompra: filasPago.map((p) => ({
        cuentaNombre: p.cuenta?.nombre ?? '',
        monto: Math.abs(Number(p.monto)) || 0,
      })),
      gastosCantidad: vigentes.length,
      gastosTotal: vigentes.reduce((acc, a) => acc + (Math.abs(Number(a.monto)) || 0), 0),
      gastosQueSeAnulan,
      partesSinAsignar,
    };
  }

  async anularMovimiento(params: AnularMovimientoParams): Promise<AnularMovimientoResult> {
    if (!params.motivo?.trim()) {
      return { success: false, error: 'El motivo es obligatorio' };
    }
    if (params.anulado) {
      return { success: false, error: 'Este movimiento ya está anulado' };
    }
    if (params.tipo === 'compra' || params.tipo === 'venta_cobro') {
      return {
        success: false,
        error: 'Este movimiento es parte de una compra o venta: se anula la operación completa',
      };
    }
    const motivo = params.motivo.trim();
    let error: { message: string } | null;
    try {
      ({ error } = params.gastoId
        ? await this.db.rpc('anular_gasto', { p_gasto_id: params.gastoId, p_motivo: motivo })
        : await this.db.rpc('anular_movimiento', { p_movimiento_id: params.movimientoId, p_motivo: motivo }));
    } catch {
      // Sin señal: el pedido pudo llegar sin que vuelva la respuesta, así que no afirmamos que no se anuló
      return { success: false, error: 'Sin conexión. No se pudo confirmar si se anuló: revisá antes de reintentar.' };
    }
    if (error) {
      return { success: false, error: `${error.message || 'No se pudo anular'}. No se anuló nada.` };
    }
    return { success: true };
  }

  async registrarIngreso(params: RegistrarIngresoParams): Promise<RegistrarIngresoResult> {
    if (!(params.monto > 0)) {
      return { success: false, error: 'El monto tiene que ser mayor que 0' };
    }
    if (!params.categoriaId) {
      return { success: false, error: 'Elegí una categoría' };
    }
    if (!params.cuentaId) {
      return { success: false, error: 'Elegí una cuenta' };
    }

    let data: unknown;
    let error: { message: string } | null;
    try {
      ({ data, error } = await this.db.rpc('registrar_ingreso', {
        p_monto: params.monto,
        p_categoria_id: params.categoriaId,
        p_cuenta_id: params.cuentaId,
        p_descripcion: params.descripcion?.trim() || null,
      }));
    } catch {
      return { success: false, error: 'Sin conexión. No se pudo confirmar si se guardó: revisá antes de reintentar.' };
    }
    if (error) {
      return { success: false, error: `${error.message || 'No se pudo registrar el ingreso'}. No se guardó nada.` };
    }

    const fila = data as { saldo_cuenta: number | string };
    return { success: true, saldoCuenta: Number(fila.saldo_cuenta) || 0 };
  }

  async listarCategorias(tipo: 'gasto' | 'ingreso'): Promise<Array<{ id: string; nombre: string }>> {
    const { data, error } = await this.db
      .from('categorias')
      .select('id, nombre, tipo, activa')
      .eq('tipo', tipo)
      .eq('activa', true)
      .order('nombre', { ascending: true });
    if (error) {
      throw new Error(error.message);
    }
    const filas = (data ?? []) as Array<{ id: string; nombre: string }>;
    return filas.map((f) => ({ id: f.id, nombre: f.nombre }));
  }

  async registrarGasto(params: RegistrarGastoParams): Promise<RegistrarGastoResult> {
    if (!(params.monto > 0)) {
      return { success: false, error: 'El monto tiene que ser mayor que 0' };
    }
    if (!params.categoriaId) {
      return { success: false, error: 'Elegí una categoría' };
    }
    if (!params.cuentaId) {
      return { success: false, error: 'Elegí una cuenta' };
    }
    if (params.vehiculoId === undefined) {
      return { success: false, error: 'Elegí si el gasto es general o de un vehículo' };
    }

    let data: unknown;
    let error: { message: string } | null;
    try {
      ({ data, error } = await this.db.rpc('registrar_gasto', {
        p_monto: params.monto,
        p_categoria_id: params.categoriaId,
        p_cuenta_id: params.cuentaId,
        p_descripcion: params.descripcion?.trim() || null,
        p_vehiculo_id: params.vehiculoId,
      }));
    } catch {
      // Sin señal: el pedido pudo llegar sin que vuelva la respuesta, así que no se afirma que no se guardó
      return { success: false, error: 'Sin conexión. No se pudo confirmar si se guardó: revisá antes de reintentar.' };
    }
    if (error) {
      // La RPC es una sola transacción: si devuelve error, no quedó nada guardado
      return { success: false, error: `${error.message || 'No se pudo registrar el gasto'}. No se guardó nada.` };
    }

    const fila = data as { gasto_id: string; vehiculo_codigo: string | null; saldo_cuenta: number | string };
    return {
      success: true,
      gastoId: fila.gasto_id,
      vehiculoCodigo: fila.vehiculo_codigo ?? null,
      saldoCuenta: Number(fila.saldo_cuenta) || 0,
    };
  }

  async registrarVenta(params: RegistrarVentaParams): Promise<RegistrarVentaResult> {
    if (!params.vehiculoId) {
      return { success: false, error: 'Elegí un vehículo para vender' };
    }
    if (!(params.precio > 0)) {
      return { success: false, error: 'El precio tiene que ser mayor que 0' };
    }
    if (params.cobros.some((c) => !(c.monto > 0))) {
      return { success: false, error: 'Cada cobro tiene que ser mayor que 0' };
    }
    if (new Set(params.cobros.map((c) => c.cuentaId)).size !== params.cobros.length) {
      return { success: false, error: 'No podés repetir una cuenta en los cobros' };
    }
    const suma = params.cobros.reduce((acc, c) => acc + c.monto, 0);
    if (suma !== params.precio) {
      const diferencia = Math.abs(params.precio - suma);
      const detalle = suma < params.precio
        ? `Faltan ${formatMoney(diferencia)}`
        : `Sobran ${formatMoney(diferencia)}`;
      return { success: false, error: `La suma de los cobros no coincide con el precio. ${detalle}` };
    }

    let data: unknown;
    let error: { message: string } | null;
    try {
      ({ data, error } = await this.db.rpc('registrar_venta', {
        p_vehiculo_id: params.vehiculoId,
        p_precio: params.precio,
        p_comprador: params.comprador?.trim() || null,
        p_cobros: params.cobros.map((c) => ({ cuenta_id: c.cuentaId, monto: c.monto })),
      }));
    } catch {
      // Sin señal: el pedido pudo llegar y guardarse sin que llegue la respuesta. Por eso no afirmamos
      // que no se guardó; si se reintenta y ya estaba vendido, la RPC responde "ya está vendido" sin duplicar.
      return {
        success: false,
        error: 'Sin conexión. No se pudo confirmar si se guardó: revisá el vehículo antes de reintentar.',
      };
    }
    if (error) {
      // La RPC es una sola transacción: si devuelve error, no quedó nada guardado
      const mensaje = error.message || 'No se pudo registrar la venta';
      return { success: false, error: `${mensaje}. No se guardó nada.` };
    }

    const fila = data as { venta_id: string; codigo: string; ganancia: number | string | null };
    return {
      success: true,
      ventaId: fila.venta_id,
      codigo: fila.codigo,
      ganancia: Number(fila.ganancia ?? 0),
    };
  }

  async obtenerDetalle(id: string): Promise<ObtenerDetalleResult> {
    const { data, error } = await this.db
      .from('vehiculos')
      .select('*, anulador:usuarios!anulado_por(nombre)')
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

    // Gastos asignados a este vehículo, sin los anulados, con la categoría de cada uno
    const { data: filasGasto, error: errorGastos } = await this.db
      .from('asignaciones_gasto')
      .select('monto, gasto:gastos(fecha, descripcion, anulado, categoria:categorias(nombre))')
      .eq('vehiculo_id', id)
      .eq('anulada', false);
    if (errorGastos) {
      return { success: false, error: errorGastos.message };
    }
    const filasGastoLista = Array.isArray(filasGasto) ? filasGasto : [];
    const gastos: GastoDetalle[] = (
      filasGastoLista as Array<{
        monto: number | string;
        gasto: { fecha: string; descripcion: string | null; anulado: boolean; categoria: { nombre: string } | null } | null;
      }>
    )
      .filter((a) => a.gasto !== null && a.gasto.anulado === false)
      .map((a) => ({
        fecha: a.gasto!.fecha,
        categoria: a.gasto!.categoria?.nombre ?? '',
        descripcion: a.gasto!.descripcion ?? null,
        monto: Math.abs(Number(a.monto)) || 0,
      }));

    // Venta: solo si el vehículo está vendido (la venta no anulada y sus cobros)
    let venta: VentaDetalle | null = null;
    if (fila.estado === 'vendido') {
      const { data: filaVenta, error: errorVenta } = await this.db
        .from('ventas')
        .select('*')
        .eq('vehiculo_id', id)
        .eq('anulada', false)
        .maybeSingle();
      if (errorVenta) {
        return { success: false, error: errorVenta.message };
      }
      if (filaVenta) {
        const v = filaVenta as { id: string; comprador_texto: string | null; fecha: string; precio_total: number | string };
        const { data: filasCobro, error: errorCobros } = await this.db
          .from('movimientos')
          .select('monto, cuenta:cuentas(nombre)')
          .eq('venta_id', v.id)
          .eq('tipo', 'venta_cobro')
          .eq('anulado', false);
        if (errorCobros) {
          return { success: false, error: errorCobros.message };
        }
        const { data: filaGanancia, error: errorGanancia } = await this.db
          .from('v_ganancia_venta')
          .select('ganancia')
          .eq('venta_id', v.id)
          .maybeSingle();
        if (errorGanancia) {
          return { success: false, error: errorGanancia.message };
        }
        const cobros = (filasCobro ?? []) as Array<{ monto: number | string; cuenta: { nombre: string } | null }>;
        venta = {
          ventaId: v.id,
          fecha: v.fecha,
          comprador: v.comprador_texto ?? null,
          precioVenta: Number(v.precio_total) || 0,
          ganancia: Number((filaGanancia as { ganancia?: number | string } | null)?.ganancia) || 0,
          cobros: cobros.map((c) => ({ cuentaNombre: c.cuenta?.nombre ?? '', monto: Math.abs(Number(c.monto)) || 0 })),
        };
      }
    }

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
        venta,
        gastos,
        anulado: fila.anulado === true
          ? {
              por: ((fila.anulador as { nombre: string } | null)?.nombre) ?? null,
              motivo: (fila.motivo_anulacion as string | null) ?? null,
              el: (fila.anulado_at as string | null) ?? null,
            }
          : null,
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
    // Los vehículos anulados no se listan (ni se pueden vender ni cargar gastos)
    const filas = ((data ?? []) as Array<Record<string, unknown> & { foto_url?: string | null; anulado?: boolean }>)
      .filter((f) => f.anulado !== true);

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
