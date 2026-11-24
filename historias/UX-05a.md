# UX-05a · Formularios de carga: Gasto, Ingreso y Comprar

*Refinada con `/story`. Fuente: `BACKLOG.md` (Etapa 4, UX-05) y `AUDITORIA-UX.md` §2.3 y fila UX-05 de §6:*
- *Confirmar queda arriba del selector de vehículo o del reparto;*
- *el orden del gasto es raro;*
- *al terminar solo se ofrece volver;*
- *en Comprar hay 8 campos en una columna y la foto queda al final como input nativo.*

*Reusa `InputMonto`, `Opciones`, `Boton`, `Dialogo` y `Encabezado` de `src/components/ui/`, y el "Volver a Caja" de las confirmaciones (UX-09a). **No cambia RPCs ni base.** Requiere: UX-03a, UX-09a.*

> **División:** UX-05 toca tres formularios con cambios distintos (orden y "Cargar otro" en Gasto/Ingreso, foto y grilla en Comprar, y ganancia, buscador y revisión en Vender). No entra en 3 criterios. Queda en:
> - **UX-05a** (esta): Gasto, Ingreso y Comprar.
> - **UX-05b** (`historias/UX-05b.md`): Vender.
>
> La línea UX-05 de `BACKLOG.md` hay que separarla en UX-05a / UX-05b.

## Historia
Como socio, quiero que Registrar gasto, Registrar ingreso y Comprar me pidan las cosas en un orden lógico, con Confirmar siempre al final y la foto primero, para cargar en segundos sin subir y bajar la pantalla.

## Criterios de aceptación
- [ ] **Gasto en orden y Confirmar al final.** Dado que abro **Registrar gasto**, cuando lo completo, los campos aparecen en este orden:
  1. **Monto**;
  2. **¿A qué corresponde?**, con el selector de vehículo (Un vehículo) o el reparto (Varios vehículos) **justo debajo**;
  3. **Categoría**;
  4. **Cuenta**;
  5. **Descripción** y **Proveedor**.

  El botón **Confirmar** está **siempre al final**, debajo de todo, nunca arriba del selector ni del reparto. En el gasto simple (General o Un vehículo) queda **fijo abajo**, sin tapar el último campo y respetando la zona segura del iPhone. **Registrar ingreso** sigue el mismo orden, sin "¿A qué corresponde?" ni proveedor.
- [ ] **"Cargar otro" al terminar.** Dado que confirmé un gasto o un ingreso y veo el resumen, cuando toco **Cargar otro**, entonces vuelvo al formulario **vacío**, con la **misma cuenta** que elegí recién ya seleccionada, para cargar el siguiente sin volver a elegirla. **Volver a Caja** sigue estando. El gasto anterior quedó guardado una sola vez.
- [ ] **Comprar con la foto primero.** Dado que abro **Comprar vehículo**, cuando miro el formulario, entonces arriba de todo hay un **recuadro grande "Sacar foto"** que abre la **cámara** del celular, y en la compu la elección de archivo. Al sacarla, el recuadro muestra la vista previa con la opción de cambiarla. Debajo, **Marca / Modelo** y **Año / Color** van de **a dos por fila**, y después siguen patente, vendedor, precio y la cuenta, como hoy. Comprar sin foto sigue funcionando igual.

## Plan
- **`RegistrarGastoView`:**
  - se **reordena** el JSX en Monto → ¿A qué corresponde? (y debajo el selector de vehículo o `FilasVehiculoMonto`) → Categoría (`Opciones`) → Cuenta (`Opciones`) → Descripción y Proveedor;
  - el `Boton` de Confirmar pasa **al final**. En gasto simple va en una barra fija abajo (`fixed bottom-0`, `padding-bottom: env(safe-area-inset-bottom)`), con espacio abajo del formulario para no tapar el último campo. En "Varios vehículos" queda al final del contenido, no fijo, porque el reparto es largo;
  - en modo ingreso se ocultan "¿A qué corresponde?" y Proveedor.

  Sin cambiar validaciones, avisos de negativo ni llamadas al servicio.
- **"Cargar otro":** en la confirmación de gasto e ingreso, un `Boton` secundario **Cargar otro** al lado de "Volver a Caja". Resetea el estado del formulario a su valor inicial, pero conserva `cuentaId`, y vuelve al paso de carga.
  - **Historial (UX-04a):** "Cargar otro" reemplaza la entrada de confirmación por la del formulario, así atrás no vuelve a una confirmación vieja.
- **`CompraVehiculoView`:**
  - arriba de todo, un recuadro táctil grande "Sacar foto", que es un `<label>` sobre el input `type="file" accept="image/*" capture="environment"` oculto;
  - con foto, muestra la miniatura y "Cambiar foto";
  - la foto sigue entrando por el mismo camino (compresión + `agregarFoto` después de la RPC);
  - Marca/Modelo y Año/Color en `grid grid-cols-2 gap-3`;
  - el resto, en el mismo orden.
- **Tests:**
  - **Gasto:** el orden de los campos (por el orden en el DOM de sus labels); Confirmar después del último campo en simple y en varios; en modo ingreso, sin "¿A qué corresponde?" ni proveedor.
  - **Cargar otro:** formulario vacío con la misma cuenta seleccionada; el servicio se llamó una sola vez.
  - **Comprar:** el recuadro de foto primero, con `capture`; la vista previa al elegir; compra sin foto; grilla de a dos.
  - **Regresión:** los tests actuales de Gasto, Ingreso y Compra verdes, ajustando solo selectores que dependan del orden.

  Revisión a 390 px de las tres pantallas, y en un iPhone real que Confirmar fijo no quede bajo la barra de gestos.

## Fuera de alcance
- **Vender** (ganancia estimada, buscador, revisión, vender desde el detalle): UX-05b.
- "Cargar otro" en Comprar o Vender: no está decidido. Solo Gasto e Ingreso, que se cargan en serie.
- Cambiar validaciones, RPCs o base.
- Detalle del vehículo (UX-06) y listas (UX-07).

## Riesgos / notas
- **Confirmar fijo y el teclado:** en iPhone, con el teclado abierto, una barra `fixed bottom-0` puede quedar arriba del teclado o tapar el campo que se está escribiendo. Hay que probarlo en un iPhone real. Si molesta, se deja Confirmar al final **sin fijar** en todos los casos, que cumple igual el criterio "siempre al final".
- **`capture` en la compu:** se ignora y abre el selector de archivos, que es lo esperado.

## Decisiones tomadas
- Registrar gasto: Monto → ¿A qué corresponde? (con vehículo o reparto debajo) → Categoría → Cuenta → Descripción y Proveedor. Confirmar siempre al final, fijo abajo con zona segura si es simple.
- Confirmaciones de Gasto e Ingreso: además de "Volver a Caja", **Cargar otro**, que limpia el formulario y conserva la cuenta.
- Comprar: la foto arriba de todo, con un recuadro grande "Sacar foto" (input con `capture`), y Marca/Modelo y Año/Color de a dos por fila.
- No se cambian RPCs ni base.

## Dudas abiertas
- Ninguna.
