# Auditoría UX/UI — Machoman Automotores

**Fecha:** 24/11/2026
**Base:** commit `df722bf` (Etapas 1–3 completas).

**Cómo se hizo:**
- Se leyó el código de las 22 pantallas.
- Se renderizó cada pantalla a 390 px de ancho (iPhone) con datos de prueba y se capturó la página completa.
- Las capturas quedaron fuera del repo, en el scratchpad de la sesión.

---

## 0. Resumen ejecutivo

El flujo funcional está completo y bien pensado: avisos antes de anular, resúmenes al confirmar, errores en pantalla. El problema grande es **visual**, y viene de una causa única:

> **Más de la mitad de las clases de estilo que usan las pantallas no existen.**
> - La app escribe clases estilo Tailwind (`bg-gray-800`, `grid-cols-2`, `hidden`, `w-14`, `gap-2`, `line-through`…), pero **Tailwind no está instalado**.
> - `src/pages/index.astro` tiene una copia a mano de solo **82 clases**, y las pantallas usan **189**.
> - Las **116 que faltan** no hacen nada y el navegador las ignora sin avisar.

Por eso hoy:
- Hay botones con texto blanco sobre fondo blanco (invisibles).
- Se ven inputs que deberían estar ocultos ("Choose File").
- Las fotos se desbordan.
- Las grillas de 2 columnas salen en 1 sola.
- Faltan espacios entre elementos.

Arreglar eso (punto 1.1) corrige de una vez cerca del 60 % de los problemas visuales. Hay que hacerlo **antes** de cualquier rediseño, porque si no se estaría diseñando sobre una base rota.

Además hay **3 errores de comportamiento** (punto 1.2) que conviene corregir ya, porque pueden generar datos duplicados o confusión al cargar plata.

---

## 1. Crítico (bloquea el uso diario)

### 1.1 Estilos que no existen (causa raíz)

| Síntoma visto en las capturas | Clase faltante | Dónde |
|---|---|---|
| **Movimientos**, **Mover plata** y **Cuotas por cobrar** salen gris clarito con texto blanco (casi invisibles) | `bg-gray-800` | Inicio |
| **Pendientes de asignar** invisible | `bg-amber-600` | Inicio |
| Aparece el selector nativo "Choose File / No file chosen" | `hidden` | Vehículos, Detalle (galería) |
| Las miniaturas del gasto salen a tamaño gigante y se salen de la tarjeta (la pantalla se ensancha a ~600 px) | `w-14 h-14`, `object-cover` | Registrar gasto → Un vehículo |
| Las miniaturas de la galería ocupan media pantalla y tapan "Agregar fotos" | `w-16 h-16`, `flex-shrink-0`, `relative/absolute` | Detalle del vehículo |
| Las categorías, cuentas y "¿A qué corresponde?" salen en 1 columna con botones apretados de ~25 px de alto | `grid-cols-2`, `gap-2`, `py-2.5` | Gasto, Ingreso, Cobrar cuota, Vender |
| Botones pegados sin separación | `gap-2`, `space-y-2/3`, `mt-*` | Casi todas |
| El ícono de lupa queda arriba del buscador, no adentro | `relative/absolute`, `pl-9` | Vehículos |
| Los movimientos anulados no se tachan | `line-through` | Movimientos |
| La lista de movimientos muestra viñetas (•) | falta el reset de `list-style` | Movimientos, cuotas, detalle |
| El visor de fotos a pantalla completa puede salir mal posicionado | `fixed inset-0`, `z-50`, `bg-black/95` | Galería |
| El diálogo "Confirmar igual" con fondo ámbar sale sin color | `bg-amber-50`, `border-amber-300` | Compra, Gasto |
| El botón "Anular" rojo sale sin fondo | `bg-red-600` | Diálogos de anulación |
| El badge de estado sale sin color | `bg-green-50`, `text-green-700` | Vehículos, Detalle |
| "Volver" es un botoncito gris de 12 px (difícil de tocar) | `px-2.5`, `hover:*` | Todas |
| Labels "sr-only" visibles ("Proveedor" duplicado) | `sr-only` | Gasto |

**Recomendación:**
- Instalar **Tailwind CSS v4** con el plugin de Vite en Astro.
- Borrar el CSS copiado a mano de `index.astro`.
- Las clases que ya están escritas en las pantallas pasan a funcionar sin cambiar los componentes.
- Es un cambio chico de configuración con un efecto enorme.

**Alternativa sin dependencia:** completar a mano las 116 clases. No se recomienda: es frágil y cada pantalla nueva vuelve a romperlo.

### 1.2 Errores de comportamiento

1. **Doble toque = doble registro.**
   - **Qué pasa:** los botones Confirmar de Comprar, Vender, Gasto, Ingreso, Pasar plata, Aporte/Retiro, Cobrar cuota y Asignar gasto **no se deshabilitan mientras se guarda**.
   - **Riesgo:** con señal lenta, dos toques registran dos compras, dos gastos o dos cobros.
   - **Única que lo hace bien:** Cuentas ("Guardando…").
   - **Arreglo:** estado `guardando` + botón deshabilitado + texto "Guardando…".
2. **"Ver vehículos" no hace nada** después de registrar una compra.
   - **Causa:** `AuthFlow` no le pasa `onVerVehiculos` a `CompraVehiculoView`.
3. **No se ve qué cuenta o socio elegiste** en Pasar entre cuentas y en Aporte/Retiro.
   - **Causa:** los botones tienen `aria-pressed`, pero el mismo estilo esté elegido o no.
   - **Efecto:** el usuario no sabe desde y hacia dónde está pasando la plata.
   - **Bonus:** esas pantallas tampoco muestran el saldo de cada cuenta. Gasto sí lo muestra.

---

## 2. Alto (fricción fuerte en tareas frecuentes)

### 2.1 Pantalla de inicio
- **10 botones apilados**, todos iguales y con el mismo peso visual. Comprar, vender y gastar están al mismo nivel que Movimientos.
- No hay **ningún dato** en el inicio: para ver la plata disponible hay que entrar a Balances.
- "Dispositivo vinculado correctamente." aparece **siempre**. Es un texto de la primera vez que quedó fijo.
- "Desvincular dispositivo" en rojo al pie, sin confirmación. Un toque accidental obliga a volver a ingresar la credencial completa.
- **Propuesta:**
  - una tarjeta arriba con *Dinero disponible* y los avisos (cuotas vencidas, pendientes de asignar);
  - una grilla 2×2 con las 4 acciones diarias (Comprar, Vender, Gasto, Ingreso);
  - debajo, accesos secundarios (Vehículos, Movimientos, Balances, Mover plata);
  - Configuración (Cuentas, Cambiar PIN, Desvincular con confirmación) en una sección aparte.

### 2.2 Navegación
- **Sin barra inferior.** Todo vuelve al inicio con "Volver", y no hay forma de ir de Vehículos a Movimientos sin pasar por el inicio.
  - **Propuesta:** barra inferior fija con 4 pestañas (Inicio · Vehículos · Movimientos · Balances) y botón grande "+" para cargar.
- **El botón "atrás" del celular sale de la app.** La navegación es un `useState` sin historial, así que en Android el gesto atrás cierra la PWA.
  - **Propuesta:** sincronizar la vista con `history.pushState` / `popstate`.
- **"Volver" es inconsistente:**
  - desde el detalle de un vehículo abierto desde Movimientos o Ganancia, "Volver" lleva a Vehículos y no a donde estabas;
  - Pasar plata termina en "Listo", Compra en "Volver al inicio".
- **Al terminar una carga** solo se ofrece "Volver al inicio". Faltaría "Cargar otro" (gastos en serie) y "Ver vehículo".

### 2.3 Formularios de plata
- **Los montos se escriben sin separador de miles** ("8000000"), y es fácil equivocarse por un cero. Cuentas sí lo formatea ("$ 8.000.000") mientras escribís.
  - **Propuesta:** un único `<InputMonto>` con formato en vivo, usado en todas las pantallas.
- **Inputs de 14 px** (`text-sm`): en iPhone, cualquier input con letra menor a 16 px **hace zoom automático** al tocarlo. Esto se suma a `user-scalable=no`, que impide volver a alejar.
  - **Propuesta:** inputs de 16 px.
  - **Además:** quitar `maximum-scale=1, user-scalable=no` por accesibilidad.
- **Registrar gasto:** el botón **Confirmar queda arriba** del selector de vehículo (Un vehículo) y del reparto (Varios), así que hay que bajar, elegir y volver a subir.
  - **Propuesta:** Confirmar siempre al final, idealmente fijo abajo.
- **Orden del gasto:** hoy es Monto → Descripción → Categoría → Cuenta → Alcance → Proveedor → Vehículo.
  - **Propuesta:** Monto → ¿A qué corresponde? (y vehículo) → Categoría → Cuenta → Descripción/Proveedor.
- **Diálogos de "¿Seguro?" en línea:**
  - **El problema:** el aviso de anular (en el detalle o en Movimientos) aparece **al final de la página**, lejos del botón que tocaste. En el detalle, "Anular venta" está en el medio y el diálogo aparece abajo de todo, así que parece que el botón no hizo nada.
  - **Propuesta:** un componente `<Dialogo>` real (hoja inferior / modal) reutilizable.
- **Vender:**
  - no muestra el **costo real** del auto elegido ni la **ganancia estimada** mientras escribís el precio; recién la muestra al confirmar;
  - no hay paso de "Revisá antes de confirmar" para una operación de millones con permutas y cuotas;
  - el listado para elegir el auto no tiene buscador (ya estaba en la lista de ideas).
- **Comprar:** 8 campos sueltos en una sola columna. Marca/Modelo y Año/Color podrían ir de a 2 por fila. La foto, que es lo que identifica al auto en el patio, queda al final como un input nativo.

### 2.4 Estados de carga y error
- **Sin indicadores de carga.** En Balances, Vehículos, Movimientos, Cuotas y Ganancia mensual la pantalla aparece vacía o en $ 0 hasta que llegan los datos.
  - **Riesgo:** con señal floja, "Dinero disponible $ 0" puede asustar.
  - **Propuesta:** esqueletos (skeletons) o "Cargando…".
- **Errores silenciosos:** Balances (cuentas), Movimientos y Ganancia mensual tragan el error y muestran la lista vacía como si no hubiera datos.
  - **Ya resuelto en:** Vehículos y Detalle, que tienen el patrón "No se pudo cargar · Reintentar".
  - **Pendiente:** llevarlo a todas.

---

## 3. Medio (consistencia y pulido)

- **Badge de estado:** siempre verde, aunque diga "Vendido".
  - **Propuesta:** En stock = verde, Reservado = ámbar, Vendido = gris, Anulado = rojo.
- **Negativos con dos formatos:** `$ -150.000` (guion, en los saldos de cuenta) y `$ −150.000` (signo menos, en los avisos). Hay que unificarlos en `formatMoney`.
  - **Además:** los saldos negativos se muestran en negro igual que los positivos; deberían ir en rojo.
- **Detalle del vehículo:** es muy largo y está mal ordenado.
  - **Problemas:**
    - el **costo real** y la **ganancia** quedan abajo de todo;
    - "Anular venta/compra" aparece **antes** que "Agregar gasto";
    - el botón rojo está en medio de la información.
  - **Propuesta:**
    - encabezado con foto, código, estado y costo real (o ganancia si se vendió);
    - acciones principales (Agregar gasto, Vender);
    - secciones plegables (Compra, Gastos, Venta, Cuotas);
    - "Anular" al final, separado.
- **Tarjetas de vehículo:** foto de 192 px de alto, así que entran 2 autos por pantalla.
  - **Propuesta:** opción de lista compacta (miniatura + datos) para recorrer el stock rápido. Mostrar el **costo** y los **días en stock** en la tarjeta.
- **"Cargar stock existente":** botón azul principal arriba del listado de Vehículos. Es una tarea de arranque que ya no se usa en el día a día.
  - **Propuesta:** moverlo a Configuración o a un menú "…".
- **Cuotas por cobrar:**
  - el botón "Cobrar" es chico (`py-1.5`);
  - el teléfono se ve como link subrayado;
  - **propuesta:** botones "Llamar" y "WhatsApp" (`https://wa.me/…`).
- **Movimientos:**
  - sin agrupar por día;
  - sin filtros (cuenta, tipo, vehículo);
  - el tipo y el título repiten lo mismo ("Cobro de venta / Cobro de venta");
  - hay que tocar la fila para descubrir que existe "Anular".
- **Ganancia mensual:**
  - lista de texto plano;
  - un gráfico de barras simple (ganancia por mes) y el desglose como mini tabla alineada a la derecha leerían mucho mejor.
- **Teclado PIN:**
  - "Me olvidé" aparece **dos veces** (en la grilla y abajo);
  - "Me olvidé el PIN" desvincula el dispositivo **sin confirmación**.
- **Textos que no se adaptan:** en modo ingreso, si no hay cuentas, dice "para poder registrar un **gasto**".
- **Proveedor:** busca en cada tecla sin espera (debounce), así que con red lenta las respuestas pueden llegar desordenadas.
- **Teléfonos:** se cargan con `type="text"` y deberían usar `type="tel"`, que abre el teclado numérico.

---

## 4. Bajo / técnico de PWA

- **Ícono de la app:** solo `icon.svg`.
  - **iOS** no usa SVG para la pantalla de inicio (muestra una captura); falta `apple-touch-icon` PNG 180×180.
  - **Android/Chrome** pide PNG 192 y 512 para instalar bien.
- **Zonas seguras de iPhone:** no se usa `env(safe-area-inset-*)`. Con la barra inferior propuesta va a hacer falta.
  - **Además:** `apple-mobile-web-app-status-bar-style` está en `default`.
- **Sin modo oscuro.** No es prioritario para uso de día en el patio, pero sale casi gratis con Tailwind.
- **Sin feedback táctil:** a los botones les falta un estado `active:` visible al presionar.
- **Accesibilidad:**
  - las tarjetas clickeables son `<article onClick>` y no se pueden enfocar;
  - el contraste del gris `text-gray-500` sobre `bg-gray-50` es justo.

---

## 5. Lo que está bien (mantener)

- Lenguaje claro y argentino ("¿De dónde salió la plata?", "Pasaste $ X de A a B").
- Resúmenes de confirmación con el detalle de lo que pasó.
- Avisos previos a anular que listan exactamente qué se revierte (pagos, gastos, cuotas, permutas).
- Aviso de saldo negativo con "Confirmar igual".
- Errores que dicen "No se guardó nada. Podés reintentar."
- El filtro y la búsqueda de Vehículos sobreviven a entrar al detalle y volver.
- Teclado PIN propio con botones grandes de 64 px.

---

## 6. Propuesta de orden de trabajo (historias UX)

Cada paso se apoya en el anterior:

| # | Historia | Contenido | Esfuerzo |
|---|---|---|---|
| UX-01 | **Base de estilos real** | Instalar Tailwind v4, borrar el CSS a mano y quitar el bloqueo de zoom. Verificar las 22 pantallas con capturas. | S |
| UX-02 | **Arreglos de comportamiento** | Botones "Guardando…" contra el doble registro, "Ver vehículos" tras la compra y selección visible en Pasar plata y Aporte/Retiro (con saldos). | S |
| UX-03 | **Componentes base** | `<Encabezado>` con Volver grande, `<Boton>` (primario/secundario/peligro), `<InputMonto>` con miles y 16 px, `<Opciones>` (botones seleccionables), `<Dialogo>` (hoja inferior), `<Badge>` de estado, `<Cargando>` / `<ErrorReintentar>`. Reemplazar en todas las pantallas. | M |
| UX-04 | **Inicio nuevo + navegación** | Tarjeta de plata y avisos, 4 acciones principales y barra inferior. Gesto "atrás" del celular con historial, y "Volver" que vuelve a donde estabas. | M |
| UX-05 | **Formularios de carga** | Orden de Gasto, Confirmar al final y "Cargar otro". Vender con costo y ganancia estimada y paso de revisión. Compra en 2 columnas con la foto arriba. | M |
| UX-06 | **Detalle del vehículo** | Encabezado con números clave, acciones arriba, secciones plegables y Anular al final. | M |
| UX-07 | **Listas** | Vehículos con vista compacta y días en stock. Movimientos agrupados por día. Cuotas con Llamar/WhatsApp. Ganancia con gráfico. | M |
| UX-08 | **PWA** | Íconos PNG, safe areas y feedback táctil. | S |

**Recomendación:**
- Hacer **UX-01 y UX-02 ya**: son chicos, sin decisiones de diseño, y arreglan lo que hoy está roto.
- Antes de UX-03/04 conviene definir con los socios la identidad visual: color principal, si va el logo, tono. También conviene mirar las capturas nuevas después de UX-01, porque muchas cosas de este informe van a cambiar de aspecto.
