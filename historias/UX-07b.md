# UX-07b · Movimientos agrupados por día y con filtro

*Refinada con `/story`. Sale de dividir UX-07. Fuente: `AUDITORIA-UX.md` §3 (Movimientos: sin agrupar por día y sin filtros).*

*Se apoya en lo que ya está:*
- *`MovimientosView` con la lista paginada de a 50 y "Ver más" (E1-08);*
- *`listarMovimientos(desde)`, ordenado por `created_at` descendente con `.range`;*
- *`Opciones` de `src/components/ui/`;*
- *la lista de cuentas de `CuentasService`.*

*Sin cambios de base ni RPC. Requiere: UX-03b.*

## Historia
Como socio, quiero ver los movimientos agrupados por día y poder filtrar entradas, salidas o una cuenta, para encontrar rápido un movimiento y controlar una caja.

## Criterios de aceptación
- [ ] **Agrupados por día.** Dado que abro **Movimientos**, cuando miro la lista, entonces los movimientos están agrupados por día, cada grupo con un encabezado: **"Hoy"**, **"Ayer"**, o el día abreviado con la fecha ("**lun 18/11**"), en hora de Buenos Aires. Todo lo demás de cada fila sigue igual (tipo, cuenta, monto con color, quién cargó, anulado tachado), y "Ver más" sigue al final.
- [ ] **Filtrar.** Dado la lista, cuando elijo arriba **Todos / Entradas / Salidas** y una cuenta (**Todas** o una en particular), entonces la lista muestra solo esos movimientos, desde el más nuevo, y "Ver más" trae **más de los filtrados**. Entradas son los que suman a una cuenta y Salidas los que restan. Si no hay ninguno, veo "No hay movimientos con este filtro". Al salir y volver a Movimientos, el filtro sigue como estaba mientras la app está abierta.
- [ ] **Nada se rompe.** Dado un movimiento filtrado o agrupado, cuando lo toco, veo su detalle y puedo anularlo igual que hoy. Después de anular, la lista se recarga **con el mismo filtro**.

## Plan
- **Filtro en la consulta**, no en la pantalla, para que "Ver más" pagine sobre lo filtrado:
  - `listarMovimientos` recibe además `{ sentido?: 'entradas' | 'salidas', cuentaId? }`;
  - agrega `.gt('monto', 0)` / `.lt('monto', 0)` y `.eq('cuenta_id', …)` a la consulta que ya existe;
  - mantiene el orden y el `.range` de a 50.

  Sin cambios de base: son filtros de PostgREST sobre la tabla y el RLS de siempre.
- **Agrupar por día** en la pantalla:
  - una función pura que agrupa la lista ya cargada por `fecha` (la fecha `date` del movimiento, que ya está en hora de Buenos Aires), en grupos consecutivos;
  - el encabezado del grupo se calcula con "hoy" en Buenos Aires (`Intl` con `timeZone`), como en `dias-en-stock`: Hoy, Ayer, o `lun 18/11`;
  - al traer más con "Ver más", si el primer día nuevo es el mismo que el último grupo, se une al grupo.
- **Filtros arriba:**
  - `Opciones` Todos / Entradas / Salidas;
  - un selector de cuenta (Todas + cada cuenta) con `Opciones` en 2 columnas o un `<select>` de 16 px;
  - al cambiar cualquiera, se vuelve a pedir desde 0;
  - el filtro elegido lo guarda quien navega, como la búsqueda de Vehículos (E3-03), así se mantiene al ir al detalle y volver.
- **Tests:**
  - **Agrupado:** grupos consecutivos; Hoy, Ayer y "lun 18/11" con fecha simulada; unión con la página siguiente.
  - **Consulta:** `listarMovimientos` con cada combinación de filtro (sentido y cuenta).
  - **Pantalla:**
    - cambiar el filtro pide desde 0;
    - "Ver más" pide la siguiente página con el mismo filtro;
    - vacío con el filtro;
    - anular recarga con el filtro.
  - **Regresión:** los tests actuales de Movimientos verdes.

## Fuera de alcance
- Rango de fechas, filtro por tipo, por vehículo o por socio (decidido: solo entradas/salidas y cuenta).
- Totales por día.
- Rediseño de cada fila o del detalle del movimiento.

## Riesgos / notas
- **Orden por `created_at` vs. agrupado por `fecha`:** hoy cada movimiento se carga con la fecha del día, así que coinciden. Si en el futuro se cargan movimientos con fecha pasada, un mismo día podría aparecer en dos grupos separados. Con la regla actual (todo con fecha de hoy) no pasa.
- **Un pase entre cuentas** son dos movimientos, uno de entrada y otro de salida. Con el filtro "Entradas" se ve solo la pata que entra, que es lo esperado.

## Decisiones tomadas
- Agrupados por día con encabezado "Hoy", "Ayer" o "lun 18/11".
- Filtro simple arriba con `Opciones` Todos / Entradas / Salidas y un selector de cuenta (Todas o una). Sin rango de fechas.
- Se mantiene "Ver más" (paginación existente).
- Sin cambios de base ni RPC.

## Dudas abiertas
- Ninguna.
