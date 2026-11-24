# UX-09b · Compartir y descargar fotos

*Refinada con `/story`. Sale de dividir UX-09. Contexto: lo que más se hace con la app es compartir fotos de los autos en estados de WhatsApp e historias de Instagram o Facebook.*

*Se apoya en lo que ya está:*
- *de E3-02: el bucket privado `vehiculos`, las URLs firmadas y `vehiculo_fotos` (vigentes, en orden, con una principal);*
- *`GaleriaFotos` en el detalle, con foto grande, miniaturas y visor;*
- *las tarjetas de `VehiculosView`, con "Sin foto · Agregar";*
- *`Boton` de `src/components/ui/` (con `guardando`), y los avisos en pantalla.*

*Requiere: UX-09a (o UX-04), E3-02.*

## Historia
Como socio, quiero compartir o descargar las fotos de un auto con un toque, para subirlas a un estado de WhatsApp o a una historia de Instagram o Facebook sin buscarlas en el celular.

## Criterios de aceptación
- [ ] **Compartir desde el listado.** Dado un auto **con fotos** en el listado de Vehículos, cuando toco **Compartir** en su tarjeta (ícono + texto, área de al menos 44 px), entonces el botón dice **"Preparando…"** y queda deshabilitado mientras se bajan las fotos. Después se abre el **menú de compartir del celular** con **todas las fotos del auto** (la principal primero), donde aparecen WhatsApp, Instagram, Facebook, etc. Cada foto se llama `MC-001-1.jpg`, `MC-001-2.jpg`… y va con el texto "Marca Modelo Año" (WhatsApp lo usa; Instagram lo ignora). Los autos **sin fotos** no tienen Compartir: queda el "Sin foto · Agregar".
- [ ] **Compartir y descargar desde la galería.** Dado el detalle de un auto con fotos, cuando estoy en la galería, entonces tengo:
  - **Compartir esta foto**: la que estoy viendo grande, sola;
  - **Compartir todas**: todas, en orden;
  - **Descargar**: baja la que estoy viendo al celular o la compu.

  Los tres muestran "Preparando…" mientras trabajan.
- [ ] **Funciona aunque el aparato no comparta, y no asusta.** Dado que uso la app en un aparato que **no puede compartir archivos** (ej. una compu), cuando toco Compartir o Compartir todas, entonces las fotos se **descargan** una por una con su nombre. Además:
  - si abro el menú de compartir y lo **cancelo**, no aparece ningún error;
  - si una foto no se pudo bajar, veo un aviso en pantalla ("No se pudo preparar 1 de 4 fotos") y se comparten las demás. Si no se pudo ninguna, solo el aviso;
  - el botón vuelve a habilitarse siempre.

## Plan
- **Lógica en `src/lib/vehiculos/compartir-fotos.ts`**, pura y con dependencias inyectables (`fetch`, `navigator`, cómo descargar) para testearla:
  - **`prepararArchivos(fotos, codigo)`:** baja cada URL firmada con `fetch` como `Blob` y arma un `File` JPEG (`type: 'image/jpeg'`) con nombre `MC-001-<n>.jpg`. Devuelve los archivos que salieron bien y cuántos fallaron.
  - **`compartir(archivos, texto)`:**
    - si `navigator.canShare?.({ files })` es verdadero, llama a `navigator.share({ files, text })`;
    - si no, descarga cada archivo con un `<a download>` sobre una URL de objeto (`URL.createObjectURL`), que se libera después;
    - un `AbortError` (cancelar el menú) se toma como "cancelado", no como error.
  - **`descargar(archivo)`:** siempre con `<a download>`.
- **Fotos del auto desde la tarjeta:** la tarjeta solo tiene la principal, así que al tocar Compartir se piden las fotos **vigentes** del auto (`vehiculo_fotos`, en orden, principal primero) y sus URLs firmadas en **un** pedido, con un método nuevo en `VehiculosService` que reusa lo de E3-02. En el detalle se usan las URLs firmadas que ya tiene la galería. Para saber si mostrar el botón alcanza con `foto_url`: si el auto tiene principal, tiene al menos una foto.
- **Gesto del usuario y Safari** *(ver riesgos)*: si `navigator.share` falla con `NotAllowedError` porque el gesto "se venció" mientras se bajaban las fotos, el botón pasa a **"Compartir ahora (fotos listas)"**. Ese segundo toque llama a `share` directo con los archivos ya preparados.
- **Pantallas:**
  - **`VehiculosView`:** en cada tarjeta con foto, un `Boton` secundario **Compartir** que no abre el detalle (frena la propagación, como "Sin foto · Agregar").
  - **`GaleriaFotos`:** tres botones debajo de la foto grande: Compartir esta foto, Compartir todas y Descargar.
  - Todos usan `Boton` con `guardando` para el "Preparando…". Los avisos van con el mecanismo de avisos en pantalla que ya existe.
- **Tests:**
  - **`compartir-fotos`**, con `fetch` y `navigator` simulados:
    - nombres y tipo de los archivos;
    - una foto que falla y todas que fallan;
    - `canShare` verdadero llama a `share` con los archivos y el texto;
    - `canShare` falso o ausente descarga cada archivo;
    - `AbortError` no es error;
    - `NotAllowedError` deja los archivos listos para el segundo toque.
  - **Pantallas:**
    - el botón solo en autos con foto, "Preparando…" deshabilitado, y no abre el detalle;
    - en la galería: esta, todas y descargar;
    - aviso de fallo parcial.

  **Prueba manual obligatoria:**
  - en un **Android** (Chrome) y un **iPhone** (Safari, app instalada), compartir 1 y 4 fotos a un estado de WhatsApp y a una historia de Instagram;
  - en una compu, que se descarguen.

## Fuera de alcance
- Marca de agua o logo en las fotos, precio en la foto, edición o recorte.
- Abrir directo el estado de WhatsApp o la historia de Instagram: desde la web no se puede, y se usa el menú nativo de compartir.
- Compartir varios autos a la vez.
- Comprimir o achicar las fotos para compartir: se comparten tal cual están guardadas (JPEG ~1280 px, ya comprimidas en E1-03).

## Riesgos / notas
- **El gesto del usuario puede vencer** (sobre todo en Safari): `navigator.share` solo se puede llamar poco después de un toque. Si bajar varias fotos tarda, el navegador puede rechazarlo con `NotAllowedError`. Por eso existe el segundo botón "Compartir ahora (fotos listas)". Con fotos de ~200 KB y buena señal no debería hacer falta, pero con 10 fotos y datos móviles sí puede pasar.
- **Cuántas fotos acepta cada app:** WhatsApp acepta varias en un estado. Las historias de Instagram y Facebook, según la versión, pueden tomar **solo la primera** o pedir elegir. Por eso existe también "Compartir esta foto" en la galería. No depende de la app, sino de cómo cada red recibe lo compartido.
- **Descargas múltiples en la compu:** algunos navegadores piden permiso para "descargar varios archivos" la primera vez. Es un aviso del navegador, no un error.
- **CORS:** las URLs firmadas de Supabase Storage permiten `GET` desde el navegador. Si algún día fallara, se ve en la prueba manual, y la alternativa es bajarlas con el cliente de Storage (`download`) en lugar de `fetch`.

## Decisiones tomadas
- Botón **Compartir** en cada tarjeta (ícono + texto, 44 px) que comparte todas las fotos del auto. En la galería: **Compartir esta foto**, **Compartir todas** y **Descargar**.
- Web Share API nivel 2 con archivos (`canShare({files})` + `share({files, text})`). Fotos bajadas con `fetch` desde la URL firmada y convertidas en `File` JPEG `MC-001-1.jpg`. Texto opcional "Marca Modelo Año".
- Se usa el menú nativo de compartir del celular; no se abre directo el estado ni la historia.
- Si no se puede compartir archivos, se descarga con `<a download>`. Cancelar el menú (`AbortError`) no es error. "Preparando…" deshabilitado mientras se preparan, y aviso si falla alguna foto.
- Autos sin fotos: sin botón Compartir.
- Lógica en `src/lib/vehiculos/compartir-fotos.ts` con tests (mock de `fetch` y `navigator.share`); los componentes usan `Boton`.

## Dudas abiertas
- Ninguna.
