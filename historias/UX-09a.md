# UX-09a · Vehículos primero

*Refinada con `/story`. Fuente: `BACKLOG.md` (Etapa 4, UX-09, con prioridad antes de UX-05). Contexto de uso: lo diario es **compartir fotos de los autos** (estados de WhatsApp, historias de Instagram y Facebook). Cargar transacciones es, como mucho, una vez por día.*

*Se apoya en UX-04, ya hecha:*
- *`useNavegacion` (con `vistaInicial`, historial con `pushState`/`popstate` y `Pestana = 'home' | 'vehiculos' | 'movimientos' | 'mas'`);*
- *`BarraNavegacion`, `InicioView` y `MasView`;*
- *`VehiculosView` con el filtro En stock / Vendidos / Todos y el botón "Cargar stock existente" arriba.*

*Requiere: UX-04.*

> **División:** UX-09 son dos cambios independientes, el orden de la app y compartir fotos, y no entra en 3 criterios. Queda en:
> - **UX-09a** (esta): la app abre en Vehículos, la barra cambia, y "Cargar stock existente" pasa a Más.
> - **UX-09b** (`historias/UX-09b.md`): compartir y descargar fotos.
>
> Se pueden hacer en cualquier orden. Conviene esta primero porque es chica y deja Vehículos como pantalla principal. La línea UX-09 de `BACKLOG.md` hay que separarla en UX-09a / UX-09b.

## Historia
Como socio, quiero que la app abra directamente en Vehículos y que la plata quede en su propia pestaña, porque lo que hago todos los días es mirar y compartir los autos, y cargar movimientos, a lo sumo una vez por día.

## Criterios de aceptación
- [ ] **Abre en Vehículos.** Dado que desbloqueo la app con el PIN (al abrirla o después del re-bloqueo por inactividad), cuando entro, entonces veo **Vehículos** con el filtro **En stock**. Si al bloquearse estaba en otra pantalla, vuelvo a esa, como hoy. Al abrir la app de cero, siempre arranco en Vehículos.
- [ ] **Barra nueva.** Dado cualquier pantalla de nivel superior, cuando miro la barra inferior, entonces veo, en este orden, **Vehículos · Caja · Movimientos · Más**.
  - **Caja** es la pantalla de inicio actual, sin cambios: Dinero disponible, avisos y las 4 acciones Comprar / Vender / Gasto / Ingreso.
  - Con el **gesto atrás** desde Vehículos (la raíz), la app **no se cierra**: sigo en Vehículos.
  - El atrás desde las demás pantallas sigue volviendo a la anterior, como en UX-04.
- [ ] **"Cargar stock existente" pasa a Más.** Dado el listado de Vehículos, cuando lo abro, entonces arriba ya **no** está el botón grande "Cargar stock existente", y el listado empieza en el buscador y el filtro. En **Más** aparece **Cargar stock existente** y abre el mismo formulario de siempre. Al guardar, vuelvo al listado de Vehículos actualizado.

## Plan
- **Arranque en Vehículos:** `useNavegacion` se usa con `vistaInicial = 'vehiculos'`, la vista raíz del historial (`replaceState` inicial). Al desbloquear sin una vista previa en el historial, se abre Vehículos con el filtro En stock, que ya es el valor por defecto de E1-06b. El re-bloqueo por inactividad mantiene la vista actual, como en UX-04.
- **Atrás en la raíz no cierra:** cuando `popstate` deja el historial en la raíz (Vehículos) o antes, el hook vuelve a poner la entrada de Vehículos (`pushState`) para que el siguiente atrás tampoco cierre la app. Con la app bloqueada sigue valiendo que `popstate` no cambia de vista.
- **Barra:**
  - `BarraNavegacion` pasa a **Vehículos · Caja · Movimientos · Más**;
  - "Caja" apunta a la vista actual `home`. Se renombra solo la etiqueta y el orden, no la vista ni `InicioView`;
  - el ícono de Caja pasa a uno de plata o billetera;
  - en la confirmación de una carga, "Volver al inicio" pasa a "Volver a Caja", porque sigue yendo a esa vista.
- **"Cargar stock existente":** se saca de `VehiculosView` y se agrega como un botón más en `MasView`, que navega a la misma vista del formulario. Al terminar, vuelve a Vehículos recargado.
- **Tests:**
  - **Arranque y bloqueo:** al desbloquear arranca en Vehículos con En stock; el re-bloqueo vuelve a la vista que estaba.
  - **Barra:** cuatro pestañas en el orden nuevo, y Caja muestra el inicio de siempre.
  - **Atrás:** en la raíz sigue en Vehículos y no queda historial vacío; desde Caja o Movimientos sigue volviendo a la anterior.
  - **Cargar stock existente:** ya no está en Vehículos, sí en Más, y guardar vuelve al listado.
  - **Regresión:** los tests de UX-04 se ajustan al nuevo orden y a la nueva raíz.

  Prueba manual en un Android real con la app instalada: abrir, gesto atrás varias veces, y sigue abierta.

## Fuera de alcance
- Compartir y descargar fotos: UX-09b.
- Cambiar el contenido de Caja (es el inicio de UX-04 tal cual).
- Recordar el último filtro o la búsqueda entre aperturas de la app.
- Cambios del listado (lista compacta, días en stock): UX-07.

## Riesgos / notas
- **"Atrás no cierra" es un truco de historial:** el sistema sigue pudiendo cerrar la app (cerrarla desde el selector de apps, o en iOS, que no tiene gesto atrás global). Lo que se evita es el cierre accidental con el gesto atrás de Android.
- **Los socios están acostumbrados a que el inicio sea la plata:** ahora la plata está en **Caja**. Conviene avisarles.

## Decisiones tomadas
- Al desbloquear, la app abre en Vehículos con el filtro En stock.
- Barra: Vehículos, Caja, Movimientos, Más. Caja es la `InicioView` actual; solo cambian el nombre de la pestaña y su lugar.
- El gesto atrás desde Vehículos (raíz) no cierra la app.
- "Cargar stock existente" sale del tope de Vehículos y pasa a Más.

## Dudas abiertas
- Ninguna.
