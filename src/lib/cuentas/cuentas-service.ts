export type TipoCuenta = 'efectivo' | 'banco' | 'billetera';

export interface CuentaItem {
  id: string;
  nombre: string;
  tipo: TipoCuenta;
  saldo: number;
  activa?: boolean;
}

export interface CrearCuentaParams {
  nombre: string;
  tipo: TipoCuenta;
  saldoInicial: number;
}

export interface CrearCuentaResult {
  success: boolean;
  error?: string;
  cuenta?: CuentaItem;
}

export interface CuentasDbClient {
  rpc: (fn: string, params: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
  from: (table: string) => {
    select: (query?: string) => {
      order?: (col: string, options?: { ascending?: boolean }) => Promise<{
        data: unknown;
        error: { message: string } | null;
      }>;
      maybeSingle?: () => Promise<{
        data: unknown;
        error: { message: string } | null;
      }>;
    };
  };
}

export class CuentasService {
  private db: CuentasDbClient;

  constructor(db: CuentasDbClient) {
    this.db = db;
  }

  async crearCuenta(params: CrearCuentaParams): Promise<CrearCuentaResult> {
    const { nombre, tipo, saldoInicial } = params;
    const nombreLimpio = nombre?.trim();

    if (!nombreLimpio) {
      return { success: false, error: 'El nombre no puede estar vacío' };
    }

    if (!['efectivo', 'banco', 'billetera'].includes(tipo)) {
      return { success: false, error: 'Tipo de cuenta inválido' };
    }

    if (saldoInicial < 0) {
      return { success: false, error: 'El saldo inicial no puede ser negativo' };
    }

    const { data, error } = await this.db.rpc('crear_cuenta', {
      p_nombre: nombreLimpio,
      p_tipo: tipo,
      p_saldo_inicial: saldoInicial,
    });

    if (error) {
      if (error.message.includes('Ya hay una cuenta con ese nombre')) {
        return { success: false, error: 'Ya hay una cuenta con ese nombre' };
      }
      return { success: false, error: error.message || 'Error al crear la cuenta' };
    }

    const cuenta = data as CuentaItem;
    return { success: true, cuenta };
  }

  async obtenerCuentasConSaldo(): Promise<CuentaItem[]> {
    const { data, error } = await this.db
      .from('v_saldo_cuentas')
      .select('id, nombre, tipo, saldo, activa')
      .order!('created_at', { ascending: true });

    if (error || !data) {
      return [];
    }

    return (data as Array<{ id: string; nombre: string; tipo: TipoCuenta; saldo: number | string; activa?: boolean }>).map((item) => ({
      ...item,
      saldo: Number(item.saldo) || 0,
    }));
  }

  async obtenerDineroDisponible(): Promise<number> {
    const { data, error } = await this.db
      .from('v_dinero_disponible')
      .select('total')
      .maybeSingle!();

    if (error || !data) {
      return 0;
    }

    const row = data as { total?: number | string | null };
    return Number(row.total) || 0;
  }
}
