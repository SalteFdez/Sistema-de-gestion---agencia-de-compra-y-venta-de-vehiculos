# UX-03a · Componentes base (crear y usar en Comprar, Vender y Gasto)

*Refinada con `/story`. Fuente: `BACKLOG.md` (Etapa 4, UX-03), `AUDITORIA-UX.md` §2.3, §2.4, §3 y la fila UX-03 de §6.*

> **División:** UX-03 crea ocho componentes y los reemplaza en unas veinte pantallas, así que no entra en una historia de 3 criterios. Queda partida en dos, como estaba previsto:
> - **UX-03a** (esta): crea **todos** los componentes y el color de marca, unifica los negativos en `formatMoney` y los usa en las tres pantallas de carga más usadas: **Comprar**, **Vender** y **Registrar gasto / ingreso**.
> - **UX-03b** (`historias/UX-03b.md`): usa los componentes en **el resto** de las pantallas.
>
> La línea UX-03 de `BACKLOG.md` sigue sin dividir: hay que separarla en UX-03a / UX-03b (no la toqué porque esta tarea era solo de historias).

*Lo que ya está y se reusa:*
- *Tailwind v4 con `global.css` (UX-01);*
- *el patrón "Guardando…" que UX-02 dejó repetido en cada pantalla;*
- *el estilo seleccionado `aria-pressed` + azul de Gasto;*
- *`formatMoney` / `parseMoneyInput`;*
- *las tres copias de `formatoNegativo`, en Compra, Gasto y Detalle;*
- *los avisos "Confirmar igual" en línea;*
- *los **498 tests** actuales.*

*Requiere: UX-01, UX-02.*

## Historia
Como socio, quiero que Comprar, Vender y Registrar gasto tengan botones, montos y avisos claros y siempre iguales, para cargar rápido sin equivocarme con los ceros.

## Criterios de aceptación
- [ ] **Montos con miles mientras escribo.** Dado que estoy en Comprar, Vender (precio, cobros, permutas, financiado) o Registrar gasto / ingreso, cuando toco un monto, se abre el **teclado numérico**. Mientras escribo "8000000" veo **"$ 8.000.000"**, y lo que se guarda es el número entero. En iPhone, tocar cualquier campo (monto, texto o búsqueda) **no hace zoom**, porque todos usan letra de 16 px.
- [ ] **Botones, opciones y negativos claros.** Dado cualquiera de esas tres pantallas, cuando la uso:
  - arriba hay un **encabezado** con el título y un **Volver** grande, de al menos 44 px de alto;
  - las cuentas, categorías y opciones se ven como botones seleccionables (el elegido en el **color de marca**), en 1 o 2 columnas, y las cuentas con su saldo debajo;
  - el botón principal tiene el color de marca y dice **"Guardando…"** mientras espera;
  - un saldo negativo se ve **en rojo** y con el signo menos tipográfico: **"$ −300.000"**, nunca "$ -300.000". Esto vale también en el resto de la app, porque lo da `formatMoney`.
- [ ] **El aviso de saldo negativo aparece donde lo veo.** Dado que confirmo una compra o un gasto que deja una cuenta en negativo, cuando toco Confirmar, entonces se abre una **hoja desde abajo**, con fondo oscuro detrás, que dice "La cuenta X va a quedar en $ −N" y trae **Confirmar igual** y **Volver**. Volver o tocar el fondo la cierra sin guardar. Todo lo demás se comporta igual que antes: los tests existentes siguen verdes, ajustando solo los selectores que cambien por texto o por rol.

## Plan
- **Color de marca como token:** en `global.css`, un `@theme` con `--color-marca` (el azul actual, igual a `blue-600`) y `--color-marca-oscuro` (igual a `blue-700`, para presionado y hover). Así existen `bg-marca`, `text-marca`, `border-marca` y `bg-marca-oscuro`, y cambiar la identidad visual después es tocar dos líneas. Los componentes nuevos y las tres pantallas de esta historia usan `marca` en lugar de `blue-600`.
- **Componentes nuevos en `src/components/ui/`**, cada uno con sus tests:
  - **`Encabezado`:** título + **Volver** con área táctil de al menos 44 px.
  - **`Boton`:** variantes `primario` (marca), `secundario` (borde) y `peligro` (rojo), ancho completo opcional. Con la prop **`guardando`** queda `disabled`, muestra "Guardando…" e ignora un segundo toque. Reemplaza el patrón repetido de UX-02.
  - **`InputMonto`:**
    - `inputMode="numeric"` y letra de 16 px;
    - formatea en vivo con `formatMoney` y entrega un **número entero** (vacío = sin valor, no 0);
    - el cursor queda al final al reformatear.
  - **`Opciones`:**
    - grupo de botones seleccionables con `aria-pressed`, en 1 o 2 columnas;
    - cada opción con una línea secundaria opcional, como el saldo (en rojo si es negativo);
    - selección única y seleccionado en marca.
  - **`Dialogo`:** hoja inferior fija con fondo oscuro, `role="dialog"` y `aria-modal`. Lleva título, contenido y acciones (usa `Boton`), el foco va al primer botón, y **Escape** o el fondo cierran. Reemplaza los "¿Seguro?" y "Confirmar igual" en línea.
  - **`BadgeEstado`:** En stock verde, Reservado ámbar, Vendido gris, Anulado rojo.
  - **`Cargando`** y **`ErrorReintentar`** ("No se pudo cargar" + Reintentar).

  `BadgeEstado`, `Cargando` y `ErrorReintentar` se crean y se testean acá, y se usan en UX-03b.
- **Negativos unificados:** `formatMoney` usa el signo menos tipográfico **"−"** (U+2212) para negativos. Se **borran las tres copias de `formatoNegativo`** (Compra, Gasto y Detalle) y pasan a usar `formatMoney`. Se ajustan los tests de `formatMoney` y los que esperaban "$ -".
- **Reemplazo en Comprar, Vender y Registrar gasto / ingreso**, con lo que usan adentro (`RepartoCuentas`, `FilasVehiculoMonto`, los campos de vehículo):
  - `Encabezado`, `Boton` (con `guardando`), `InputMonto` en todos los montos, y `Opciones` para cuentas, categorías, "¿A qué corresponde?" y "¿Hay permuta / financiación?";
  - `Dialogo` para el aviso de negativo;
  - todos los `<input>` de texto en 16 px.

  **Sin cambiar orden, textos ni comportamiento** (eso es UX-05).
- **Verificación:**
  - `astro build` OK;
  - los 498 tests más los nuevos de `ui/`, todos verdes;
  - revisión a 390 px de Comprar, Vender (con permuta y financiación) y Gasto (Un vehículo y Varios), incluido el diálogo de negativo;
  - en un iPhone real, comprobar que no hace zoom al tocar un campo.

## Fuera de alcance
- El resto de las pantallas: UX-03b.
- Navegación, inicio nuevo y barra inferior: UX-04.
- Orden de los formularios, Confirmar fijo abajo, "Revisá antes de confirmar" y ganancia estimada en Vender: UX-05.
- Elegir el color definitivo o el logo: la identidad visual todavía no está definida, y queda el token listo.
- Modo oscuro.

## Riesgos / notas
- **El cambio de `formatMoney` toca toda la app:** cualquier test o pantalla que compare el texto "$ -…" va a ver "$ −…". Es el objetivo, pero hay que buscar y ajustar todos los tests que lo esperan, también fuera de las tres pantallas.
- **Tests que buscan por texto o rol:** con `Dialogo` el aviso pasa a estar dentro de un `role="dialog"`, y con `InputMonto` el valor mostrado pasa de "8000000" a "$ 8.000.000". Los tests que escriben o leen montos se ajustan a la nueva forma, sin cambiar lo que verifican.
- **`InputMonto` y el cursor:** reformatear mientras se escribe puede mover el cursor. Se deja siempre al final (los montos se escriben de izquierda a derecha). Corregir un dígito del medio obliga a borrar desde el final; es aceptable para montos.

## Decisiones tomadas
- El color principal va como token `--color-marca` / `--color-marca-oscuro` en el `@theme` de `global.css`, y los componentes usan `bg-marca` / `text-marca`.
- Componentes en `src/components/ui/`: `Encabezado`, `Boton` (primario / secundario / peligro + `guardando`), `InputMonto`, `Opciones`, `Dialogo` (hoja inferior), `BadgeEstado`, `Cargando` y `ErrorReintentar`.
- Negativos unificados en `formatMoney` con "−", sin copias de `formatoNegativo`; los saldos negativos en rojo.
- Todos los inputs de texto a 16 px.
- Cada componente con sus tests, y el reemplazo sin cambiar comportamiento.
- División en UX-03a (componentes + Comprar, Vender y Gasto) y UX-03b (resto).

## Dudas abiertas
- Ninguna.
