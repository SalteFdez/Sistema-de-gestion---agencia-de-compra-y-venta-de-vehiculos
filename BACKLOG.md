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
4. **E1-04 · Comprar vehículo** — Como socio, quiero registrar la compra de un vehículo con foto, datos, precio y de qué cuenta salió la plata, para que quede en stock con su código y el saldo de la cuenta baje. Requiere: E1-02, E1-03 · *Ver preg. abierta 5 (¿compra con varias cuentas o con permuta?); la E1 asume una sola cuenta.*
5. **E1-05 · Detalle del vehículo** — Como socio, quiero ver el detalle de un vehículo con fecha de ingreso, origen, valor de ingreso, gastos asignados y costo real, para saber cuánto me costó. Requiere: E1-03
6. **E1-06 · Venta simple** — Como socio, quiero registrar una venta simple (vehículo, comprador, precio y en qué cuentas entró la plata) en pocos pasos, para que el vehículo quede vendido, los saldos suban y vea la ganancia en su detalle. Requiere: E1-02, E1-05
7. **E1-07 · Gasto o ingreso simple** — Como socio, quiero registrar un gasto o un ingreso con monto, categoría, descripción y cuenta, asignado a un vehículo o como general del negocio, para que el balance lo refleje y el gasto sume al costo real del auto. Requiere: E1-02, E1-05 · *Las categorías iniciales salen de la planilla de la Etapa 0 (preg. abierta 6).*
8. **E1-08 · Anular un error** — Como socio, quiero ver el historial de movimientos con quién cargó cada uno y anular el equivocado indicando el motivo, para corregir errores y que el balance se recalcule. Requiere: E1-02

## Etapa 2 — Negocios complejos

1. **E2-01 · Seña** — Como socio, quiero registrar una seña sobre un vehículo, para que quede reservado y la seña se descuente al venderlo. Requiere: E1-06
2. **E2-02 · Venta con permuta** — Como socio, quiero registrar una venta donde recibo un vehículo como parte de pago, para que entre al stock con su valor pactado y el sistema me avise si los números no cierran. Requiere: E1-06
3. **E2-03 · Venta con financiación** — Como socio, quiero registrar una venta con parte del precio financiada en cuotas, para que el sistema separe lo que entra hoy de lo que queda por cobrar y cuándo. Requiere: E1-06 · *Ver preg. abierta 4 (interés/recargo); hoy está fuera de alcance.*
4. **E2-04 · Cuotas por cobrar** — Como socio, quiero ver las cuotas pendientes por fecha con las vencidas resaltadas y marcarlas como cobradas (total o parcial) eligiendo la cuenta, para saber qué voy a cobrar y que lo cobrado pase al disponible. Requiere: E2-03
5. **E2-05 · Gasto repartido** — Como socio, quiero registrar un gasto repartido entre varios vehículos con montos distintos, o dejar parte o todo sin asignar, para casos como el chapista que cobra un solo precio o el mecánico que cobra por semana. Requiere: E1-07
6. **E2-06 · Pendientes de asignar** — Como socio, quiero ver los gastos pendientes de asignar agrupados por proveedor y asignarlos total o parcialmente a uno o más vehículos, para que el costo real de cada auto quede correcto. Requiere: E2-05
7. **E2-07 · Mover plata** — Como socio, quiero registrar pases de plata entre cuentas y aportes o retiros de cada socio, para que no se confundan con gastos ni ingresos del negocio. Requiere: E1-02

## Etapa 3 — Reportes y pulido

1. **E3-01 · Reportes** — Como socio, quiero ver la ganancia por período y por vehículo, los gastos por categoría y los días en stock, para saber cómo va el negocio. Requiere: E1-06
2. **E3-02 · Galería de fotos** — Como socio, quiero agregar varias fotos a un vehículo, para no depender de una sola foto para identificarlo. Requiere: E1-03

*Pendientes de definir antes de convertirlos en historias:* "búsqueda y filtros avanzados" y "pulido general de la interfaz" figuran en la Etapa 3 del documento pero sin detalle de qué incluyen.
