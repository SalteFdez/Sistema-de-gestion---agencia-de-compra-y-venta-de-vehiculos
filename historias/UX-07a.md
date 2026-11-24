# UX-07a · Vehículos: vista Lista y días en stock

*Refinada con `/story`. Fuente: `BACKLOG.md` (Etapa 4, UX-07) y `AUDITORIA-UX.md` §3 (tarjetas de vehículo: foto de 192 px, entran 2 autos por pantalla; propuesta de lista compacta y días en stock).*

*Contexto: **Vehículos es la pantalla principal** y lo diario es compartir fotos. Se apoya en lo que ya está:*
- *`VehiculosView` con tarjetas, buscador (E3-03), filtro (E1-06b), "Sin foto · Agregar" (E1-03b) y **Compartir** (UX-09b);*
- *`dias-en-stock.ts` (UX-06) y `BadgeEstado`.*

*Requiere: UX-06, UX-09b.*

> **División de UX-07:** son cuatro listas con cambios independientes y no entran en 3 criterios. Queda en cuatro historias chicas:
> - **UX-07a** (esta): Vehículos.
> - **UX-07b** (`historias/UX-07b.md`): Movimientos.
> - **UX-07c** (`historias/UX-07c.md`): Cuotas por cobrar.
> - **UX-07d** (`historias/UX-07d.md`): Ganancia por mes.
>
> Se pueden hacer en cualquier orden. Conviene empezar por esta, porque es la pantalla principal. La línea UX-07 de `BACKLOG.md` hay que separarla en 07a–07d.

## Historia
Como socio, quiero poder ver los autos en una lista compacta, con los días en stock y el botón para compartir a mano, para recorrer el stock rápido y mostrarlo a un cliente.

## Criterios de aceptación
- [ ] **Elegir Tarjetas o Lista.** Dado que abro Vehículos, cuando toco el selector **Tarjetas / Lista** (arriba, junto al filtro), entonces el listado cambia de forma, sin perder la búsqueda ni el filtro. Lo que elegí **se recuerda en este celular**: al volver a abrir la app, sigue igual. Si el navegador no deja guardar, por ejemplo en modo privado, arranca en Tarjetas y no muestra ningún error.
- [ ] **Lista compacta.** Dado la vista **Lista**, cada auto ocupa una fila con:
  - **miniatura de 64 px** (o "Sin foto");
  - **código**, marca, modelo y año;
  - el estado con su color;
  - **días en stock** (ej. "45 días");
  - a la derecha, el botón **Compartir** como ícono de 44 px.

  Tocar la fila abre el detalle. Compartir funciona igual que en las tarjetas y no abre el detalle. **No se muestra el costo**, porque la pantalla se usa delante de clientes. Los autos sin fotos no tienen Compartir.
- [ ] **Días en stock también en Tarjetas.** Dado la vista **Tarjetas**, cada tarjeta muestra, además de lo de hoy, los **días en stock**, calculados igual que en el detalle (hasta hoy, o hasta la venta si se vendió). Todo lo demás de las tarjetas sigue igual: foto, Compartir y "Sin foto · Agregar".

## Plan
- **Preferencia de vista:** un `useState` inicializado desde `localStorage` (clave `vehiculos.vista`, valores `tarjetas` | `lista`), con **try/catch** al leer y al escribir. Si falla, queda `tarjetas`. Se guarda en cada cambio.
- **Selector:** `Opciones` de dos botones (Tarjetas / Lista) al lado del filtro En stock / Vendidos / Todos. La búsqueda y el filtro se aplican igual en las dos vistas.
- **Fila compacta:**
  - un componente para la fila: miniatura `w-16 h-16 object-cover rounded` con la misma URL firmada de la tarjeta, código en negrita, marca/modelo/año, `BadgeEstado` y días con `dias-en-stock`;
  - el botón **Compartir** de UX-09b en modo solo ícono, con `aria-label="Compartir fotos de MC-001"` y 44 × 44 px, que frena la propagación;
  - sin foto, la miniatura muestra "Sin foto", y la foto se agrega desde Tarjetas o desde el detalle.
- **Tarjetas:** se suma una línea "N días en stock" junto al estado.
- **Tests:**
  - **Selector:** cambia la vista; guarda y lee de `localStorage`; con `localStorage` que tira error, arranca en Tarjetas sin romper.
  - **Fila:** miniatura, código, datos, estado y días; **no** aparece ningún monto de costo; Compartir no abre el detalle y no está en autos sin fotos; tocar la fila abre el detalle.
  - **Tarjetas:** muestran los días.
  - **Combinación:** la búsqueda y el filtro andan en las dos vistas.
  - **Regresión:** los tests actuales de Vehículos verdes.

  Revisión a 390 px de las dos vistas.

## Fuera de alcance
- Costo en el listado (decidido que no).
- Ordenar el listado (por días, por precio).
- Compartir varios autos a la vez.
- Movimientos, Cuotas y Ganancia: UX-07b, 07c y 07d.

## Decisiones tomadas
- Selector "Tarjetas / Lista", recordado en `localStorage` por dispositivo, con try/catch.
- Lista compacta con miniatura de 64 px, código, marca/modelo/año, `BadgeEstado`, días en stock (reusa `dias-en-stock.ts`) y Compartir como ícono de 44 px.
- Días en stock también en las tarjetas.
- El costo **no** se muestra en el listado.
- Sin cambios de base ni RPC.

## Dudas abiertas
- Ninguna.
