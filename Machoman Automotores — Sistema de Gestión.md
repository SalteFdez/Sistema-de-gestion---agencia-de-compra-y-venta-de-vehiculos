# Machoman Automotores — Sistema de Gestión Interna

*Documento de diseño — versión 2 (lista para iniciar desarrollo)*

> **Cambios respecto de la v1:** se corrigió el ejemplo guía (los números no sumaban), se agregó la **compra de vehículos** (no estaba contemplada), cuentas múltiples (efectivo + bancos), movimientos entre cuentas, aportes/retiros de socios, seña, saldos iniciales y anulación de movimientos. Se cerraron las decisiones técnicas (login con PIN, Astro + islas, moneda) y se agregaron glosario, esquema de base de datos, criterios de aceptación de la Etapa 1 y preguntas abiertas.

---

## 1. Contexto y problema

Machoman Automotores es una agencia de compra y venta de vehículos usados operada por 3 socios que conocen todos los movimientos del negocio. Hoy todo se registra a mano en una agenda física: compras, ventas, gastos e ingresos. Esto genera errores, pérdida de información y dificultad para saber el estado real del negocio en cualquier momento.

Se decidió construir una solución a medida (no un sistema contable genérico) porque el negocio tiene particularidades que un ERP estándar no resuelve de forma simple: ventas con financiación y permuta de vehículos, gastos compartidos entre varios vehículos, pagos a proveedores que se asignan después a un vehículo específico, y usuarios con nulo manejo de tecnología.

## 2. Requisitos

### 2.1 Requisitos principales

1. **Multiplataforma**: accesible desde Android, iPhone y computadoras, sin instalar nada desde una tienda de apps.
2. **Extremadamente simple de usar**: al menos uno de los socios tiene manejo tecnológico mínimo. Cargar un movimiento debe tomar segundos.
3. **Disponible cuanto antes**: primera versión funcional rápido; el resto se construye incrementalmente.
4. **Identificación clara de vehículos**: puede haber vehículos iguales (misma marca/modelo/año); la patente no sirve para la memoria humana. Se necesita algo visual y un código corto.
5. **Soporte para negocios complejos**: una venta puede combinar dinero ahora, financiación en cuotas y un vehículo recibido como parte de pago (que pasa a ser stock).
6. **Balances siempre disponibles**: pantalla separada y simple, consultable por cualquier socio en cualquier momento.
7. **Solidez por sobre novedad**: base técnica estable y probada.

### 2.2 Fuera de alcance (v1)

Quedan explícitamente afuera para no demorar la primera versión:

- **Multimoneda**: todo se maneja en pesos argentinos (ARS).
- **Funcionamiento offline**: la app es instalable (PWA) pero requiere conexión.
- **Facturación / AFIP / contabilidad formal**.
- **Intereses o recargos** en la financiación.
- **Permisos por rol**: los 3 socios ven y pueden hacer todo.

## 3. Glosario

| Término | Significado |
|---|---|
| **Vehículo** | Auto, moto o utilitario que la agencia tiene o tuvo en stock. |
| **Código corto** | Identificador interno autogenerado (`MC-014`). Es como el equipo se refiere a cada vehículo. |
| **Cuenta** | Lugar donde está el dinero real: caja de efectivo, cuenta bancaria o billetera virtual. |
| **Movimiento** | Entrada o salida de dinero real en una cuenta. Es la única fuente de verdad del dinero disponible. |
| **Venta** | Operación de venta de un vehículo. Puede tener varios componentes de pago. |
| **Componente de pago** | Cada parte con la que se paga una venta: dinero ahora (en una o más cuentas), seña previa, vehículo en permuta, financiación. |
| **Permuta** | Vehículo recibido como parte de pago. Entra al stock con el valor pactado. |
| **Seña** | Dinero recibido para reservar un vehículo antes de la venta. Se descuenta del precio al vender. |
| **Financiación / Cuota** | Parte del precio que se cobra a futuro, dividida en cuotas con fecha de vencimiento. Es dinero *por cobrar*, no disponible. |
| **Gasto** | Salida de dinero por un costo (chapista, mecánico, trámite, alquiler…). |
| **Asignación** | Parte de un gasto imputada a un vehículo concreto. |
| **Sin asignar** | Parte de un gasto que todavía no se sabe a qué vehículo corresponde. |
| **Contacto** | Persona con la que se opera: comprador, vendedor o proveedor. |
| **Costo real** | Lo que realmente costó un vehículo: valor de ingreso (compra o permuta) + gastos asignados. |
| **Ganancia** | Precio de venta − costo real. |

## 4. Stack y decisiones técnicas

- **Frontend**: **Astro + TypeScript, con islas de React** para las partes interactivas (asistentes de carga, formularios, listados). Astro sirve las páginas de forma liviana; React maneja el estado de los formularios. La app se configura como **PWA instalable** (ícono en el celular, sin tiendas). **No funciona offline** en v1.
- **Backend / Base de datos**: **Supabase** (Postgres gestionado).
  - **Auth** para el login de los 3 socios.
  - **Storage** para las fotos de vehículos. Las fotos se comprimen en el celular antes de subir (lado mayor ~1280 px, JPEG) para que la carga sea rápida con datos móviles.
  - **RLS (Row Level Security)**: cualquier usuario autenticado puede leer y escribir todo; usuarios anónimos no acceden a nada.
  - **Funciones Postgres (RPC)** para las operaciones que tocan varias tablas (registrar compra, venta, transferencia, asignar gasto, anular). Así cada operación se guarda completa o no se guarda (atómica).
- **Acceso: PIN de 4 dígitos por dispositivo, con teclado numérico en pantalla** (ver 4.1).
- **Montos**: enteros en pesos (`bigint`), sin centavos. Se muestran con separador de miles (`$ 5.000.000`).
- **Hosting**: **Vercel** para la PWA (deploy automático desde el repo); Supabase aloja base de datos, API y fotos.
- **Socios / usuarios**: Agustín Fernandez (socio 1, administra las credenciales de vinculación), Lautaro (socio 2) y Antonio (socio 3).

### 4.1 Acceso con PIN

**Decisión:** el día a día no tiene login ni selección de perfil. Al abrir la app se pide solo un **PIN de 4 dígitos**, que **cada socio define y puede cambiar en su propio dispositivo**.

**Por qué así (y no un PIN global validado en el servidor):**
- Supabase exige contraseñas de mínimo 6 caracteres; un PIN de 4 dígitos no puede ser la contraseña real.
- Validar un PIN de 4 dígitos en el servidor es inseguro: la app está en una URL pública y 10.000 combinaciones se prueban rápido.
- Atando el PIN al dispositivo, la seguridad real la da la sesión de Supabase guardada, y el PIN funciona como **candado de uso diario**. Además se conserva **quién cargó cada movimiento** sin que nadie tenga que elegir su perfil.

**Cómo funciona:**
1. **Vincular dispositivo (una sola vez por celular/compu)**: se ingresa la credencial completa del socio (email interno + contraseña larga, la tiene el socio con más manejo técnico) y se elige un PIN de 4 dígitos, confirmándolo dos veces. La sesión de Supabase queda guardada y el dispositivo queda asociado a ese socio.
2. **Uso diario**: al abrir la app (o al volver después de **5 minutos** en segundo plano) aparece la pantalla de PIN. Con el PIN correcto se entra directo a la pantalla principal.
3. **Cambiar PIN**: desde Configuración, pidiendo el PIN actual.
4. **Olvidé el PIN / se borraron los datos del navegador**: se vuelve a vincular el dispositivo (paso 1).
5. El PIN se guarda en el dispositivo **hasheado** (nunca en texto plano) y no viaja al servidor. Tras **5 intentos fallidos** se bloquea 30 segundos.

**Teclado numérico en pantalla:**
- No se usa el teclado del celular: la pantalla de PIN muestra un **teclado propio** con botones grandes 1–9, 0 y "borrar", en grilla de 3 columnas, apto para dedos grandes.
- Arriba, 4 círculos que se van llenando a medida que se tocan números (no se muestran los dígitos).
- Al completar el 4.º dígito se valida solo, sin botón "entrar". Si es incorrecto, los círculos tiemblan, se vacían y se puede reintentar.
- El mismo componente se usa para crear, confirmar y cambiar el PIN.

**Limitación aceptada:** el PIN protege contra alguien que agarra el celular, no contra alguien con conocimientos técnicos y acceso al dispositivo. Para 3 socios de confianza es suficiente. Si un dispositivo se pierde, se cierra su sesión desde Supabase (cambiando la contraseña del socio).

**Alternativa si se prefiere un único PIN para los 3:** es el mismo mecanismo, simplemente los 3 eligen el mismo PIN al vincular. No requiere cambios técnicos.

## 5. Modelo del dinero

El punto central del sistema es no mezclar tres conceptos que en la agenda quedan mezclados:

1. **Dinero real (disponible)**: plata que efectivamente ya está en alguna cuenta (caja, banco, billetera).
2. **Por cobrar**: plata que deben a futuro (cuotas de financiación), con fecha esperada. No cuenta como disponible hasta que se cobra.
3. **Inventario**: vehículos en stock (incluidos los recibidos en permuta), valuados a **costo real**.

### 5.1 Regla de oro

> **El dinero disponible nunca se guarda: se calcula siempre sumando los movimientos.** El saldo de cada cuenta es la suma de sus movimientos no anulados. Todo lo que mueve plata real (compra, venta, seña, cobro de cuota, gasto, ingreso, transferencia, aporte, retiro) genera uno o más movimientos.

Esto garantiza que el balance siempre coincide con lo cargado y que corregir un error es simplemente anular el movimiento equivocado.

### 5.2 Ejemplo guía (caso complejo real)

Venta de un auto (`MC-014`) en **$8.000.000**, pagado así:

- **$5.000.000** ahora: $3.000.000 en efectivo + $2.000.000 por transferencia al banco.
- **Moto 110cc** como parte de pago, valuada en **$1.000.000**.
- **$2.000.000** financiados en **4 cuotas de $500.000** mensuales.

Control: $5.000.000 + $1.000.000 + $2.000.000 = **$8.000.000** ✔

Se registra como **una sola venta** (un solo asistente) y el sistema genera automáticamente:

| Qué se genera | Dónde | Impacto |
|---|---|---|
| Venta de `MC-014` por $8.000.000 | `ventas` | `MC-014` pasa a estado *vendido* |
| Movimiento +$3.000.000 en "Caja efectivo" | `movimientos` | Suma al disponible ya |
| Movimiento +$2.000.000 en "Banco" | `movimientos` | Suma al disponible ya |
| Alta de la moto 110cc como `MC-031`, origen *permuta*, valor de ingreso $1.000.000 | `vehiculos` + `venta_permutas` | Suma al inventario |
| Financiación de $2.000.000 | `financiaciones` | — |
| 4 cuotas de $500.000 con vencimientos mensuales | `cuotas` | Suma a *por cobrar* |

Cuando llega cada cuota, se marca como cobrada eligiendo la cuenta donde entró: se genera un movimiento +$500.000 y baja el *por cobrar*.

Si `MC-014` tenía un costo real de $6.500.000, la ganancia de la venta es $8.000.000 − $6.500.000 = **$1.500.000**.

## 6. Gastos difíciles de categorizar

Todo gasto genera **siempre y en el momento** su movimiento de salida (la plata salió, el balance tiene que reflejarlo). Lo que puede quedar para después es *a qué vehículo se le imputa*.

Al cargar un gasto se elige su **alcance**:

- **General del negocio** (alquiler, luz, sueldos): no se asigna a vehículos.
- **De vehículos**: se reparte entre uno o más vehículos con montos concretos. Lo que no se reparte queda **sin asignar** (monto sin asignar = total − suma de asignaciones).

### Caso A — Un gasto cubre varios vehículos, repartido de forma despareja

Ejemplo: el chapista cobra $300.000 por arreglar 3 piezas de `MC-010` y una manija de `MC-012`.

Se carga un gasto de $300.000, alcance *de vehículos*, con asignaciones $250.000 a `MC-010` y $50.000 a `MC-012`. Si en el momento no se sabe cómo repartir, se puede dejar todo o parte sin asignar, **sin bloquear la carga**.

### Caso B — Pagos periódicos a un proveedor sin vehículo todavía

Ejemplo: al mecánico se le paga $80.000 por semana sin saber todavía a qué auto corresponde cada pago.

Se carga un gasto de $80.000 con proveedor "Mecánico Juan", alcance *de vehículos*, **sin asignaciones**. La plata ya salió de la cuenta. Ese gasto aparece en la pantalla **"Pendientes de asignar"** (agrupable por proveedor, que funciona como su cuenta corriente). Cuando se sabe a qué trabajos correspondió, se asigna total o parcialmente a uno o varios vehículos con el mismo mecanismo del Caso A.

Los casos A y B son **el mismo mecanismo**: un gasto con asignaciones parciales. No hay tablas ni pantallas distintas para cada uno.

Para gastos simples (nafta, un trámite, un repuesto puntual de un auto) la carga sigue siendo mínima: monto, categoría, vehículo (o "general"), cuenta de la que salió, y listo.

## 7. Identificación de vehículos

- Cada vehículo recibe un **código corto autogenerado** correlativo: `MC-001`, `MC-002`… (generado por una secuencia de Postgres, nunca se reutiliza aunque se anule un alta).
- En las listas cada vehículo se muestra con **foto grande**, código, marca, modelo, año, color y estado.
- La **foto principal** se saca con la cámara del celular en el alta. Se permite "agregar foto después" para no bloquear la carga; los vehículos sin foto se muestran con un aviso.
- La **patente** se guarda como dato secundario y opcional (los vehículos recibidos en permuta pueden no tenerla a mano).

## 8. Esquema de base de datos (Supabase / Postgres)

Convenciones: claves `id uuid`, montos `bigint` en ARS, todas las tablas de operaciones tienen `created_by` (usuario que cargó) y `created_at`. **Nada se borra**: los errores se corrigen anulando.

### 8.1 Tablas

**`usuarios`** — perfil de cada socio (ligado a `auth.users`)
- `id` (= `auth.users.id`), `nombre`, `foto_url`

**`cuentas`** — dónde está la plata
- `id`, `nombre` (ej. "Caja efectivo", "Banco Galicia", "Mercado Pago"), `tipo` (`efectivo` | `banco` | `billetera`), `activa`

**`contactos`** — compradores, vendedores y proveedores
- `id`, `nombre`, `telefono` (opcional), `tipos` (lista: `comprador`, `vendedor`, `proveedor`), `notas`

**`categorias`** — categorías de gasto e ingreso
- `id`, `nombre`, `tipo` (`gasto` | `ingreso`), `activa`
- La lista inicial sale de la planilla de la Etapa 0.

**`vehiculos`**
- `id`, `codigo` (único, `MC-###`), `marca`, `modelo`, `anio`, `color`, `patente` (opcional), `foto_url` (opcional)
- `estado` (`en_stock` | `reservado` | `vendido`)
- `origen` (`compra` | `permuta` | `inventario_inicial`)
- `valor_ingreso` — precio de compra, valor pactado en la permuta, o costo estimado si es inventario inicial
- `precio_lista` (opcional) — precio al que se publica
- `fecha_ingreso`, `contacto_origen_id` (a quién se le compró, opcional), `notas`

**`movimientos`** — libro único del dinero real
- `id`, `fecha`, `cuenta_id`, `monto` (con signo: positivo entra, negativo sale)
- `tipo`: `saldo_inicial` | `compra_vehiculo` | `sena` | `venta` | `cobro_cuota` | `gasto` | `ingreso_general` | `transferencia` | `aporte_socio` | `retiro_socio`
- Referencias opcionales: `vehiculo_id`, `venta_id`, `cuota_id`, `gasto_id`, `categoria_id`, `socio_id` (para aportes/retiros), `transferencia_id` (agrupa las dos patas de una transferencia)
- `descripcion`
- `anulado` (bool), `anulado_por`, `anulado_at`, `motivo_anulacion`
- `created_by`, `created_at`

**`ventas`**
- `id`, `vehiculo_id`, `comprador_id`, `fecha`, `precio_total`, `notas`, `anulada`, `created_by`, `created_at`
- Regla (validada por la función `registrar_venta`): `precio_total` = Σ movimientos de la venta (incluida la seña previa) + Σ valores de permuta + monto financiado.

**`venta_permutas`** — vehículos recibidos como parte de pago
- `venta_id`, `vehiculo_recibido_id`, `valor_pactado`
- El vehículo recibido se crea en la misma operación con `origen = permuta` y `valor_ingreso = valor_pactado`.

**`financiaciones`**
- `id`, `venta_id`, `monto_total`, `cantidad_cuotas`, `fecha_primera_cuota`

**`cuotas`**
- `id`, `financiacion_id`, `numero`, `monto`, `fecha_vencimiento`
- El monto cobrado se calcula desde los movimientos `cobro_cuota` (admite **cobros parciales**). Estado derivado: `pendiente` | `parcial` | `cobrada` | `vencida` (vencimiento pasado y no cobrada del todo).

**`gastos`**
- `id`, `fecha`, `monto_total`, `categoria_id`, `descripcion`, `proveedor_id` (opcional), `alcance` (`general` | `vehiculos`), `anulado`, `created_by`, `created_at`
- Cada gasto tiene exactamente un movimiento de salida asociado.

**`asignaciones_gasto`**
- `id`, `gasto_id`, `vehiculo_id`, `monto`, `created_by`, `created_at`
- Regla: Σ asignaciones de un gasto ≤ `monto_total`. Solo para gastos con `alcance = vehiculos`.

**`vehiculo_fotos`** *(Etapa 3)* — galería: `vehiculo_id`, `url`, `orden`

### 8.2 Vistas de cálculo (para balances y detalles)

| Vista | Qué calcula |
|---|---|
| `v_saldo_cuentas` | Saldo de cada cuenta = Σ movimientos no anulados. |
| `v_dinero_disponible` | Total de todas las cuentas activas. |
| `v_cuotas` | Cada cuota con monto cobrado, saldo y estado (incluye vencidas). |
| `v_por_cobrar` | Total pendiente de cobro + próximas cuotas por fecha. |
| `v_costo_vehiculo` | `valor_ingreso` + Σ asignaciones de gastos no anulados. |
| `v_inventario` | Σ costo real de vehículos `en_stock` y `reservado`. |
| `v_ganancia_venta` | Precio de venta − costo real del vehículo vendido. |
| `v_gastos_sin_asignar` | Gastos de vehículos con monto sin asignar > 0, con proveedor. |

### 8.3 Operaciones (funciones RPC)

| Función | Qué hace en una sola transacción |
|---|---|
| `registrar_compra` | Crea el vehículo (código nuevo) + movimiento de salida desde la cuenta elegida. |
| `registrar_sena` | Movimiento `sena` ligado al vehículo + vehículo pasa a `reservado`. |
| `registrar_venta` | Venta + movimientos de cobro (una o más cuentas) + liga la seña previa + permutas (alta de vehículos) + financiación y cuotas. Valida que los componentes sumen el precio. Vehículo pasa a `vendido`. |
| `cobrar_cuota` | Movimiento `cobro_cuota` (total o parcial) en la cuenta elegida. |
| `registrar_gasto` | Gasto + movimiento de salida + asignaciones (opcionales). |
| `asignar_gasto` | Agrega asignaciones a un gasto existente, validando que no superen el total. |
| `transferir` | Dos movimientos (−origen, +destino) con el mismo `transferencia_id`. |
| `anular_movimiento` / `anular_venta` / `anular_gasto` | Marcan como anulado lo que corresponda, con quién y por qué. Anular una venta devuelve el vehículo a `en_stock` y anula sus movimientos, permutas y cuotas. |

## 9. Diseño de la interfaz

### 9.1 Pantalla principal

Pocas opciones, **botones grandes**, texto claro:

- **Comprar vehículo**
- **Vender vehículo** — asistente de una pregunta por pantalla.
- **Registrar gasto**
- **Registrar ingreso**
- **Vehículos** — listado visual con fotos y código.
- **Balances** — siempre visible (también como acceso fijo en la barra inferior).

### 9.2 Pantallas secundarias (la complejidad vive acá)

- **Pendientes de asignar**: gastos con monto sin asignar, agrupados por proveedor.
- **Cuotas por cobrar**: cuotas pendientes ordenadas por fecha, vencidas resaltadas, botón "Cobrada".
- **Mover plata**: transferencias entre cuentas, aportes y retiros de socios.
- **Movimientos**: historial con quién cargó cada cosa; desde acá se anula.
- **Configuración**: cuentas, categorías, contactos, saldos iniciales.

### 9.3 Asistente de venta (paso a paso)

1. ¿Qué vehículo? (lista con fotos; los reservados muestran la seña)
2. ¿Quién compra? (buscar contacto o crear con nombre + teléfono)
3. ¿Precio total?
4. ¿Recibís un vehículo en parte de pago? → No / Sí (marca, modelo, año, color, foto, valor)
5. ¿Hay financiación? → No / Sí (monto, cantidad de cuotas, fecha de la primera)
6. ¿Cuánto entra ahora y dónde? (precargado con lo que falta; se puede repartir entre cuentas)
7. Resumen en lenguaje simple ("Entran $5.000.000 hoy, queda por cobrar $2.000.000 en 4 cuotas, entra la moto MC-031 al stock") → **Confirmar**

El paso 6 se calcula solo: precio − seña − permuta − financiación. El asistente no deja confirmar si los números no cierran, y explica cuánto falta o sobra.

### 9.4 Balances

Una sola pantalla, números grandes:

- **Dinero disponible** (total) y debajo el detalle por cuenta.
- **Por cobrar** (total) y las próximas cuotas, con las vencidas en rojo.
- **Inventario** (valor a costo y cantidad de vehículos).

## 10. Plan de etapas

### Etapa 0 (inmediata, sin desarrollo)

Migrar la agenda a una **planilla compartida (Google Sheets)** con columnas fijas: fecha, tipo (compra/venta/gasto/ingreso), monto, cuenta, vehículo, categoría, descripción, quién cargó. Sirve para no seguir perdiendo información y para **validar las categorías reales** de gasto e ingreso. Al arrancar la Etapa 1 se usa para cargar saldos iniciales y stock existente.

### Etapa 1 — Versión mínima funcional

Alcance y criterios de aceptación:

1. **Acceso con PIN** (ver 4.1)
   - Cada dispositivo se vincula una vez a un socio y se define un PIN de 4 dígitos.
   - Al abrir la app (o tras 5 min en segundo plano) se pide solo el PIN, con teclado numérico en pantalla; con el PIN correcto se entra directo.
   - El PIN se puede cambiar desde el propio dispositivo.
2. **Puesta en marcha**
   - Se pueden crear cuentas (efectivo, bancos, billeteras) con su saldo inicial.
   - Se pueden cargar los vehículos que ya están en stock (origen *inventario inicial*) sin generar movimientos de dinero.
3. **Comprar vehículo**
   - Se carga foto (cámara), marca, modelo, año, color, patente opcional, precio y cuenta de la que sale la plata.
   - Se asigna el código `MC-###` automáticamente y se muestra al terminar.
   - El saldo de la cuenta baja en el precio de compra.
4. **Vehículos**
   - Listado con foto, código, marca/modelo/año/color y estado; filtrable por estado.
   - Detalle con fecha de ingreso, origen, valor de ingreso, gastos asignados y **costo real**; si está vendido, precio y **ganancia**.
5. **Venta simple**
   - Vehículo, comprador, precio y cobro en una o más cuentas (sin permuta ni financiación todavía).
   - El vehículo pasa a *vendido* y los saldos suben.
6. **Gasto / ingreso simple**
   - Monto, categoría, descripción, cuenta, y vehículo (uno solo) o "general".
   - El gasto asignado a un vehículo suma a su costo real.
7. **Balances**
   - Dinero disponible (total y por cuenta) e inventario a costo. *Por cobrar* aparece en $0 hasta la Etapa 2.
8. **Corrección de errores**
   - Historial de movimientos con quién cargó cada uno; cualquier socio puede anular indicando un motivo, y el balance se recalcula.

**Criterio general**: cada carga cotidiana se completa en **4 pantallas o menos**, con botones grandes, y se prueba en un Android y un iPhone reales con el socio de menor manejo tecnológico.

### Etapa 2 — Negocios complejos

- Venta con **permuta** (alta automática del vehículo recibido) y **financiación** en cuotas.
- **Seña** y estado *reservado*.
- **Cuotas por cobrar**: cobro total o parcial, vencidas.
- **Gastos repartidos** entre varios vehículos y **pendientes de asignar** por proveedor.
- **Mover plata**: transferencias entre cuentas, aportes y retiros de socios.

### Etapa 3 — Reportes y pulido

- Reportes: ganancia por período y por vehículo, gastos por categoría, días en stock.
- Búsqueda y filtros avanzados.
- Galería de fotos por vehículo.
- Pulido general de la interfaz.

## 11. Historias de usuario

La etiqueta **[E1]**, **[E2]** o **[E3]** indica en qué etapa se implementa.

### Acceso y uso general
- **[E1]** Como socio, quiero acceder desde mi celular (Android o iPhone) o computadora sin instalar nada desde una tienda, para usarlo donde sea.
- **[E1]** Como socio, quiero entrar a la app solo con un PIN de 4 dígitos tocado en un teclado numérico grande en pantalla, para no recordar contraseñas ni elegir mi perfil.
- **[E1]** Como socio, quiero vincular mi celular una sola vez y elegir (y poder cambiar) mi propio PIN, para que el acceso sea mío sin depender de los demás.
- **[E1]** Como socio con poco manejo de tecnología, quiero que cargar un movimiento tome segundos y pocos pasos, para no depender de otra persona.

### Puesta en marcha
- **[E1]** Como socio, quiero cargar las cuentas donde está la plata (caja, bancos, billeteras) con su saldo inicial, para que el balance arranque correcto.
- **[E1]** Como socio, quiero cargar los vehículos que ya tengo en stock con su costo, para no empezar de cero.

### Gestión de vehículos
- **[E1]** Como socio, quiero registrar la compra de un vehículo con foto, datos, precio y de qué cuenta salió la plata, para que quede en stock y el balance refleje el pago.
- **[E1]** Como socio, quiero que cada vehículo tenga un código corto autogenerado, para referirme a él rápido con mis socios.
- **[E1]** Como socio, quiero ver la lista de vehículos con foto y código, para encontrar rápido el que busco.
- **[E1]** Como socio, quiero ver el estado de un vehículo (en stock, reservado, vendido), para saber si está disponible.
- **[E1]** Como socio, quiero ver el detalle de un vehículo (costos asociados, fecha de ingreso, origen, costo real y ganancia si se vendió), para saber cuánto me costó y cuánto gané.

### Ventas
- **[E1]** Como socio, quiero registrar una venta simple (vehículo, comprador, precio, en qué cuentas entró la plata) en pocos pasos.
- **[E2]** Como socio, quiero registrar una seña sobre un vehículo, para que quede reservado y la seña se descuente al venderlo.
- **[E2]** Como socio, quiero registrar una venta con financiación en cuotas, para que el sistema sepa cuánto falta cobrar y cuándo.
- **[E2]** Como socio, quiero registrar una venta donde recibo un vehículo como parte de pago, para que se agregue al stock con su valor.
- **[E2]** Como socio, quiero que en una venta compleja el sistema separe solo el dinero real, lo que queda por cobrar y el vehículo recibido, y me avise si los números no cierran.

### Gastos e ingresos
- **[E1]** Como socio, quiero registrar un gasto simple asociado a un vehículo en pocos campos, para llevar el costo real de cada auto.
- **[E1]** Como socio, quiero registrar un gasto o ingreso general del negocio (alquiler, sueldos, etc.).
- **[E2]** Como socio, quiero registrar un gasto repartido entre varios vehículos con montos distintos, para casos como el chapista que cobra un solo precio.
- **[E2]** Como socio, quiero registrar un pago a un proveedor sin asignarlo todavía a un vehículo, para no demorar la carga.
- **[E2]** Como socio, quiero ver los pagos pendientes de asignar agrupados por proveedor, para completarlos cuando tenga la información.
- **[E2]** Como socio, quiero asignar total o parcialmente un pago pendiente a uno o más vehículos, para que el costo real de cada auto quede correcto.

### Movimientos de dinero
- **[E2]** Como socio, quiero registrar que pasé plata de una cuenta a otra (ej. deposité efectivo en el banco), sin que cuente como gasto ni ingreso.
- **[E2]** Como socio, quiero registrar aportes y retiros de dinero de cada socio, para distinguirlos de gastos e ingresos del negocio.
- **[E1]** Como socio, quiero anular un movimiento cargado por error indicando el motivo, y que quede registrado quién lo hizo.

### Cobros a futuro
- **[E2]** Como socio, quiero ver las cuotas pendientes con su fecha y las vencidas resaltadas, para saber qué voy a cobrar y cuándo.
- **[E2]** Como socio, quiero marcar una cuota como cobrada (total o parcial) eligiendo la cuenta donde entró, para que pase al disponible.

### Balances
- **[E1]** Como socio, quiero ver en una sola pantalla el dinero disponible (total y por cuenta), el total por cobrar y el valor del inventario.
- **[E1]** Como socio, quiero entrar a balances sin pasos adicionales, para consultarlo rápido.
- **[E3]** Como socio, quiero ver la ganancia por período y por vehículo, para saber cómo va el negocio.

## 12. Preguntas abiertas

No bloquean la Etapa 1, pero hay que responderlas antes de la Etapa 2:

1. ¿Se manejan vehículos en **consignación** (de terceros, que se venden por cuenta de otro)?
2. ¿Las ganancias se reparten entre socios? ¿Hace falta calcular la parte de cada uno?
3. ¿Hace falta registrar papeles y trámites del vehículo (08, verificación policial, deuda de patentes, multas)?
4. ¿Alguna financiación lleva interés o recargo?
5. ¿Una compra puede pagarse con varias cuentas o con permuta de un vehículo propio?
6. Lista definitiva de **categorías** de gasto e ingreso (sale de la planilla de la Etapa 0).

## 13. Próximos pasos

1. Completar la Etapa 0 (planilla) y relevar categorías.
2. Crear el proyecto en Supabase y la **primera migración SQL**: tablas de la sección 8 necesarias para la Etapa 1 (`usuarios`, `cuentas`, `contactos`, `categorias`, `vehiculos`, `movimientos`, `ventas`, `gastos`, `asignaciones_gasto`), vistas de saldo/inventario/costo, RLS y funciones `registrar_compra`, `registrar_venta` (versión simple), `registrar_gasto`, `anular_movimiento`.
3. Armar el **esqueleto del proyecto** Astro + TypeScript + React + cliente de Supabase + configuración PWA, con login por PIN y la pantalla principal.
4. Implementar las funcionalidades de la Etapa 1 en el orden de la sección 10 y probarlas con los socios en sus propios celulares.
