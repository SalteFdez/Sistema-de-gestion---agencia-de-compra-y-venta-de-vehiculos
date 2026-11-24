# UX-04a · Navegación: barra inferior, "Más" y atrás del celular

*Refinada con `/story`. Fuente: `BACKLOG.md` (Etapa 4, UX-04) y `AUDITORIA-UX.md` §2.2.*

*Hoy la navegación es un `currentView` con `useState` dentro de `AuthFlow` (~1.300 líneas):*
- *no hay barra;*
- *todo vuelve al inicio con "Volver";*
- *el gesto atrás de Android cierra la PWA;*
- *el detalle abierto desde Movimientos o Ganancia vuelve a Vehículos.*

*Reusa los componentes de UX-03 (`Encabezado`, `Dialogo`, `Boton`) y el token `marca`. Requiere: UX-03b.*

> **División:** UX-04 junta navegación, inicio nuevo y confirmaciones: no entra en 3 criterios. Queda en dos partes:
> - **UX-04a** (esta): barra inferior, pantalla **Más** y atrás del celular.
> - **UX-04b** (`historias/UX-04b.md`): Inicio nuevo (tarjeta de plata, avisos, 2×2) y "Me olvidé el PIN" con confirmación.
>
> **Va primero UX-04a**, porque "Más" es donde quedan Balances, Mover plata, Cuentas, etc. Así UX-04b puede sacarlos del inicio sin que se pierda ningún acceso. La línea UX-04 de `BACKLOG.md` hay que separarla en UX-04a / UX-04b.

## Historia
Como socio, quiero moverme entre Inicio, Vehículos y Movimientos con una barra abajo, encontrar todo lo demás en "Más" y que el atrás del celular me lleve a la pantalla anterior, para no tener que volver siempre al inicio ni cerrar la app sin querer.

## Criterios de aceptación
- [ ] **Barra inferior.** Dado que estoy en una pantalla de nivel superior (**Inicio, Vehículos, Movimientos o Más**), cuando miro abajo, entonces veo una barra fija con esas cuatro pestañas, con la actual marcada en el color de marca, y paso de una a otra con un toque. La barra **no aparece** en formularios ni en pantallas de detalle (Comprar, Vender, Gasto, detalle del vehículo, etc.). En iPhone con la app instalada, la barra no queda tapada por la barra de gestos del sistema.
- [ ] **Pantalla "Más".** Dado que toco **Más**, entonces veo, como lista de botones grandes: Balances, Mover plata, Cuotas por cobrar, Pendientes de asignar, Ganancia por mes, Cuentas, Cambiar PIN, **Bloquear** y **Desvincular dispositivo**. Cada uno lleva a su pantalla de siempre.
  - **Bloquear** muestra al toque la pantalla de PIN.
  - **Desvincular** abre un **diálogo de confirmación** ("Vas a tener que volver a ingresar el email y la contraseña"). Solo desvincula si confirmo; si toco Volver o el fondo, no pasa nada.
- [ ] **Atrás vuelve a donde estaba.** Dado que navegué, por ejemplo Movimientos → detalle de MC-014, cuando hago el **gesto atrás de Android** o toco **Volver**, entonces vuelvo a **Movimientos**, no a Vehículos ni al inicio. Lo mismo para el detalle abierto desde Ganancia o desde Vehículos, y para cualquier formulario. Además:
  - en el **Inicio**, el atrás se comporta como en cualquier app;
  - después de terminar una carga, atrás no me devuelve al formulario ya guardado;
  - con la app bloqueada por PIN, atrás **no** saltea el bloqueo.

## Plan
- **Navegación en un hook** que reemplaza el `currentView` de `AuthFlow`, sin cambiar qué se muestra en cada vista:
  - guarda la vista actual y sus datos (ej. qué vehículo, qué mes);
  - al navegar hace `history.pushState({vista, datos})`;
  - escucha `popstate` para volver a la vista anterior;
  - arranca con `replaceState` en Inicio;
  - expone `ir(vista, datos)`, `volver()` (es `history.back()`) y `irAPestaña(p)`.

  Los "Volver" de cada pantalla pasan a llamar a `volver()`. Las recargas que hoy dispara cada cambio de vista (cuentas, vehículos, movimientos) se mantienen.
- **Casos especiales del historial:**
  - **Al terminar una carga** (confirmación de compra, venta, gasto, etc.), la entrada del formulario se **reemplaza** por la de confirmación (`replaceState`), así atrás no vuelve al formulario guardado. "Volver al inicio" y "Ver vehículos" navegan como siempre.
  - **Con la app bloqueada** (PIN o vinculación), el `popstate` no cambia de vista: el bloqueo de E1-01 tiene prioridad.
  - **Al tocar una pestaña** se navega a esa pantalla de nivel superior. Volver a tocar la pestaña actual no agrega nada al historial.
- **Barra inferior:**
  - un componente con 4 pestañas (ícono simple + texto), fijo abajo con `padding-bottom: env(safe-area-inset-bottom)`;
  - visible solo en Inicio, Vehículos, Movimientos y Más;
  - las pantallas de nivel superior suman espacio abajo para que la barra no tape el último elemento.
- **Pantalla "Más":** lista de botones grandes con los nueve accesos de la historia. **Bloquear** usa el mismo bloqueo que el re-bloqueo por inactividad. **Desvincular** usa `Dialogo` + `Boton` peligro y llama al desvincular de siempre. El Inicio actual **no se toca** en esta historia (sigue teniendo sus botones hasta UX-04b).
- **Tests:**
  - **Hook:**
    - `ir` hace `pushState`;
    - `popstate` vuelve a la vista anterior con sus datos;
    - `volver` llama a `history.back`;
    - con la app bloqueada, `popstate` no cambia de vista;
    - al confirmar una carga se reemplaza la entrada.
  - **Barra:** visible solo en las cuatro vistas, la pestaña activa queda marcada, y el toque navega.
  - **Más:** los nueve accesos; Bloquear muestra el PIN; Desvincular pide confirmación, y Volver no desvincula.
  - **Flujos:** Movimientos → detalle → atrás = Movimientos; Ganancia → detalle → atrás = Ganancia.
  - **Regresión:** los tests actuales verdes, ajustando solo cómo se navega en los de `AuthFlow`.

  Prueba manual: en un Android real con la app instalada, el gesto atrás recorre las pantallas y no cierra la app hasta el Inicio. En iPhone, la barra respeta la zona segura.

## Fuera de alcance
- El **Inicio nuevo**, los avisos y "Me olvidé el PIN" con confirmación: UX-04b.
- Botón "+" central para cargar (lo proponía la auditoría): no está en las decisiones. Las 4 acciones de carga van en el Inicio (UX-04b).
- "Cargar otro" y "Ver vehículo" al terminar una carga, y el orden de los formularios: UX-05.
- Detalle del vehículo (UX-06) y listas (UX-07).
- URLs propias por pantalla (rutas o `#hash`): el historial guarda la vista en el `state`, sin cambiar la dirección.

## Riesgos / notas
- **Cambiar la navegación de `AuthFlow` toca todo:** es el cambio más riesgoso de la etapa UX. Extraer el hook **sin cambiar** qué se muestra, y migrar los "Volver" de a pantalla con los tests verdes, reduce el riesgo.
- **El re-bloqueo por inactividad** (E1-01) deja el historial como estaba. Al desbloquear se vuelve a la vista que estaba abierta, como hoy.
- **Recargar la página** (F5 o abrir de nuevo) arranca en Inicio, como hoy. El historial es solo de la sesión.

## Decisiones tomadas
- Barra inferior fija con Inicio, Vehículos, Movimientos y Más. Solo en las pantallas de nivel superior, nunca en formularios, y con `env(safe-area-inset-bottom)`.
- "Más" con Balances, Mover plata, Cuotas por cobrar, Pendientes, Ganancia por mes, Cuentas, Cambiar PIN, Bloquear y Desvincular (con `Dialogo`).
- `currentView` sincronizado con el historial: `pushState` al navegar, `popstate` vuelve, y "Volver" hace `history.back()` y regresa a donde estabas.
- Se permite extraer la navegación a un hook (`useNavegacion`) sin cambiar comportamiento.

## Dudas abiertas
- Ninguna.
