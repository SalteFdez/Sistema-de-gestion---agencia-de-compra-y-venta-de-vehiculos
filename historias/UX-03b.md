# UX-03b · Componentes base en el resto de las pantallas

*Refinada con `/story`. Sale de dividir UX-03. Fuente: `AUDITORIA-UX.md` §2.3 (InputMonto, inputs de 16 px, diálogos en línea), §2.4 (sin carga y errores silenciosos) y §3 (badge de estado, negativos en rojo).*

*Reusa los componentes de UX-03a en `src/components/ui/`: `Encabezado`, `Boton`, `InputMonto`, `Opciones`, `Dialogo`, `BadgeEstado`, `Cargando` y `ErrorReintentar`, más el token `marca`. Requiere: UX-03a.*

## Historia
Como socio, quiero que todas las pantallas usen los mismos botones, montos, avisos y estados de carga, para que la app se use igual en todos lados y nunca me muestre "$ 0" o una lista vacía cuando en realidad está cargando o falló.

## Criterios de aceptación
- [ ] **Mismos controles en todas las pantallas.** Dado cualquier pantalla que no sea Comprar, Vender ni Gasto, cuando la uso:
  - tiene el **encabezado** con Volver grande;
  - los botones principales en el color de marca, con "Guardando…";
  - los montos con miles en vivo y teclado numérico: Cuentas, Pasar plata, Aporte / Retiro, Cobrar cuota, Asignar gasto;
  - las cuentas y socios como **opciones seleccionables** con su saldo;
  - todos los campos de texto en **16 px**, sin zoom en iPhone.
- [ ] **Avisos y estados que se entienden.** Dado que toco **Anular** (en el detalle del vehículo o en Movimientos) o confirmo un pase o retiro que deja una cuenta en negativo, entonces el "¿Seguro?" o el aviso se abre como **hoja desde abajo**, pegada a lo que toqué, y no al final de la página. Además:
  - en **Vehículos** y en el **detalle**, el estado se ve con su color: En stock verde, Reservado ámbar, Vendido gris, Anulado rojo;
  - en **Balances**, **Cuentas** y los selectores, un saldo negativo se ve en **rojo** ("$ −150.000").
- [ ] **Nunca "$ 0" mientras carga ni vacío por error.** Dado que abro Balances, Vehículos, Movimientos, Cuotas por cobrar, Pendientes de asignar o Ganancia por mes, cuando los datos todavía no llegaron, entonces veo **"Cargando…"** y no "$ 0" ni una lista vacía. Si falla la carga, veo **"No se pudo cargar · Reintentar"**, y al tocar Reintentar se vuelve a pedir. Todo lo demás se comporta igual que antes: los tests existentes siguen verdes, ajustando solo selectores.

## Plan
- **`Encabezado` y `Boton`** en todas las pantallas restantes con "Volver" y confirmar (unas veinte):
  - Balances, Cuentas, Vehículos, Detalle, Cargar stock existente, Galería;
  - Mover plata, Pasar plata, Aporte / Retiro, Movimientos;
  - Cuotas por cobrar, Cobrar cuota, Pendientes de asignar, Asignar gasto;
  - Ganancia por mes y su detalle, Cambiar PIN.

  `Boton` con `guardando` reemplaza los estados "Guardando…" que dejó UX-02. Se cambia `blue-600` por `marca` en esas pantallas.
- **`InputMonto` y `Opciones`:** montos de Cuentas (saldo inicial), Pasar plata, Aporte / Retiro, Cobrar cuota y Asignar gasto, con las cuentas y socios como `Opciones` y su saldo. Todos los `<input>` de texto restantes en 16 px: buscador de Vehículos, descripciones, motivo de anular, teléfono, PIN de vincular.
- **`Dialogo`, `BadgeEstado` y negativos en rojo:**
  - los "¿Seguro?" de anular en el detalle del vehículo (compra, alta, venta, gasto) y en Movimientos;
  - el aviso de negativo de Pasar plata y Aporte / Retiro;
  - el estado en Vehículos y en el detalle;
  - los saldos negativos en rojo en Balances y Cuentas.
- **`Cargando` y `ErrorReintentar`** en Balances (cuentas, por cobrar, inventario), Vehículos, Movimientos, Cuotas por cobrar, Pendientes de asignar, Ganancia por mes y su detalle. Donde hoy el error se traga (Balances, Movimientos, Ganancia), la carga pasa a distinguir **cargando / error / datos**, y Reintentar vuelve a pedir. Vehículos y Detalle ya tienen el patrón: se reemplaza por el componente.
- **Tests:**
  - por pantalla: "Cargando…" antes de que resuelva la carga, "No se pudo cargar" y Reintentar que vuelve a pedir cuando falla;
  - los diálogos de anular con `role="dialog"`;
  - badges con su texto y color, y negativos en rojo;
  - los 498 tests (más los de UX-03a) verdes, ajustando solo selectores.

  Revisión a 390 px de cada pantalla tocada.

## Fuera de alcance
- Orden y diseño nuevo del detalle del vehículo (UX-06), listas compactas, Movimientos por día y Cuotas con Llamar / WhatsApp (UX-07).
- Navegación, inicio nuevo y barra inferior (UX-04).
- Orden de los formularios (UX-05).
- Esqueletos (skeletons) animados: alcanza con "Cargando…".
- PWA: íconos, safe areas (UX-08).

## Riesgos / notas
- **Errores que hoy se tragan:** Balances, Movimientos y Ganancia hoy muestran vacío si falla la carga. Al mostrar el error, algún test que simulaba un fallo y esperaba "vacío" va a ver "No se pudo cargar". Es el comportamiento buscado, así que el test se ajusta y se anota.
- **Muchas pantallas:** es el mismo reemplazo repetido. Conviene hacerlo de a una pantalla por paso de `/pair`, con sus tests verdes antes de pasar a la siguiente.

## Decisiones tomadas
- Mismas decisiones que UX-03a (token `marca`, componentes de `ui/`, "−" en `formatMoney`, negativos en rojo, inputs de 16 px, sin cambiar comportamiento), aplicadas al resto de las pantallas.

## Dudas abiertas
- Ninguna.
