# Backlog — Machoman Automotores

*Sale del documento de diseño v2 (`Machoman Automotores — Sistema de Gestión.md`). Historias cortas y verticales: cada una se usa de punta a punta (pantalla + datos). Sin criterios de aceptación ni detalle de implementación: eso se trabaja después con `/story`, de a una historia.*

## Contexto

Sistema de gestión interna para una agencia de compra y venta de vehículos usados, para los 3 socios (al menos uno con manejo tecnológico mínimo). Reemplaza la agenda física: compras, ventas, gastos, ingresos y balances.

**Stack:** Astro + TypeScript con islas de React, PWA instalable; Supabase (Postgres, Auth, Storage, RLS, funciones RPC); hosting en Vercel o Netlify.

**Decisiones caras de cambiar:**
- Multi-organización: no (una sola agencia).
- Permisos o roles: no, los 3 socios ven y hacen todo.
- Offline / sincronización: no, la PWA requiere conexión.
- Multimoneda / multi-idioma: no, todo en pesos (ARS, enteros sin centavos) y en castellano.

> La infraestructura (proyecto Supabase, migraciones, esqueleto Astro, PWA, vinculación del dispositivo y PIN) no tiene historias propias: se construye dentro de la primera historia que la necesita (E1-01).

---

## Etapa 1 — Versión mínima funcional

1. **E1-01 · Vincular celular y entrar con PIN** — Como socio, quiero vincular mi celular o compu una sola vez con mi PIN de 4 dígitos y después entrar solo tocándolo en un teclado numérico grande en pantalla, para no recordar contraseñas ni elegir mi perfil y que quede registrado que fui yo. · *Si se olvida el PIN, se vuelve a vincular.*
   - **E1-01b · Cambiar mi PIN** — Como socio, quiero cambiar mi PIN desde Configuración en mi propio dispositivo, poniendo el actual y después el nuevo, para cambiarlo si alguien lo vio sin tener que vincular de nuevo. Requiere: E1-01
2. **E1-02 · Cuentas y dinero disponible** — Como socio, quiero cargar las cuentas donde está la plata (caja, bancos, billeteras) con su saldo inicial y ver en Balances el dinero disponible total y por cuenta, para saber al toque cuánta plata tenemos. Requiere: E1-01
3. **E1-03 · Stock existente** — Como socio, quiero cargar los vehículos que ya tengo en stock con su costo, que cada uno reciba su código corto (`MC-###`) y verlos en un listado con foto, código, datos y estado, para no empezar de cero y encontrar rápido el que busco. Requiere: E1-01
   - **E1-03b · Agregar la foto después** — Como socio, quiero tocar un vehículo que figura "Sin foto" y sacarle la foto en ese momento, para no tener que cargarla al dar de alta y que igual quede identificable. Requiere: E1-03
4. **E1-04 · Comprar vehículo** — Como socio, quiero registrar la compra de un vehículo con foto, datos, precio y de qué cuenta salió la plata, para que quede en stock con su código y el saldo de la cuenta baje. Requiere: E1-02, E1-03 · *Ver preg. abierta 5 (¿compra con varias cuentas o con permuta?); la E1 asume una sola cuenta.*
5. **E1-05 · Detalle del vehículo** — Como socio, quiero ver el detalle de un vehículo con fecha de ingreso, origen, valor de ingreso, gastos asignados y costo real, para saber cuánto me costó. Requiere: E1-03
6. **E1-06 · Venta simple** — Como socio, quiero registrar una venta simple (vehículo, comprador, precio y en qué cuentas entró la plata) en pocos pasos, para que el vehículo quede vendido, los saldos suban y vea la ganancia en su detalle. Requiere: E1-02, E1-05
   - **E1-06b · Filtrar vehículos por estado** — Como socio, quiero filtrar el listado de Vehículos por estado (En stock / Vendidos / Todos), mostrando En stock de entrada, para encontrar rápido lo que tengo para vender sin que se mezclen los vendidos. Requiere: E1-06
7. **E1-07 · Gasto simple** — Como socio, quiero registrar un gasto con monto, categoría, descripción y cuenta, asignado a un vehículo o como general del negocio, para que el balance lo refleje y el gasto sume al costo real del auto. Requiere: E1-02, E1-05 · *Las categorías iniciales salen de la planilla de la Etapa 0 (preg. abierta 6).*
   - **E1-07b · Ingreso simple** — Como socio, quiero registrar un ingreso que no es una venta (ej. una comisión) con monto, categoría, descripción y cuenta, para que el balance lo refleje. Requiere: E1-07
8. **E1-08 · Anular un error** — Como socio, quiero ver el historial de movimientos con quién cargó cada uno y anular el equivocado indicando el motivo, para corregir errores y que el balance se recalcule. Requiere: E1-02 · *Cubre saldo inicial, ingreso y gasto; compra y venta van en E1-08b.*
   - **E1-08b · Anular una compra o una venta** — Como socio, quiero anular una compra, el alta de un vehículo de stock existente o una venta cargada por error, indicando el motivo, para que el stock, los saldos y la ganancia queden como si no hubiera pasado. Requiere: E1-08

## Etapa 2 — Negocios complejos

2. **E2-02 · Venta con permuta** — Como socio, quiero registrar una venta donde recibo un vehículo como parte de pago, para que entre al stock con su valor pactado y el sistema me avise si los números no cierran. Requiere: E1-06
3. **E2-03 · Venta con financiación** — Como socio, quiero registrar una venta con parte del precio financiada en cuotas, para que el sistema separe lo que entra hoy de lo que queda por cobrar y cuándo. Requiere: E1-06 · *Ver preg. abierta 4 (interés/recargo); hoy está fuera de alcance.*
4. **E2-04 · Cuotas por cobrar** — Como socio, quiero ver las cuotas pendientes por fecha con las vencidas resaltadas y marcarlas como cobradas (total o parcial) eligiendo la cuenta, para saber qué voy a cobrar y que lo cobrado pase al disponible. Requiere: E2-03
5. **E2-05 · Gasto repartido** — Como socio, quiero registrar un gasto repartido entre varios vehículos con montos distintos, o dejar parte o todo sin asignar, para casos como el chapista que cobra un solo precio o el mecánico que cobra por semana. Requiere: E1-07
6. **E2-06 · Pendientes de asignar** — Como socio, quiero ver los gastos pendientes de asignar agrupados por proveedor y asignarlos total o parcialmente a uno o más vehículos, para que el costo real de cada auto quede correcto. Requiere: E2-05
7. **E2-07 · Mover plata** — Como socio, quiero registrar pases de plata entre cuentas y aportes o retiros de cada socio, para que no se confundan con gastos ni ingresos del negocio. Requiere: E1-02

*Descartada: E2-01 Seña (decisión 2026-11-17: no se registran señas; la venta se cierra el mismo día).*

## Etapa 3 — Reportes y pulido

1. **E3-01 · Ganancia por período** — Como socio, quiero ver la ganancia de cada mes (ventas menos el costo real de lo vendido, menos gastos generales, más ingresos generales), para saber cómo va el negocio. Requiere: E1-06, E1-07, E1-07b
2. **E3-02 · Galería de fotos** — Como socio, quiero agregar varias fotos a un vehículo, para no depender de una sola foto para identificarlo. Requiere: E1-03
3. **E3-03 · Buscar vehículos** — Como socio, quiero buscar en el listado de Vehículos por código, marca, modelo o patente, combinado con el filtro En stock / Vendidos / Todos, para encontrar rápido un auto. Requiere: E1-06b

*Pulido general: se define después de usar la app unas semanas.*

## Etapa 4 — UX/UI (sale de AUDITORIA-UX.md, 2026-11-24)

1. **UX-01 · Base de estilos real** — Como socio, quiero que todas las pantallas se vean como fueron diseñadas (botones legibles, sin selectores de archivo sueltos, fotos y grillas en su lugar), para poder usar la app sin adivinar. Instalar Tailwind v4 en lugar del CSS copiado a mano; sacar el bloqueo de zoom. Ver auditoría §1.1.
2. **UX-02 · Arreglos de comportamiento** — Como socio, quiero que un doble toque no registre dos veces, que "Ver vehículos" funcione después de comprar y ver qué cuenta o socio elegí al mover plata, para no cargar errores. Ver auditoría §1.2. Requiere: UX-01
3. **UX-03 · Componentes base** — Encabezado, botones, input de monto con miles, opciones, diálogo, badge de estado, cargando/error. Ver §2.3–2.4, §3. Requiere: UX-01
4. **UX-04 · Inicio nuevo y navegación** — Tarjeta de plata y avisos, 4 acciones principales, barra inferior, atrás del celular. Ver §2.1–2.2. Requiere: UX-03
5. **UX-05 · Formularios de carga** — Orden de Gasto, Confirmar al final, "Cargar otro", Vender con ganancia estimada y revisión. Ver §2.3. Requiere: UX-03
6. **UX-06 · Detalle del vehículo** — Números clave arriba, acciones, secciones, Anular al final. Ver §3. Requiere: UX-03
7. **UX-07 · Listas** — Vehículos compacta, Movimientos por día, Cuotas con Llamar/WhatsApp, Ganancia con gráfico. Ver §3. Requiere: UX-03
8. **UX-08 · PWA** — Íconos PNG, safe areas, feedback táctil. Ver §4. Requiere: UX-01
