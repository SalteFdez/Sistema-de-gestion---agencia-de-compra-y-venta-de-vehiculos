import { formatMoney } from '../format/money';
import { validarFinanciacion } from './financiacion';

// Hoy en Buenos Aires, AAAA-MM-DD
const hoyBuenosAires = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());

export interface VehiculoItem {
  id: string;
  codigo: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string | null;
  /** Para la búsqueda del listado */
  patente?: string | null;
  /** Costo real, si la lista lo trae (si no, se pide con obtenerDetalle) */
  costoReal?: number;
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
  ilike: (col: string, patron: string) => Consulta;
  gte: (col: string, value: unknown) => Consulta;
  lt: (col: string, value: unknown) => Consulta;
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
  /** Para un cobro de cuota: número de la cuota y cantidad de cuotas de la venta */
  cuotaNumero?: number | null;
  cuotaTotal?: number | null;
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

export interface ContactoProveedor {
  id: string;
  nombre: string;
  telefono: string | null;
}

export interface PendienteAsignar {
  gastoId: string;
  fecha: string;
  categoria: string;
  descripcion: string | null;
  montoTotal: number;
  pendiente: number;
  proveedorId: string | null;
  proveedorNombre: string | null;
}

export interface GrupoPendientes {
  proveedorId: string | null;
  proveedorNombre: string;
  subtotal: number;
  gastos: PendienteAsignar[];
}

export interface AsignarGastoParams {
  gastoId: string;
  /** Lo que queda pendiente al abrir la pantalla; la base lo vuelve a comprobar con el gasto bloqueado */
  pendiente: number;
  asignaciones: Array<{ vehiculoId: string; monto: number }>;
}

export interface AsignarGastoResult {
  success: boolean;
  error?: string;
}

export interface PendientesResult {
  grupos: GrupoPendientes[];
  total: number;
}

export interface CrearContactoResult {
  success: boolean;
  error?: string;
  contacto?: ContactoProveedor;
}

export interface GastoRepartidoParams {
  /** Proveedor opcional (contacto de tipo proveedor) */
  proveedorId?: string | null;
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

export interface FotoVehiculo {
  id: string;
  ruta: string;
  /** URL firmada; null si no se pudo firmar */
  url: string | null;
  orden: number;
  /** Es la foto principal (la del listado) */
  esPrincipal: boolean;
}

export interface DetalleMesGanancia {
  ventas: Array<{ ventaId: string; fecha: string; codigo: string; vehiculoId: string; precio: number; costoReal: number; ganancia: number }>;
  gastosGenerales: Array<{ fecha: string; categoria: string; descripcion: string | null; monto: number }>;
  gastosSinAsignar: Array<{ gastoId: string; fecha: string; proveedor: string | null; categoria: string; descripcion: string | null; pendiente: number }>;
  ingresos: Array<{ fecha: string; categoria: string; descripcion: string | null; monto: number }>;
}

export interface MesGanancia {
  /** Primer día del mes, AAAA-MM-01 */
  mes: string;
  ventas: number;
  cantidadVendidos: number;
  costoVendido: number;
  gastosGenerales: number;
  gastosSinAsignar: number;
  ingresos: number;
  ganancia: number;
}

export interface AgregarFotosResult {
  success: boolean;
  error?: string;
  agregadas: number;
  fallidas: Array<{ numero: number; error: string }>;
}

export interface CuotaPorCobrar {
  cuotaId: string;
  ventaId: string;
  numero: number;
  totalCuotas: number;
  monto: number;
  cobrado: number;
  saldo: number;
  /** cobrada | vencida | parcial | pendiente */
  estado: string;
  /** AAAA-MM-DD */
  vencimiento: string;
  vehiculoCodigo: string;
  comprador: string | null;
  compradorTelefono: string | null;
}

export interface PermutaParams {
  marca: string;
  modelo: string;
  anio: number;
  color?: string;
  patente?: string;
  foto?: Blob;
  /** Lo que vale el auto recibido: pasa a ser su costo */
  valorPactado: number;
}

export interface RegistrarVentaConPermutasParams {
  vehiculoId: string;
  precio: number;
  comprador?: string;
  cobros: CobroVenta[];
  permutas: PermutaParams[];
  compradorTelefono?: string;
  /** Parte del precio que queda financiada en cuotas (sin interés) */
  financiacion?: { monto: number; cantidadCuotas: number; fechaPrimera: string };
}

export interface RegistrarVentaConPermutasResult {
  success: boolean;
  error?: string;
  ventaId?: string;
  codigo?: string;
  ganancia?: number;
  /** Autos recibidos, en el orden en que se cargaron */
  permutas?: Array<{ id: string; codigo: string }>;
  /** Fotos que no se pudieron subir (la venta igual quedó guardada) */
  avisosFoto?: string[];
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
  /** Proveedor opcional (contacto de tipo proveedor); solo para gastos de vehículo */
  proveedorId?: string | null;
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
  /** Autos recibidos en parte de pago en esta venta */
  permutas?: Array<{ vehiculoId: string; codigo: string; marca: string; modelo: string; valorPactado: number }>;
  /** Parte financiada en cuotas, si la venta la tiene */
  financiacion?: {
    monto: number;
    cantidadCuotas: number;
    fechaPrimera: string;
    /** Lo que queda por cobrar (sin cuotas cobradas todavía) */
    faltaCobrar: number;
    cuotas: Array<{ numero: number; monto: number; fechaVencimiento: string; estado: string }>;
  };
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
  /** Si entró por permuta: código del auto vendido en cuya venta entró */
  permutaDeVenta?: string | null;
  /** Galería de fotos vigentes, en orden de llegada */
  fotos?: FotoVehiculo[];
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
          'cuota:cuotas(numero, financiacion:financiaciones(cantidad_cuotas)), ' +
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
      cuota: { numero: number; financiacion: { cantidad_cuotas: number } | null } | null;
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
      cuotaNumero: f.cuota?.numero ?? null,
      cuotaTotal: f.cuota?.financiacion?.cantidad_cuotas ?? null,
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

  /** Asigna plata pendiente de un gasto a vehículos. No crea movimientos: la plata ya había salido. */
  async asignarGasto(params: AsignarGastoParams): Promise<AsignarGastoResult> {
    if (params.asignaciones.some((a) => !(a.monto > 0))) {
      return { success: false, error: 'Cada asignación tiene que ser mayor que 0' };
    }
    const ids = params.asignaciones.map((a) => a.vehiculoId);
    if (new Set(ids).size !== ids.length) {
      return { success: false, error: 'Repetiste un vehículo: cada vehículo va una sola vez' };
    }
    const asignado = params.asignaciones.reduce((acc, a) => acc + a.monto, 0);
    if (asignado > params.pendiente) {
      return { success: false, error: `Sobran ${formatMoney(asignado - params.pendiente)} asignados de más` };
    }

    let error: { message: string } | null;
    try {
      ({ error } = await this.db.rpc('asignar_gasto', {
        p_gasto_id: params.gastoId,
        p_asignaciones: params.asignaciones.map((a) => ({ vehiculo_id: a.vehiculoId, monto: a.monto })),
      }));
    } catch {
      return { success: false, error: 'Sin conexión. No se pudo confirmar si se asignó: revisá antes de reintentar.' };
    }
    if (error) {
      return { success: false, error: `${error.message}. No se asignó nada.` };
    }
    return { success: true };
  }

  /** Gastos con plata sin asignar, agrupados por proveedor (el sin proveedor va al final). */
  async listarPendientes(): Promise<PendientesResult> {
    const { data } = await this.db
      .from('v_gastos_sin_asignar')
      .select('gasto_id, fecha, categoria_nombre, descripcion, monto_total, pendiente, proveedor_id, proveedor_nombre')
      .order('fecha', { ascending: false });
    const filas = (Array.isArray(data) ? data : []) as Array<{
      gasto_id: string; fecha: string; categoria_nombre: string | null; descripcion: string | null;
      monto_total: number | string; pendiente: number | string; proveedor_id: string | null; proveedor_nombre: string | null;
    }>;

    const pendientes: PendienteAsignar[] = filas.map((f) => ({
      gastoId: f.gasto_id,
      fecha: f.fecha,
      categoria: f.categoria_nombre ?? '',
      descripcion: f.descripcion ?? null,
      montoTotal: Number(f.monto_total) || 0,
      pendiente: Number(f.pendiente) || 0,
      proveedorId: f.proveedor_id ?? null,
      proveedorNombre: f.proveedor_nombre ?? null,
    }));

    const porProveedor = new Map<string, GrupoPendientes>();
    for (const p of pendientes) {
      const clave = p.proveedorId ?? '';
      const grupo =
        porProveedor.get(clave) ??
        { proveedorId: p.proveedorId, proveedorNombre: p.proveedorNombre ?? 'Sin proveedor', subtotal: 0, gastos: [] };
      grupo.subtotal += p.pendiente;
      grupo.gastos.push(p);
      porProveedor.set(clave, grupo);
    }
    const grupos = [...porProveedor.values()].sort((a, b) => {
      if (a.proveedorId === null) return 1;
      if (b.proveedorId === null) return -1;
      return a.proveedorNombre.localeCompare(b.proveedorNombre, 'es');
    });
    return { grupos, total: pendientes.reduce((acc, p) => acc + p.pendiente, 0) };
  }

  /** Proveedores (contactos de tipo proveedor) cuyo nombre contiene el texto, sin distinguir mayúsculas. */
  async buscarProveedores(texto: string): Promise<ContactoProveedor[]> {
    const { data } = await this.db
      .from('contactos')
      .select('id, nombre, telefono')
      .ilike('nombre', `%${texto.trim()}%`)
      .order('nombre', { ascending: true });
    return ((Array.isArray(data) ? data : []) as Array<{ id: string; nombre: string; telefono: string | null }>).map(
      (c) => ({ id: c.id, nombre: c.nombre, telefono: c.telefono ?? null })
    );
  }

  /** Crea un proveedor. Si ya existe con ese nombre (sin distinguir mayúsculas), la RPC devuelve el existente. */
  async crearContacto(params: { nombre: string; telefono?: string }): Promise<CrearContactoResult> {
    const nombre = params.nombre?.trim() ?? '';
    if (!nombre) {
      return { success: false, error: 'El nombre es obligatorio' };
    }
    let data: unknown;
    let error: { message: string } | null;
    try {
      ({ data, error } = await this.db.rpc('crear_contacto', {
        p_nombre: nombre,
        p_telefono: params.telefono?.trim() || null,
        p_tipo: 'proveedor',
      }));
    } catch {
      return { success: false, error: 'Sin conexión. No se pudo confirmar si se creó el proveedor: revisá antes de reintentar.' };
    }
    if (error) {
      return { success: false, error: `${error.message}. No se creó nada.` };
    }
    const f = data as { id: string; nombre: string; telefono: string | null };
    return { success: true, contacto: { id: f.id, nombre: f.nombre, telefono: f.telefono ?? null } };
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
        p_proveedor_id: params.proveedorId ?? null,
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

  /** Venta con una o más permutas (autos recibidos que entran al stock con su valor pactado). */
  async registrarVentaConPermutas(params: RegistrarVentaConPermutasParams): Promise<RegistrarVentaConPermutasResult> {
    const sumaPermutas = params.permutas.reduce((acc, p) => acc + (p.valorPactado || 0), 0);
    for (const p of params.permutas) {
      if (!p.marca?.trim() || !p.modelo?.trim() || !p.anio) {
        return { success: false, error: 'Faltan datos del vehículo recibido: marca, modelo y año' };
      }
      if (!(p.valorPactado > 0)) {
        return { success: false, error: 'El valor pactado tiene que ser mayor que 0' };
      }
    }
    if (sumaPermutas > params.precio) {
      return {
        success: false,
        error: `Las permutas superan el precio. Sobran ${formatMoney(sumaPermutas - params.precio)}`,
      };
    }
    const sumaCobros = params.cobros.reduce((acc, c) => acc + c.monto, 0);
    const total = sumaCobros + sumaPermutas;
    if (params.financiacion) {
      const motivo = validarFinanciacion({
        precio: params.precio,
        permutas: sumaPermutas,
        cobros: sumaCobros,
        financiado: params.financiacion.monto,
        cantidadCuotas: params.financiacion.cantidadCuotas,
        fechaPrimera: params.financiacion.fechaPrimera,
        hoy: hoyBuenosAires(),
      });
      if (motivo) {
        return { success: false, error: motivo };
      }
    } else if (total !== params.precio) {
      const detalle =
        total < params.precio ? `Faltan ${formatMoney(params.precio - total)}` : `Sobran ${formatMoney(total - params.precio)}`;
      return { success: false, error: `Precio, cobros y permutas no cierran. ${detalle}` };
    }

    let data: unknown;
    let error: { message: string } | null;
    try {
      ({ data, error } = await this.db.rpc('registrar_venta', {
        p_vehiculo_id: params.vehiculoId,
        p_precio: params.precio,
        p_comprador: params.comprador?.trim() || null,
        p_cobros: params.cobros.map((c) => ({ cuenta_id: c.cuentaId, monto: c.monto })),
        p_comprador_telefono: params.compradorTelefono?.trim() || null,
        p_financiacion: params.financiacion
          ? {
              monto: params.financiacion.monto,
              cantidad_cuotas: params.financiacion.cantidadCuotas,
              fecha_primera: params.financiacion.fechaPrimera,
            }
          : null,
        p_permutas: params.permutas.map((p) => ({
          marca: p.marca.trim(),
          modelo: p.modelo.trim(),
          anio: p.anio,
          color: p.color?.trim() || null,
          patente: p.patente?.trim() || null,
          valor_pactado: p.valorPactado,
        })),
      }));
    } catch {
      return { success: false, error: 'Sin conexión. No se pudo confirmar si se guardó la venta: revisá antes de reintentar.' };
    }
    if (error) {
      return { success: false, error: `${error.message || 'No se pudo registrar la venta'}. No se guardó nada.` };
    }

    const fila = data as {
      venta_id: string;
      codigo: string;
      ganancia: number | string | null;
      permutas: Array<{ vehiculo_id: string; codigo: string }>;
    };
    const recibidos = (fila.permutas ?? []).map((r) => ({ id: r.vehiculo_id, codigo: r.codigo }));

    // Las fotos van después de la RPC: si una falla, ese auto queda sin foto y la venta igual se guardó
    const avisosFoto: string[] = [];
    for (let i = 0; i < params.permutas.length; i++) {
      const foto = params.permutas[i].foto;
      const recibido = recibidos[i];
      if (foto && recibido) {
        const subida = await this.agregarFoto(recibido.id, foto);
        if (!subida.success) {
          avisosFoto.push(`${recibido.codigo}: ${subida.error ?? 'No se pudo subir la foto'}`);
        }
      }
    }

    return {
      success: true,
      ventaId: fila.venta_id,
      codigo: fila.codigo,
      ganancia: Number(fila.ganancia) || 0,
      permutas: recibidos,
      avisosFoto,
    };
  }

  /** Cobros de cuotas vigentes de una venta: cantidad y suma (salen de las cuentas si se anula la venta). */
  async vistaPreviaCobrosCuotas(ventaId: string): Promise<{ cantidad: number; total: number }> {
    const { data } = await this.db
      .from('movimientos')
      .select('monto, venta_id, tipo, anulado')
      .eq('venta_id', ventaId)
      .eq('tipo', 'cuota_cobro')
      .eq('anulado', false);
    const filas = (Array.isArray(data) ? data : []) as Array<{ monto: number | string }>;
    return {
      cantidad: filas.length,
      total: filas.reduce((acc, f) => acc + (Math.abs(Number(f.monto)) || 0), 0),
    };
  }

  /** Cobra total o parcial una cuota, en la cuenta donde entró. No cobra más que el saldo. */
  async cobrarCuota(params: { cuotaId: string; cuentaId: string; monto: number; saldo: number }): Promise<{ success: boolean; error?: string }> {
    if (!(params.monto > 0)) {
      return { success: false, error: 'El monto tiene que ser mayor que 0' };
    }
    if (params.monto > params.saldo) {
      return { success: false, error: `Solo quedan ${formatMoney(params.saldo)} de esta cuota` };
    }
    if (!params.cuentaId) {
      return { success: false, error: 'Elegí la cuenta donde entró la plata' };
    }
    let error: { message: string } | null;
    try {
      ({ error } = await this.db.rpc('cobrar_cuota', {
        p_cuota_id: params.cuotaId,
        p_cuenta_id: params.cuentaId,
        p_monto: params.monto,
      }));
    } catch {
      return { success: false, error: 'Sin conexión. No se pudo confirmar si se cobró: revisá antes de reintentar.' };
    }
    if (error) {
      return { success: false, error: `${error.message}. No se cobró nada.` };
    }
    return { success: true };
  }

  /** Cuotas con saldo, con las vencidas primero y después por fecha de vencimiento. */
  async listarCuotasPorCobrar(): Promise<CuotaPorCobrar[]> {
    const { data, error } = await this.db
      .from('v_cuotas')
      .select('cuota_id, venta_id, numero, monto, fecha_vencimiento, cobrado, saldo, estado, vehiculo_codigo, comprador, comprador_telefono, total_cuotas')
      .order('fecha_vencimiento', { ascending: true });
    if (error) {
      throw new Error(error.message);
    }
    const filas = (Array.isArray(data) ? data : []) as Array<{
      cuota_id: string; venta_id: string; numero: number; monto: number | string; fecha_vencimiento: string;
      cobrado: number | string; saldo: number | string; estado: string; vehiculo_codigo: string;
      comprador: string | null; comprador_telefono: string | null; total_cuotas: number | string;
    }>;
    const cuotas: CuotaPorCobrar[] = filas
      .filter((f) => Number(f.saldo) > 0)
      .map((f) => ({
        cuotaId: f.cuota_id,
        ventaId: f.venta_id,
        numero: Number(f.numero),
        totalCuotas: Number(f.total_cuotas) || 0,
        monto: Number(f.monto) || 0,
        cobrado: Number(f.cobrado) || 0,
        saldo: Number(f.saldo) || 0,
        estado: f.estado,
        vencimiento: f.fecha_vencimiento,
        vehiculoCodigo: f.vehiculo_codigo,
        comprador: f.comprador ?? null,
        compradorTelefono: f.comprador_telefono ?? null,
      }));
    // Vencidas primero; dentro de cada grupo, por fecha
    return cuotas.sort((a, b) => {
      const va = a.estado === 'vencida' ? 0 : 1;
      const vb = b.estado === 'vencida' ? 0 : 1;
      if (va !== vb) return va - vb;
      return a.vencimiento.localeCompare(b.vencimiento);
    });
  }

  /** De dónde sale la ganancia de un mes: ventas, gastos generales, sin asignar e ingresos. `mes` es AAAA-MM-01. */
  async detalleMesGanancia(mes: string): Promise<DetalleMesGanancia> {
    const [anio, m] = mes.split('-').map(Number);
    const desde = mes;
    const hasta = m === 12
      ? `${anio + 1}-01-01`
      : `${anio}-${String(m + 1).padStart(2, '0')}-01`;

    const { data: dVentas, error: eVentas } = await this.db
      .from('ventas')
      .select('id, vehiculo_id, fecha, precio_total, anulada, vehiculo:vehiculos(codigo)')
      .eq('anulada', false)
      .gte('fecha', desde)
      .lt('fecha', hasta);
    if (eVentas) throw new Error(eVentas.message);
    const ventasMes = (Array.isArray(dVentas) ? dVentas : []) as Array<{
      id: string; vehiculo_id: string; fecha: string; precio_total: number | string; vehiculo: { codigo: string } | null;
    }>;

    const idsVentas = ventasMes.map((v) => v.id);
    const { data: dGan, error: eGan } = idsVentas.length > 0
      ? await this.db.from('v_ganancia_venta').select('venta_id, costo_real, ganancia').in('venta_id', idsVentas)
      : { data: [], error: null };
    if (eGan) throw new Error(eGan.message);
    const ganPorVenta = new Map(
      ((Array.isArray(dGan) ? dGan : []) as Array<{ venta_id: string; costo_real: number | string; ganancia: number | string }>)
        .map((g) => [g.venta_id, g])
    );

    const { data: dGen, error: eGen } = await this.db
      .from('gastos')
      .select('fecha, descripcion, monto_total, alcance, anulado, categoria:categorias(nombre)')
      .eq('alcance', 'general')
      .eq('anulado', false)
      .gte('fecha', desde)
      .lt('fecha', hasta);
    if (eGen) throw new Error(eGen.message);

    const { data: dSin, error: eSin } = await this.db
      .from('v_gastos_sin_asignar')
      .select('gasto_id, fecha, descripcion, pendiente, categoria_nombre, proveedor_nombre')
      .gte('fecha', desde)
      .lt('fecha', hasta);
    if (eSin) throw new Error(eSin.message);

    const { data: dIng, error: eIng } = await this.db
      .from('movimientos')
      .select('fecha, descripcion, monto, tipo, anulado, categoria:categorias(nombre)')
      .eq('tipo', 'ingreso_otro')
      .eq('anulado', false)
      .gte('fecha', desde)
      .lt('fecha', hasta);
    if (eIng) throw new Error(eIng.message);

    const arr = <T>(d: unknown): T[] => (Array.isArray(d) ? d : []) as T[];
    return {
      ventas: ventasMes.map((v) => {
        const g = ganPorVenta.get(v.id);
        return {
          ventaId: v.id,
          fecha: v.fecha,
          codigo: v.vehiculo?.codigo ?? '',
          vehiculoId: v.vehiculo_id,
          precio: Number(v.precio_total) || 0,
          costoReal: Number(g?.costo_real) || 0,
          ganancia: Number(g?.ganancia) || 0,
        };
      }),
      gastosGenerales: arr<{ fecha: string; descripcion: string | null; monto_total: number | string; categoria: { nombre: string } | null }>(dGen).map((g) => ({
        fecha: g.fecha,
        categoria: g.categoria?.nombre ?? '',
        descripcion: g.descripcion ?? null,
        monto: Number(g.monto_total) || 0,
      })),
      gastosSinAsignar: arr<{ gasto_id: string; fecha: string; descripcion: string | null; pendiente: number | string; categoria_nombre: string | null; proveedor_nombre: string | null }>(dSin).map((g) => ({
        gastoId: g.gasto_id,
        fecha: g.fecha,
        proveedor: g.proveedor_nombre ?? null,
        categoria: g.categoria_nombre ?? '',
        descripcion: g.descripcion ?? null,
        pendiente: Number(g.pendiente) || 0,
      })),
      ingresos: arr<{ fecha: string; descripcion: string | null; monto: number | string; categoria: { nombre: string } | null }>(dIng).map((i) => ({
        fecha: i.fecha,
        categoria: i.categoria?.nombre ?? '',
        descripcion: i.descripcion ?? null,
        monto: Number(i.monto) || 0,
      })),
    };
  }

  /** Ganancia por mes, del más nuevo al más viejo. La vista se recalcula con el estado actual. */
  async listarGananciaMensual(): Promise<MesGanancia[]> {
    const { data, error } = await this.db
      .from('v_ganancia_mensual')
      .select('mes, ventas, cantidad_vendidos, costo_vendido, gastos_generales, gastos_sin_asignar, ingresos, ganancia')
      .order('mes', { ascending: false });
    if (error) {
      throw new Error(error.message);
    }
    const filas = (Array.isArray(data) ? data : []) as Array<Record<string, unknown>>;
    return filas.map((f) => ({
      mes: String(f.mes),
      ventas: Number(f.ventas) || 0,
      cantidadVendidos: Number(f.cantidad_vendidos) || 0,
      costoVendido: Number(f.costo_vendido) || 0,
      gastosGenerales: Number(f.gastos_generales) || 0,
      gastosSinAsignar: Number(f.gastos_sin_asignar) || 0,
      ingresos: Number(f.ingresos) || 0,
      ganancia: Number(f.ganancia) || 0,
    }));
  }

  /** Lo que queda por cobrar de las ventas financiadas (no es dinero disponible). */
  async obtenerPorCobrar(): Promise<number> {
    const { data, error } = await this.db.from('v_por_cobrar').select('total');
    if (error) {
      throw new Error(error.message);
    }
    const fila = (Array.isArray(data) ? data[0] : null) as { total: number | string } | null;
    return Number(fila?.total) || 0;
  }

  /** Autos recibidos en la venta, con lo que se anula con cada uno (gastos y partes). */
  async vistaPreviaAnularVenta(ventaId: string): Promise<Array<{ id: string; codigo: string } & VistaPreviaAnulacion>> {
    const { data } = await this.db
      .from('venta_permutas')
      .select('vehiculo_recibido_id, vehiculo:vehiculos(codigo)')
      .eq('venta_id', ventaId);
    const filas = (Array.isArray(data) ? data : []) as Array<{
      vehiculo_recibido_id: string;
      vehiculo: { codigo: string } | null;
    }>;
    const res: Array<{ id: string; codigo: string } & VistaPreviaAnulacion> = [];
    for (const f of filas) {
      const vista = await this.vistaPreviaAnulacionVehiculo(f.vehiculo_recibido_id);
      res.push({ id: f.vehiculo_recibido_id, codigo: f.vehiculo?.codigo ?? '', ...vista });
    }
    return res;
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
        p_proveedor_id: params.proveedorId ?? null,
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
    let permutasVenta: NonNullable<VentaDetalle['permutas']> = [];
    let financiacionVenta: VentaDetalle['financiacion'] | undefined;

    // Si entró por permuta, de qué venta salió
    let permutaDeVenta: string | null = null;
    if (fila.origen === 'permuta') {
      const { data: deQueVenta, error: errorDeQueVenta } = await this.db
        .from('venta_permutas')
        .select('vehiculo_recibido_id, venta:ventas(vehiculo:vehiculos(codigo))')
        .eq('vehiculo_recibido_id', id)
        .maybeSingle();
      if (errorDeQueVenta) {
        return { success: false, error: errorDeQueVenta.message };
      }
      const r = deQueVenta as { venta: { vehiculo: { codigo: string } | null } | null } | null;
      permutaDeVenta = r?.venta?.vehiculo?.codigo ?? null;
    }
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
        const { data: filasPermutas, error: errorPermutas } = await this.db
          .from('venta_permutas')
          .select('vehiculo_recibido_id, valor_pactado, vehiculo:vehiculos(codigo, marca, modelo)')
          .eq('venta_id', v.id);
        if (errorPermutas) {
          return { success: false, error: errorPermutas.message };
        }
        permutasVenta = (Array.isArray(filasPermutas) ? filasPermutas : []).map((p) => {
          const r = p as { vehiculo_recibido_id: string; valor_pactado: number | string; vehiculo: { codigo: string; marca: string; modelo: string } | null };
          return {
            vehiculoId: r.vehiculo_recibido_id,
            codigo: r.vehiculo?.codigo ?? '',
            marca: r.vehiculo?.marca ?? '',
            modelo: r.vehiculo?.modelo ?? '',
            valorPactado: Number(r.valor_pactado) || 0,
          };
        });
        const { data: filaFin, error: errorFin } = await this.db
          .from('financiaciones')
          .select('id, monto_total, cantidad_cuotas, fecha_primera')
          .eq('venta_id', v.id)
          .maybeSingle();
        if (errorFin) {
          return { success: false, error: errorFin.message };
        }
        if (filaFin) {
          const f = filaFin as { id: string; monto_total: number | string; cantidad_cuotas: number | string; fecha_primera: string };
          const { data: filasCuotas, error: errorCuotas } = await this.db
            .from('cuotas')
            .select('numero, monto, fecha_vencimiento')
            .eq('financiacion_id', f.id)
            .order('numero', { ascending: true });
          if (errorCuotas) {
            return { success: false, error: errorCuotas.message };
          }
          const cuotasFila = (Array.isArray(filasCuotas) ? filasCuotas : []) as Array<{
            numero: number; monto: number | string; fecha_vencimiento: string;
          }>;
          financiacionVenta = {
            monto: Number(f.monto_total) || 0,
            cantidadCuotas: Number(f.cantidad_cuotas) || 0,
            fechaPrimera: String(f.fecha_primera),
            faltaCobrar: Number(f.monto_total) || 0,
            cuotas: cuotasFila.map((c) => ({
              numero: Number(c.numero),
              monto: Number(c.monto) || 0,
              fechaVencimiento: String(c.fecha_vencimiento),
              estado: 'pendiente',
            })),
          };
        }
        const cobros = (filasCobro ?? []) as Array<{ monto: number | string; cuenta: { nombre: string } | null }>;
        venta = {
          ventaId: v.id,
          ...(permutasVenta.length > 0 ? { permutas: permutasVenta } : {}),
          ...(financiacionVenta ? { financiacion: financiacionVenta } : {}),
          fecha: v.fecha,
          comprador: v.comprador_texto ?? null,
          precioVenta: Number(v.precio_total) || 0,
          ganancia: Number((filaGanancia as { ganancia?: number | string } | null)?.ganancia) || 0,
          cobros: cobros.map((c) => ({ cuentaNombre: c.cuenta?.nombre ?? '', monto: Math.abs(Number(c.monto)) || 0 })),
        };
      }
    }

    // Galería: fotos vigentes en orden, con todas las URLs firmadas en un solo pedido
    const { data: filasFotos, error: errorFotos } = await this.db
      .from('vehiculo_fotos')
      .select('id, ruta, orden, quitada')
      .eq('vehiculo_id', id)
      .eq('quitada', false);
    if (errorFotos) {
      return { success: false, error: errorFotos.message };
    }
    const fotosVigentes = ((Array.isArray(filasFotos) ? filasFotos : []) as Array<{ id: string; ruta: string; orden: number }>)
      .sort((a, b) => Number(a.orden) - Number(b.orden));
    let urlPorRuta = new Map<string, string>();
    if (fotosVigentes.length > 0 && this.storage) {
      const { data: firmadas } = await this.storage
        .from('vehiculos')
        .createSignedUrls(fotosVigentes.map((f) => f.ruta), 3600);
      urlPorRuta = new Map((firmadas ?? []).filter((f) => f.signedUrl).map((f) => [f.path, f.signedUrl]));
    }
    // La principal es la que tiene la misma ruta que vehiculos.foto_url
    const fotos: FotoVehiculo[] = fotosVigentes.map((f) => ({
      id: f.id,
      ruta: f.ruta,
      url: urlPorRuta.get(f.ruta) ?? null,
      orden: Number(f.orden),
      esPrincipal: f.ruta === (fila.foto_url as string | null),
    }));

    return {
      success: true,
      detalle: {
        id: String(fila.id),
        fotos,
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
        permutaDeVenta,
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

  /**
   * Fotos vigentes de un auto para compartir: URLs firmadas en un solo pedido, la principal primero.
   * Usa la misma consulta de fotos que el detalle.
   */
  async fotosParaCompartir(id: string): Promise<{
    success: boolean;
    error?: string;
    codigo?: string;
    marca?: string;
    modelo?: string;
    urls: string[];
  }> {
    const { data: vehiculo, error: errorVehiculo } = await this.db
      .from('vehiculos')
      .select('id, codigo, marca, modelo, anio, foto_url')
      .eq('id', id)
      .maybeSingle();
    if (errorVehiculo) {
      return { success: false, error: errorVehiculo.message, urls: [] };
    }
    if (!vehiculo) {
      return { success: false, error: 'No se encontró el vehículo', urls: [] };
    }
    const v = vehiculo as { codigo: string; marca: string; modelo: string; foto_url: string | null };

    const { data: filasFotos, error: errorFotos } = await this.db
      .from('vehiculo_fotos')
      .select('id, ruta, orden, quitada')
      .eq('vehiculo_id', id)
      .eq('quitada', false);
    if (errorFotos) {
      return { success: false, error: errorFotos.message, urls: [] };
    }
    const vigentes = ((Array.isArray(filasFotos) ? filasFotos : []) as Array<{ ruta: string; orden: number }>)
      .sort((a, b) => Number(a.orden) - Number(b.orden))
      // La principal va primero; el resto sigue su orden
      .sort((a, b) => Number(b.ruta === v.foto_url) - Number(a.ruta === v.foto_url));

    let urls: string[] = [];
    if (vigentes.length > 0 && this.storage) {
      const { data: firmadas } = await this.storage
        .from('vehiculos')
        .createSignedUrls(vigentes.map((f) => f.ruta), 3600);
      const urlPorRuta = new Map((firmadas ?? []).filter((f) => f.signedUrl).map((f) => [f.path, f.signedUrl]));
      urls = vigentes.map((f) => urlPorRuta.get(f.ruta)).filter((u): u is string => Boolean(u));
    }

    return { success: true, codigo: v.codigo, marca: v.marca, modelo: v.modelo, urls };
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
      patente: (f.patente as string | null) ?? null,
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
  ): Promise<{ path: string; error: null; detalle?: undefined } | { path: null; error: 'subida' | 'ruta'; detalle?: string }> {
    const path = `${id}/${crypto.randomUUID()}.jpg`;
    const { error: errorSubida } = await this.storage!
      .from('vehiculos')
      .upload(path, foto, { contentType: 'image/jpeg' });

    if (errorSubida) {
      return { path: null, error: 'subida' };
    }

    // La foto entra a la galería con la RPC: si el auto no tenía principal, esta pasa a serlo
    let errorRuta: { message: string } | null;
    try {
      ({ error: errorRuta } = await this.db.rpc('agregar_foto_vehiculo', { p_vehiculo_id: id, p_ruta: path }));
    } catch {
      return { path: null, error: 'ruta', detalle: 'Sin conexión. La foto no se guardó en la galería.' };
    }
    if (errorRuta) {
      return { path: null, error: 'ruta', detalle: `${errorRuta.message}. La foto no se guardó en la galería.` };
    }

    return { path, error: null };
  }

  /** Hace principal una foto del auto (la que muestran el listado, Vender y Registrar gasto). */
  async usarComoPrincipal(fotoId: string): Promise<{ success: boolean; error?: string }> {
    let error: { message: string } | null;
    try {
      ({ error } = await this.db.rpc('usar_como_principal', { p_foto_id: fotoId }));
    } catch {
      return { success: false, error: 'Sin conexión. No se pudo confirmar si cambió la principal: revisá antes de reintentar.' };
    }
    if (error) {
      return { success: false, error: `${error.message}. No se cambió nada.` };
    }
    return { success: true };
  }

  /** Baja lógica: la foto deja de verse en la galería. El archivo queda en Storage. */
  async quitarFoto(fotoId: string): Promise<{ success: boolean; error?: string }> {
    let error: { message: string } | null;
    try {
      ({ error } = await this.db.rpc('quitar_foto', { p_foto_id: fotoId }));
    } catch {
      return { success: false, error: 'Sin conexión. No se pudo confirmar si se quitó la foto: revisá antes de reintentar.' };
    }
    if (error) {
      return { success: false, error: `${error.message}. No se quitó nada.` };
    }
    return { success: true };
  }

  /** Varias fotos en secuencia. Si una falla, las demás se guardan igual. El límite de 10 vigentes se chequea antes. */
  async agregarFotos(
    id: string,
    fotos: Blob[],
    fotosVigentes: number,
    onProgreso?: (hecho: number, total: number) => void
  ): Promise<AgregarFotosResult> {
    const LIMITE = 10;
    const caben = LIMITE - fotosVigentes;
    if (fotos.length > caben) {
      return {
        success: false,
        agregadas: 0,
        fallidas: [],
        error: caben <= 0
          ? 'Este vehículo ya tiene 10 fotos'
          : `Solo podés agregar ${caben} foto${caben === 1 ? '' : 's'} más`,
      };
    }
    const fallidas: Array<{ numero: number; error: string }> = [];
    let agregadas = 0;
    for (let i = 0; i < fotos.length; i++) {
      onProgreso?.(i + 1, fotos.length);
      const res = await this.agregarFoto(id, fotos[i]);
      if (res.success) {
        agregadas += 1;
      } else {
        fallidas.push({ numero: i + 1, error: res.error ?? 'No se pudo subir la foto' });
      }
    }
    return { success: fallidas.length === 0, agregadas, fallidas };
  }

  async agregarFoto(id: string, foto: Blob): Promise<AgregarFotoResult> {
    if (!this.storage) {
      return { success: false, error: 'No hay conexión para guardar la foto' };
    }
    const subida = await this.subirFotoYGuardarRuta(id, foto);
    if (subida.error) {
      return { success: false, error: subida.detalle ?? AVISO_FOTO_AGREGAR[subida.error] };
    }
    const { data } = await this.storage.from('vehiculos').createSignedUrls([subida.path], 3600);
    return { success: true, fotoUrl: data?.[0]?.signedUrl };
  }
}
