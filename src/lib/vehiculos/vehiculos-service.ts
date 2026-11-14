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

export interface VehiculosDbClient {
  rpc: (fn: string, params: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
  from: (table: string) => {
    select: (columns: string) => {
      order: (col: string, options: { ascending: boolean }) => Promise<{
        data: unknown[] | null;
        error: { message: string } | null;
      }>;
      maybeSingle: () => Promise<{
        data: unknown;
        error: { message: string } | null;
      }>;
    };
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
