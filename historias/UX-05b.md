# UX-05b · Vender con ganancia estimada y revisión

*Refinada con `/story`. Sale de dividir UX-05. Fuente: `AUDITORIA-UX.md` §2.3:*
- *Vender no muestra el costo real ni la ganancia estimada mientras se escribe el precio;*
- *no hay "Revisá antes de confirmar" para una operación de millones con permutas y cuotas;*
- *la lista para elegir el auto no tiene buscador.*

*Se apoya en lo que ya está:*
- *`VenderVehiculoView`: elegir → datos, permutas y financiación → cobros → confirmación (E1-06, E2-02, E2-03);*
- *`coincideBusqueda` (E3-03);*
- *`obtenerDetalle` de `VehiculosService`, con el costo real de `v_costo_vehiculo`;*
- *la navegación con datos de `useNavegacion`;*
- *los componentes de `src/components/ui/`.*

***No cambia RPCs ni base.** Requiere: UX-05a (o UX-03a), UX-09a.*

## Historia
Como socio, quiero ver cuánto me costó el auto y cuánto voy a ganar mientras armo la venta, y revisar todo antes de confirmar, para no cerrar una venta de millones con un número mal cargado.

## Criterios de aceptación
- [ ] **Elegir el auto rápido.** Dado que entro a **Vender vehículo**, cuando miro la lista para elegir el auto, entonces arriba hay un **buscador** que filtra mientras escribo, por código, marca, modelo o patente, con las mismas reglas que en Vehículos ("14" encuentra MC-014). Además, desde el **detalle de un auto en stock**, el botón **Vender** abre Vender con **ese auto ya elegido**, salteando la lista. Volver desde ahí regresa al detalle.
- [ ] **Costo y ganancia mientras escribo.** Dado que elegí el auto, cuando estoy en los datos de la venta, entonces veo su **costo real** (ej. "Costo real $ 6.500.000"). Mientras escribo el precio, debajo veo **"Ganancia estimada $ 1.500.000"** = precio − costo real, en **rojo** si es negativa ("Ganancia estimada $ −200.000"). Si todavía no escribí precio, no se muestra la ganancia.
- [ ] **Revisar antes de confirmar.** Dado que completé la venta y los números cierran, cuando toco **Continuar**, entonces veo una pantalla **"Revisá antes de confirmar"** con:
  - el auto (código, marca y modelo) y el comprador;
  - el **precio**;
  - las **permutas** (código provisorio o "auto recibido", y su valor);
  - lo **financiado** (cuotas, monto de cada una y primera fecha);
  - los **cobros por cuenta**;
  - la **ganancia estimada**.

  Con **Confirmar venta** se guarda (con "Guardando…") y paso a la confirmación de siempre. Con **Corregir** vuelvo a los datos **sin perder nada** de lo cargado.

## Plan
- **Buscador en la lista de Vender:** un campo de búsqueda de 16 px arriba de la lista de autos en stock, que filtra en la pantalla con `coincideBusqueda`. Sin pedidos nuevos y sin migración.
- **Vender desde el detalle:**
  - `VehiculoDetalleView` suma un `Boton` **Vender** para autos `en_stock` no anulados;
  - navega a la vista de venta con `{ vehiculoId }` usando `ir()` de `useNavegacion`;
  - `VenderVehiculoView` acepta un auto inicial y arranca en el paso de datos;
  - "Volver" hace `history.back()` y regresa al detalle.
- **Costo real y ganancia estimada:**
  - al elegir el auto, si la lista no trae `costo_real`, se pide con **`obtenerDetalle`** del auto elegido;
  - mientras carga, "Calculando costo…"; si falla, se muestra "No se pudo calcular el costo", sin la ganancia, y la venta se puede hacer igual;
  - la ganancia estimada se recalcula en cada tecla del `InputMonto` del precio;
  - el número se muestra con `formatMoney` y en rojo si es negativo.

  La ganancia real sigue saliendo de `v_ganancia_venta` después de vender.
- **Paso de revisión:**
  - un paso nuevo entre los cobros y el guardado, que **solo muestra** lo que ya está en el estado del formulario: precio, permutas, financiación con la lista de cuotas que ya se calcula en el cliente, cobros por cuenta, ganancia estimada y comprador;
  - **Confirmar venta** llama a la misma `registrar_venta` de hoy, con `Boton guardando`;
  - **Corregir** vuelve al paso de datos con el estado intacto.

  En el historial (UX-04a), la revisión es una entrada más: atrás equivale a Corregir.
- **Tests:**
  - **Buscador:** filtra la lista de Vender.
  - **Vender desde el detalle:** abre con el auto elegido, y Volver regresa al detalle.
  - **Costo y ganancia:**
    - el costo real se muestra, y se pide con `obtenerDetalle` si falta;
    - la ganancia se recalcula al escribir, en rojo si es negativa, oculta sin precio, y sin ganancia si falla el costo.
  - **Revisión:**
    - muestra precio, permutas, financiación, cobros y ganancia;
    - Corregir conserva todo;
    - Confirmar venta llama una sola vez a la RPC con los mismos datos que hoy.
  - **Regresión:** los tests de E1-06, E2-02 y E2-03 verdes, agregando el paso de revisión en los flujos.

## Fuera de alcance
- Cambios en RPCs, base o en el cálculo real de la ganancia.
- "Cargar otro" después de vender.
- Vender desde el listado de Vehículos, con un botón en la tarjeta: solo desde el detalle.
- Rediseño del detalle del vehículo, más allá de agregar el botón Vender (UX-06).

## Riesgos / notas
- **Un paso más en cada venta:** la revisión agrega un toque. Es lo decidido para operaciones grandes, y la venta sigue dentro de las 4 pantallas, porque la revisión reemplaza al resumen que hoy se ve recién al confirmar.
- **Costo real que cambia después:** la ganancia estimada usa el costo real en el momento de vender. Si después se asignan gastos al auto (E2-06), la ganancia real del detalle baja. Está bien así; es una estimación.
- **Auto vendido mientras se arma la venta:** si otro socio lo vende antes, la RPC lo rechaza como hoy ("ya está vendido") desde la revisión, y se ve el error con los datos conservados.

## Decisiones tomadas
- Al elegir el auto se ve su costo real. Mientras se escribe el precio se ve "Ganancia estimada $ X" (precio − costo real), en rojo si es negativa. Si el costo no viene en la lista, se pide con `obtenerDetalle`.
- Buscador arriba de la lista para elegir el auto, reusando `coincideBusqueda`.
- Paso "Revisá antes de confirmar" con precio, permutas, financiado, cobros por cuenta y ganancia estimada, y botones "Confirmar venta" / "Corregir".
- Botón "Vender" en el detalle de un auto en stock, que abre Vender con ese auto ya elegido.
- No se cambian RPCs ni base.

## Dudas abiertas
- Ninguna.
