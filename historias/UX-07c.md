# UX-07c · Cuotas por cobrar: Llamar y WhatsApp

*Refinada con `/story`. Sale de dividir UX-07. Fuente: `AUDITORIA-UX.md` §3 (Cuotas por cobrar: el botón Cobrar es chico, el teléfono se ve como link subrayado; propuesta de botones "Llamar" y "WhatsApp").*

*Se apoya en lo que ya está:*
- *`CuotasPorCobrarView` (E2-04), con cuotas ordenadas, vencidas en rojo, comprador, teléfono (`ventas.comprador_telefono`, texto libre), vehículo, "Cuota n de N", monto y saldo;*
- *`Boton` de `src/components/ui/`.*

*Sin cambios de base ni RPC. Requiere: UX-03b.*

## Historia
Como socio, quiero llamar o mandar un WhatsApp al comprador desde la cuota, con el mensaje ya escrito, para recordarle el pago en un toque.

## Criterios de aceptación
- [ ] **Llamar.** Dado una cuota cuyo comprador tiene teléfono, cuando toco **Llamar**, entonces el celular abre el marcador con ese número.
- [ ] **WhatsApp con el mensaje listo.** Dado una cuota con teléfono, cuando toco **WhatsApp**, entonces se abre WhatsApp con ese contacto y el mensaje escrito: *"Hola Juan Pérez, te escribo por la cuota 2 de 4 de $ 500.000 que vence el 15/12"*. El número se arma en formato argentino internacional (54 9 + código de área + número, sin el 0 ni el 15), aunque se haya cargado como "011 15-1234-5678" o "11 1234 5678".
  - Si el teléfono no se puede interpretar como un celular argentino, aparece **solo Llamar**.
  - Si no hay teléfono, **no aparecen** ni Llamar ni WhatsApp.
- [ ] **Cobrar más grande.** Dado cualquier cuota, cuando la miro, entonces el botón **Cobrar** es un botón principal de **44 px de alto**, fácil de tocar, y abre el mismo cobro de siempre. Llamar y WhatsApp quedan como botones secundarios al lado o debajo, también de 44 px.

## Plan
- **Funciones puras y testeables:**
  - **`normalizarCelularAR(texto)`:**
    1. deja solo los dígitos;
    2. saca un `54` inicial (y un `9` que lo siga) y un `0` inicial;
    3. si quedan 12 dígitos con un `15` justo después de un código de área de 2, 3 o 4 dígitos, saca ese `15`;
    4. devuelve el número **solo si quedan 10 dígitos**, y si no, `null`.
  - **`linkWhatsApp(telefono, mensaje)`:** `https://wa.me/549<número>?text=<mensaje codificado>`.
  - **`mensajeCuota(cuota)`:** "Hola <comprador>, te escribo por la cuota <n> de <total> de $ X que vence el dd/mm". **$ X es lo que falta cobrar de esa cuota**: el monto entero si no se cobró nada, o el saldo si es parcial. Va con `formatMoney`, y la fecha en `dd/mm`.
- **Llamar:** un `<a href="tel:<teléfono tal como se cargó, solo dígitos y +>">` con estilo de `Boton` secundario y 44 px.
- **WhatsApp:**
  - un `<a href=linkWhatsApp(…) target="_blank" rel="noopener">` con estilo de `Boton` secundario y 44 px;
  - solo si `normalizarCelularAR` devuelve un número;
  - sin teléfono, ninguno de los dos;
  - el teléfono deja de verse como link subrayado suelto y queda como texto chico debajo del comprador.
- **Cobrar:** pasa a `Boton` primario con `min-h-[44px]`, la misma acción.
- **Tests:**
  - **`normalizarCelularAR`:** "011 15-1234-5678", "11 1234 5678", "+54 9 11 1234 5678", "0351 15 123 4567", "351 1234567", número fijo o corto (`null`), y vacío.
  - **`mensajeCuota`:** cuota sin cobrar y cuota parcial (usa el saldo); fecha `dd/mm`.
  - **Pantalla:**
    - los botones se muestran según haya teléfono y si se puede armar el link;
    - el `href` de Llamar y de WhatsApp;
    - Cobrar de 44 px abre el cobro.
  - **Regresión:** los tests actuales de Cuotas verdes.

## Fuera de alcance
- Mandar recordatorios automáticos o masivos.
- Editar el teléfono desde la cuota.
- Números de otros países.
- Mensajes distintos para cuotas vencidas y por vencer: es un solo texto.

## Riesgos / notas
- **Detectar el "15" no es 100 % seguro:** los códigos de área argentinos tienen 2, 3 o 4 dígitos, y la regla de "que queden 10 dígitos" cubre los casos comunes. Si algún número no cierra, no se ofrece WhatsApp, pero se puede llamar igual, así nunca se arma un link equivocado.
- **El teléfono es texto libre** (decisión de E2-02/E2-03), así que puede venir con cualquier formato. Por eso se normaliza en el momento y no se cambia lo guardado.

## Decisiones tomadas
- Botones **Llamar** (`tel:`) y **WhatsApp** (`https://wa.me/549<número sin 0 ni 15>`), con el texto "Hola <comprador>, te escribo por la cuota <n> de <total> de $ X que vence el dd/mm". Sin teléfono, no se muestran.
- **Cobrar** más grande: `Boton` primario de 44 px.
- Sin cambios de base ni RPC.

## Dudas abiertas
- Ninguna.
