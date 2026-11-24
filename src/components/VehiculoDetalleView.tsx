import React, { useState } from 'react';
import type { DetalleVehiculo, VistaPreviaAnulacion } from '../lib/vehiculos/vehiculos-service';
import { formatMoney } from '../lib/format/money';
import { diasEnStock, textoDiasEnStock } from '../lib/vehiculos/dias-en-stock';
import { GaleriaFotos } from './GaleriaFotos';
import { Encabezado } from './ui/Encabezado';
import { Boton } from './ui/Boton';
import { Dialogo } from './ui/Dialogo';
import { BadgeEstado } from './ui/BadgeEstado';
import { Seccion } from './ui/Seccion';

export interface VehiculoDetalleViewProps {
  detalle: DetalleVehiculo;
  fotoUrl: string | null;
  onVolver: () => void;
  onAgregarGasto?: () => void;
  /** Abre Vender con este auto ya elegido (solo autos en stock) */
  onVender?: () => void;
  /** Lo que se anula con la compra, para el aviso "¿Seguro?" antes de confirmar */
  vistaPrevia?: VistaPreviaAnulacion;
  onAnularVehiculo?: (motivo: string) => void | Promise<void | { success: boolean; error?: string }>;
  onAnularVenta?: (motivo: string) => void | Promise<void | { success: boolean; error?: string }>;
  /** Lleva al detalle de un auto recibido en parte de pago */
  onVerRecibido?: (vehiculoId: string) => void;
  /** Galería: agregar varias fotos, usar una como principal y quitar una (baja lógica) */
  onAgregarFotos?: (archivos: File[]) => void;
  onUsarComoPrincipal?: (fotoId: string) => void;
  onQuitarFoto?: (fotoId: string) => void;
  progresoFotos?: { hecho: number; total: number };
  /** Error de la última acción sobre fotos, mostrado en la galería */
  errorFotos?: string | null;
  /** Cobros de cuotas ya hechos de esta venta: salen de las cuentas si se anula la venta */
  cobrosCuotas?: { cantidad: number; total: number };
  /** Autos recibidos de la venta con lo que se anula con cada uno (para el aviso de anular la venta) */
  vistaPreviaVenta?: Array<{ id: string; codigo: string; gastosQueSeAnulan?: { cantidad: number; total: number } }>;
}

const ETIQUETA_ORIGEN: Record<DetalleVehiculo['origen'], string> = {
  compra: 'Compra',
  permuta: 'Permuta',
  inventario_inicial: 'Stock existente',
};

// Día y mes de un timestamp en hora de Buenos Aires: "14/11"
const diaMesBA = (iso: string): string => {
  const partes = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).formatToParts(new Date(iso));
  const dia = partes.find((p) => p.type === 'day')?.value ?? '';
  const mes = partes.find((p) => p.type === 'month')?.value ?? '';
  return `${dia}/${mes}`;
};

// "2026-11-14" -> "14/11/2026" (sin pasar por Date, para no desfasar la fecha por zona horaria)
const formatoFecha = (iso: string): string => {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
};

export const VehiculoDetalleView: React.FC<VehiculoDetalleViewProps> = ({
  detalle,
  fotoUrl,
  onVolver,
  onAgregarGasto,
  onVender,
  vistaPrevia,
  onAnularVehiculo,
  onAnularVenta,
  onVerRecibido,
  vistaPreviaVenta,
  cobrosCuotas,
  onAgregarFotos,
  onUsarComoPrincipal,
  onQuitarFoto,
  progresoFotos,
  errorFotos,
}) => {
  const [aAnular, setAAnular] = useState<'vehiculo' | 'venta' | null>(null);
  const [motivo, setMotivo] = useState<string>('');
  const [errorAnular, setErrorAnular] = useState<string | null>(null);
  // Mientras anula, el botón queda deshabilitado con "Guardando…" (evita la doble anulación)
  const [guardando, setGuardando] = useState<boolean>(false);

  const textoAviso = (): string[] => {
    if (aAnular === 'venta' && detalle.venta) {
      const cobros = detalle.venta.cobros.map((c) => `${formatMoney(c.monto)} de ${c.cuentaNombre}`).join(' y ');
      const lineasVenta = [
        `Vas a anular la venta de ${detalle.codigo} por ${formatMoney(detalle.venta.precioVenta)}; salen ${cobros}`,
      ];
      if (cobrosCuotas && cobrosCuotas.cantidad > 0) {
        const n = cobrosCuotas.cantidad;
        lineasVenta.push(
          `Además, ${n} ${n === 1 ? 'cobro de cuota' : 'cobros de cuotas'} por ${formatMoney(cobrosCuotas.total)} salen de las cuentas`
        );
      }
      // Venta financiada: las cuotas dejan de contar, y lo que quedaba por cobrar se anula con ellas
      const fin = detalle.venta.financiacion;
      if (fin) {
        lineasVenta.push(
          `Se anulan ${fin.cuotas.length} cuotas por ${formatMoney(fin.faltaCobrar)} por cobrar`
        );
      }
      // Autos recibidos en parte de pago: se anulan con la venta, y sus gastos si los tienen
      const recibidos = vistaPreviaVenta ?? [];
      if (recibidos.length > 0) {
        lineasVenta.push(`También se anulan ${recibidos.map((r) => r.codigo).join(' y ')}, que entraron por permuta`);
        const conGastos = recibidos.filter((r) => (r.gastosQueSeAnulan?.cantidad ?? 0) > 0);
        const cantidad = conGastos.reduce((acc, r) => acc + (r.gastosQueSeAnulan?.cantidad ?? 0), 0);
        const total = conGastos.reduce((acc, r) => acc + (r.gastosQueSeAnulan?.total ?? 0), 0);
        if (cantidad > 0) {
          lineasVenta.push(`Se van a anular también ${cantidad} ${cantidad === 1 ? 'gasto' : 'gastos'} por ${formatMoney(total)}`);
        }
      }
      return lineasVenta;
    }
    const lineas = [
      `Vas a anular ${detalle.origen === 'inventario_inicial' ? 'el alta' : 'la compra'} de ${detalle.codigo} por ${formatMoney(detalle.valorIngreso)}`,
    ];
    if (vistaPrevia && vistaPrevia.pagosCompra.length > 0) {
      lineas[0] += `; vuelven ${vistaPrevia.pagosCompra.map((p) => `${formatMoney(p.monto)} a ${p.cuentaNombre}`).join(' y ')}`;
    }
    // Gastos solo de este auto: se anulan enteros (la plata vuelve)
    const seAnulan = vistaPrevia?.gastosQueSeAnulan;
    if (seAnulan && seAnulan.cantidad > 0) {
      const n = seAnulan.cantidad;
      lineas.push(`Se van a anular también ${n} ${n === 1 ? 'gasto' : 'gastos'} por ${formatMoney(seAnulan.total)}`);
    }
    // Partes de gastos compartidos: quedan sin asignar, el gasto sigue para los otros autos
    const sinAsignar = vistaPrevia?.partesSinAsignar;
    if (sinAsignar && sinAsignar.cantidad > 0) {
      const n = sinAsignar.cantidad;
      lineas.push(
        `${formatMoney(sinAsignar.total)} de ${n} ${n === 1 ? 'gasto compartido' : 'gastos compartidos'} quedan sin asignar`
      );
    }
    return lineas;
  };

  const confirmarAnulacion = async () => {
    if (guardando) return;
    setGuardando(true);
    const accion = aAnular === 'venta' ? onAnularVenta : onAnularVehiculo;
    const res = (await accion?.(motivo.trim())) as { success: boolean; error?: string } | void;
    setGuardando(false);
    if (res && !res.success) {
      // Nada quedó anulado: el diálogo sigue abierto con el motivo para reintentar
      setErrorAnular(res.error ?? 'No se pudo anular. No se anuló nada.');
      return;
    }
    setErrorAnular(null);
    setAAnular(null);
  };

  // Vendido: cuenta hasta la venta. En stock o anulado: hasta hoy.
  const fechaVenta = detalle.estado === 'vendido' && !detalle.anulado && detalle.venta ? detalle.venta.fecha : undefined;
  const textoDias = textoDiasEnStock(diasEnStock({ fechaIngreso: detalle.fechaIngreso, fechaVenta }));
  const puedeVender = !!onVender && detalle.estado === 'en_stock' && !detalle.anulado;
  // Permuta: el origen lleva al auto vendido en cuya venta entró
  const idVentaOrigen = detalle.permutaDeVentaId ?? null;
  // Anular: venta si se vendió; si no, alta o compra (un auto que entró por permuta no se anula solo)
  const anulaVenta = detalle.estado === 'vendido';
  const puedeAnular = !detalle.anulado && (anulaVenta ? !!onAnularVenta : !!onAnularVehiculo && detalle.origen !== 'permuta');
  const etiquetaAnular = anulaVenta
    ? 'Anular venta'
    : detalle.origen === 'inventario_inicial'
      ? 'Anular alta'
      : 'Anular compra';
  const financiacion = detalle.venta?.financiacion;

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
      <Encabezado titulo="Detalle del vehículo" onVolver={onVolver} />

      {detalle.anulado && (
        <p role="status" className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
          Anulado por {detalle.anulado.por}
          {detalle.anulado.el ? ` el ${diaMesBA(detalle.anulado.el)}` : ''}
          {detalle.anulado.motivo ? ` · Motivo: ${detalle.anulado.motivo}` : ''}
        </p>
      )}

      <article className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {detalle.fotos ? (
          <GaleriaFotos
            fotos={detalle.fotos}
            anulado={!!detalle.anulado}
            progreso={progresoFotos}
            error={errorFotos}
            onAgregar={(archivos) => onAgregarFotos?.(archivos)}
            onUsarComoPrincipal={(id) => onUsarComoPrincipal?.(id)}
            onQuitar={(id) => onQuitarFoto?.(id)}
            paraCompartir={{ codigo: detalle.codigo, texto: `${detalle.marca} ${detalle.modelo} ${detalle.anio}` }}
          />
        ) : fotoUrl ? (
          <img src={fotoUrl} alt={`${detalle.marca} ${detalle.modelo}`} className="w-full h-64 object-cover" />
        ) : (
          <div className="w-full h-64 flex items-center justify-center bg-gray-100 text-sm text-gray-500">
            Sin foto
          </div>
        )}

        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-blue-700">{detalle.codigo}</span>
            <BadgeEstado estado={detalle.anulado ? 'anulado' : detalle.estado} />
          </div>
          <h2 className="text-base font-semibold text-gray-900">
            {detalle.marca} {detalle.modelo}
          </h2>
          <p className="text-sm text-gray-600">{detalle.anio}</p>
          <p className="text-sm font-medium text-gray-700">{textoDias}</p>

          {/* Número clave: costo real en stock, ganancia o pérdida si se vendió; nada si está anulado */}
          {!detalle.anulado && detalle.estado === 'vendido' && detalle.venta ? (
            detalle.venta.ganancia < 0 ? (
              <div data-testid="numero-clave" className="pt-2">
                <span className="text-xs uppercase font-semibold text-red-600 tracking-wider">Pérdida</span>
                <div className="text-3xl font-extrabold text-red-600 mt-1 whitespace-nowrap">
                  {formatMoney(detalle.venta.ganancia)}
                </div>
              </div>
            ) : (
              <div data-testid="numero-clave" className="pt-2">
                <span className="text-xs uppercase font-semibold text-green-700 tracking-wider">Ganancia</span>
                <div className="text-3xl font-extrabold text-green-700 mt-1 whitespace-nowrap">
                  {formatMoney(detalle.venta.ganancia)}
                </div>
              </div>
            )
          ) : !detalle.anulado && detalle.estado !== 'vendido' ? (
            <div data-testid="numero-clave" className="pt-2">
              <span className="text-xs uppercase font-semibold text-gray-500 tracking-wider">Costo real</span>
              <div data-testid="costo-real" className="text-3xl font-extrabold text-gray-900 mt-1 whitespace-nowrap">
                {formatMoney(detalle.costoReal)}
              </div>
              {detalle.valorIngreso === 0 && <p className="text-xs text-amber-700 mt-1">Costo desconocido</p>}
            </div>
          ) : null}
        </div>
      </article>

      {!detalle.anulado && (puedeVender || onAgregarGasto) && (
        <div data-testid="acciones" className="mt-4 flex gap-3">
          {puedeVender && (
            <div className="flex-1">
              <Boton anchoCompleto onClick={onVender}>
                Vender
              </Boton>
            </div>
          )}
          {onAgregarGasto && (
            <div className="flex-1">
              <Boton anchoCompleto variante="secundario" onClick={onAgregarGasto}>
                Agregar gasto
              </Boton>
            </div>
          )}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl px-4 shadow-sm mt-4">
        <Seccion titulo="Datos" abierta>
          <dl className="text-sm text-gray-700 space-y-1">
            <div className="flex justify-between">
              <dt className="text-gray-500">Fecha de ingreso</dt>
              <dd>{formatoFecha(detalle.fechaIngreso)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Origen</dt>
              <dd>
                {detalle.origen === 'permuta' && detalle.permutaDeVenta && idVentaOrigen ? (
                  <button
                    type="button"
                    onClick={() => onVerRecibido?.(idVentaOrigen)}
                    className="text-right text-blue-700 hover:underline"
                  >
                    Permuta en la venta de {detalle.permutaDeVenta}
                  </button>
                ) : detalle.origen === 'permuta' && detalle.permutaDeVenta ? (
                  `Permuta en la venta de ${detalle.permutaDeVenta}`
                ) : (
                  ETIQUETA_ORIGEN[detalle.origen]
                )}
              </dd>
            </div>
            {detalle.vendedor && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Vendedor</dt>
                <dd>{detalle.vendedor}</dd>
              </div>
            )}
            {detalle.patente && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Patente</dt>
                <dd>{detalle.patente}</dd>
              </div>
            )}
            {detalle.color && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Color</dt>
                <dd>{detalle.color}</dd>
              </div>
            )}
          </dl>
        </Seccion>

        {detalle.origen === 'compra' && (
          <Seccion titulo="Compra">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Cómo se pagó</h3>
            {detalle.pagos.length === 0 ? (
              <p className="text-sm text-gray-600">Sin pagos registrados</p>
            ) : (
              <ul className="space-y-1 text-sm text-gray-800">
                {detalle.pagos.map((p, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{p.cuentaNombre}</span>
                    <span className="font-medium whitespace-nowrap">{formatMoney(p.monto)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>
        )}

        <Seccion titulo="Gastos">
          <dl className="text-sm text-gray-700 space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-500">Valor de ingreso</dt>
              <dd className="whitespace-nowrap">{formatMoney(detalle.valorIngreso)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Gastos asignados</dt>
              <dd className="whitespace-nowrap">{formatMoney(detalle.gastosAsignados)}</dd>
            </div>
          </dl>
          {(detalle.gastos ?? []).length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-gray-800">
              {(detalle.gastos ?? []).map((g, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>
                    <span className="text-gray-500">{formatoFecha(g.fecha)}</span> · {g.categoria}
                    {g.descripcion ? ` · ${g.descripcion}` : ''}
                  </span>
                  <span className="font-medium whitespace-nowrap">{formatMoney(g.monto)}</span>
                </li>
              ))}
            </ul>
          ) : (
            detalle.gastosAsignados === 0 && (
              <p className="text-xs text-gray-500 mt-1">Todavía no hay gastos cargados</p>
            )
          )}
        </Seccion>

        {detalle.venta && (
          <Seccion titulo="Venta">
            <dl className="text-sm text-gray-700 space-y-1">
              <div className="flex justify-between">
                <dt className="text-gray-500">Fecha de venta</dt>
                <dd>{formatoFecha(detalle.venta.fecha)}</dd>
              </div>
              {detalle.venta.comprador && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Comprador</dt>
                  <dd>{detalle.venta.comprador}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Precio de venta</dt>
                <dd className="whitespace-nowrap">{formatMoney(detalle.venta.precioVenta)}</dd>
              </div>
            </dl>

            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mt-3 mb-1">Cómo se cobró</h3>
            <ul className="space-y-1 text-sm text-gray-800">
              {detalle.venta.cobros.map((c, i) => (
                <li key={i} className="flex justify-between">
                  <span>{c.cuentaNombre}</span>
                  <span className="font-medium whitespace-nowrap">{formatMoney(c.monto)}</span>
                </li>
              ))}
            </ul>

            {(detalle.venta.permutas ?? []).length > 0 && (
              <ul className="space-y-1 text-sm text-gray-800 mt-1">
                {(detalle.venta.permutas ?? []).map((p) => (
                  <li key={p.vehiculoId} className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => onVerRecibido?.(p.vehiculoId)}
                      className="text-left text-blue-700 hover:underline"
                    >
                      Permuta: {p.codigo} {p.marca} {p.modelo}
                    </button>
                    <span className="font-medium whitespace-nowrap">{formatMoney(p.valorPactado)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>
        )}

        {financiacion && (
          <Seccion titulo="Cuotas">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-800">
                {`Financiación ${formatMoney(financiacion.monto)} en ${financiacion.cantidadCuotas} cuotas`}
              </p>
              <ul aria-label="Cuotas financiadas" className="text-sm text-gray-800 space-y-1">
                {financiacion.cuotas.map((c) => (
                  <li key={c.numero}>
                    {`${c.numero} · ${formatoFecha(c.fechaVencimiento)} · ${formatMoney(c.monto)} · ${c.estado === 'pendiente' ? 'Pendiente' : c.estado}`}
                  </li>
                ))}
              </ul>
              <p className="text-sm font-semibold text-amber-700">{`Falta cobrar ${formatMoney(financiacion.faltaCobrar)}`}</p>
            </div>
          </Seccion>
        )}
      </div>

      {puedeAnular && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <Boton
            anchoCompleto
            variante="peligroBorde"
            onClick={() => {
              setMotivo('');
              setAAnular(anulaVenta ? 'venta' : 'vehiculo');
            }}
          >
            {etiquetaAnular}
          </Boton>
        </div>
      )}

      {aAnular && (
        <Dialogo titulo="¿Seguro?" onCerrar={() => setAAnular(null)} guardando={guardando}>
          {textoAviso().map((l, i) => (
            <p key={i} className="text-sm text-gray-900">
              {l}
            </p>
          ))}
          <div>
            <label htmlFor="anular-vehiculo-motivo" className="block text-xs font-semibold text-gray-700 mb-1">
              Motivo (obligatorio)
            </label>
            <input
              id="anular-vehiculo-motivo"
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base bg-white"
            />
          </div>
          <Boton anchoCompleto variante="secundario" onClick={() => setAAnular(null)}>
            Volver
          </Boton>
          <Boton
            anchoCompleto
            variante="peligro"
            disabled={motivo.trim() === ''}
            guardando={guardando}
            onClick={() => void confirmarAnulacion()}
          >
            Sí, anular
          </Boton>
          {errorAnular && (
            <p role="alert" className="text-sm text-red-700">
              {errorAnular}
            </p>
          )}
        </Dialogo>
      )}
    </div>
  );
};
