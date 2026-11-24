# UX-04b · Inicio nuevo y "Me olvidé el PIN" con confirmación

*Refinada con `/story`. Sale de dividir UX-04. Fuente: `AUDITORIA-UX.md` §2.1 (10 botones iguales, sin datos, "Dispositivo vinculado correctamente" fijo, desvincular sin confirmación) y §3 (en el teclado PIN, "Me olvidé" aparece dos veces y desvincula sin confirmación).*

*Reusa:*
- *de UX-04a: la barra inferior, "Más" (donde quedan los demás accesos) y la navegación con historial;*
- *de UX-03: `Dialogo`, `Boton`, `Cargando` y `ErrorReintentar`;*
- *las lecturas que ya existen: `v_dinero_disponible`, cuotas vencidas de `v_cuotas` (E2-04) y el total de `v_gastos_sin_asignar` (E2-06), que ya usan Balances y los botones del inicio actual.*

*Requiere: UX-04a.*

## Historia
Como socio, quiero que el Inicio me muestre la plata disponible y lo que necesita atención, y me deje cargar lo diario de un toque, para usar la app en segundos sin buscar entre diez botones iguales.

## Criterios de aceptación
- [ ] **Plata y avisos arriba.** Dado que abro la app y entro, cuando veo el **Inicio**, entonces arriba hay una tarjeta con **Dinero disponible** en número grande (en rojo si es negativo). Tocarla lleva a **Balances**. Debajo aparecen **chips de aviso**, solo si hay algo:
  - "**3 cuotas vencidas**", que lleva a Cuotas por cobrar;
  - "**$ 410.000 sin asignar**", que lleva a Pendientes de asignar.

  Mientras carga se ve "Cargando…" (no "$ 0"). Si falla, se ve "No se pudo cargar · Reintentar". Ya **no** aparece "Dispositivo vinculado correctamente".
- [ ] **Las 4 acciones diarias.** Dado el Inicio, debajo de la tarjeta veo una **grilla de 2×2** con botones grandes: **Comprar**, **Vender**, **Gasto** e **Ingreso**, que abren su pantalla de siempre. Los demás accesos (Movimientos, Mover plata, Balances, Cuotas, Pendientes, Cuentas, Cambiar PIN, Desvincular) ya **no** están en el Inicio: están en la barra (Vehículos, Movimientos) o en **Más**. La barra inferior sigue visible.
- [ ] **"Me olvidé el PIN" pide confirmación.** Dado la pantalla de PIN, cuando miro el teclado, entonces hay **un solo** "Me olvidé el PIN". Al tocarlo se abre un **diálogo** ("Vas a tener que volver a vincular el dispositivo con el email y la contraseña"). Solo desvincula si confirmo; si toco Volver o el fondo, sigo en la pantalla de PIN, sin cambios en el contador de intentos ni en el bloqueo.

## Plan
- **Datos del Inicio, con lecturas que ya existen** (sin migración):
  - dinero disponible (`v_dinero_disponible`);
  - cantidad de cuotas vencidas (`v_cuotas` con estado `vencida`);
  - total pendiente sin asignar (`v_gastos_sin_asignar`).

  Se piden juntas al entrar al Inicio y al volver a él. Si una falla, se muestra `ErrorReintentar` en la tarjeta. Si fallan solo los avisos, se omiten esos chips y la plata se ve igual.
- **Pantalla de Inicio nueva:**
  - **Tarjeta:** el saldo con `formatMoney` y rojo si es negativo, tocable hacia Balances.
  - **Chips:** con el color de aviso (ámbar o rojo para vencidas) y navegación con el `ir()` de UX-04a.
  - **Grilla 2×2:** botones grandes con ícono y texto, color de marca.
  - **Se sacan del Inicio** el saludo fijo de vinculación, los botones secundarios y "Desvincular". Queda "Hola, <nombre>" chico en la tarjeta.
- **Teclado PIN:** se deja **un solo** "Me olvidé el PIN", fuera de la grilla de números, y la grilla queda solo con dígitos y borrar. Al tocarlo se abre `Dialogo` con `Boton` peligro "Desvincular" y "Volver". Usa el mismo desvincular que "Más".
- **Tests:**
  - **Tarjeta:** saldo, saldo negativo en rojo, tocar lleva a Balances, "Cargando…" y error con Reintentar.
  - **Chips:** visibles solo con datos, cada uno navega a su pantalla, y falla de avisos sin romper la tarjeta.
  - **Grilla:** las 4 acciones abren su pantalla; el inicio ya no tiene los botones viejos ni el texto de vinculación.
  - **PIN:** un solo "Me olvidé"; con el diálogo, Volver no desvincula y Confirmar sí.
  - **Regresión:** los tests que entraban a Movimientos, Balances, etc. desde el inicio pasan a entrar por la barra o por Más.

## Fuera de alcance
- Accesos secundarios o atajos configurables en el Inicio.
- Más avisos (ej. autos con muchos días en stock, cuentas en negativo): no están decididos.
- Gráficos en el Inicio.
- Orden de formularios y "Cargar otro" (UX-05).

## Riesgos / notas
- **Tres lecturas al abrir el Inicio:** con señal floja tarda un poco más que hoy, que no pide nada. La tarjeta muestra "Cargando…" y los chips aparecen cuando llegan, sin bloquear la grilla de acciones, que se puede usar enseguida.
- **Socios acostumbrados a los 10 botones:** cambia dónde está cada cosa. Conviene avisarles: "lo que no ves en el Inicio está en **Más**".

## Decisiones tomadas
- Inicio con una tarjeta de Dinero disponible (toca → Balances) y chips de aviso (cuotas vencidas, pendientes con monto) que llevan a su pantalla.
- Grilla 2×2 con Comprar, Vender, Gasto e Ingreso.
- Se saca el texto "Dispositivo vinculado correctamente".
- "Me olvidé el PIN" y Desvincular piden confirmación con `Dialogo`; en el teclado PIN queda un solo "Me olvidé".

## Dudas abiertas
- Ninguna.
