# UX-07d · Ganancia por mes con gráfico

*Refinada con `/story`. Sale de dividir UX-07. Fuente: `AUDITORIA-UX.md` §3 (Ganancia mensual es una lista de texto plano; un gráfico de barras simple leería mucho mejor).*

*Se apoya en lo que ya está:*
- *`GananciaMensualView` y `GananciaDetalleMesView` (E3-01), con los datos de `v_ganancia_mensual` (una fila por mes con actividad) y la lógica de `src/lib/reportes/ganancia.ts`;*
- *`formatMoney`, `Cargando` y `ErrorReintentar`.*

*Sin cambios de base ni RPC. **Sin librerías de gráficos.** Requiere: E3-01, UX-03b.*

## Historia
Como socio, quiero ver de un vistazo cómo vienen los últimos meses en un gráfico de barras, para saber si el negocio va mejor o peor sin leer números.

## Criterios de aceptación
- [ ] **Barras de los últimos 6 meses.** Dado que abro **Ganancia por mes**, cuando miro arriba, entonces veo un gráfico con **una barra por mes de los últimos 6** (incluido el actual), en orden de izquierda a derecha, con el nombre corto del mes abajo ("jun", "jul"…). Cada barra es **verde** si la ganancia es 0 o más y **roja** si es negativa, con el **monto encima** (ej. "$ 1,2 M"). Un mes sin actividad aparece con **$ 0**, sin barra.
- [ ] **Proporción y negativos claros.** Dado meses con ganancias distintas, cuando miro el gráfico, entonces la altura de cada barra es proporcional a su monto. Las barras negativas bajan desde una línea base, y las positivas suben desde la misma línea, así se ve a simple vista qué meses fueron pérdida.
- [ ] **La lista sigue abajo.** Dado el gráfico, debajo sigue la **lista actual** de meses con su desglose y el acceso al detalle de cada mes, sin cambios. Mientras carga, el gráfico no aparece (se ve "Cargando…"), y si falla se ve "No se pudo cargar · Reintentar", como hoy.

## Plan
- **Datos para el gráfico:** una función pura en `ganancia.ts` que, a partir de las filas que ya se leen y de "hoy" en Buenos Aires, arma **los últimos 6 meses calendario** (completando con 0 los meses sin fila) con `{ mes, etiqueta, ganancia }`. No hay pedido nuevo a la base.
- **Monto corto** encima de cada barra: un formateador chico para que entre en el ancho de la barra (ej. "$ 850 mil", "$ 1,2 M", "−$ 200 mil"). El monto completo queda en la lista de abajo y en el `<title>` de la barra.
- **Gráfico en SVG propio**, un componente `GraficoGananciaMensual`:
  - `viewBox` fijo y ancho 100 %, así se adapta a 390 px;
  - escala con el máximo valor absoluto y una línea base que, si hay negativos, se ubica para que entren las barras hacia abajo;
  - barras con `rx` chico, verde (`green-600`) o roja (`red-600`);
  - etiquetas de mes abajo y montos arriba (o abajo, si es negativa);
  - `role="img"` con un `aria-label` que resume ("Ganancia de los últimos 6 meses: junio $ 1.200.000, …").
- **`GananciaMensualView`:** el gráfico arriba de la lista actual. La lista no cambia, y Cargando/Error se manejan como hoy.
- **Tests:**
  - **Función de 6 meses:** completa los faltantes con 0, ordena, y cruza de año (de diciembre a enero), con fecha simulada.
  - **Monto corto:** mil, millón, negativos y 0.
  - **Gráfico:**
    - 6 barras, con colores según el signo y alturas proporcionales (comparando atributos `height`);
    - las negativas debajo de la línea base;
    - sin barra en un mes en 0;
    - el `aria-label`.
  - **Pantalla:** el gráfico arriba y la lista abajo, igual que antes; sin gráfico mientras carga o si hay error.

## Fuera de alcance
- Elegir otro rango (12 meses, año) o comparar períodos.
- Gráficos en el detalle del mes o en Caja.
- Tocar una barra para abrir el mes (la lista de abajo ya lo hace).
- Librerías de gráficos.

## Riesgos / notas
- **Meses muy desparejos:** si un mes tiene una ganancia mucho mayor que el resto, las otras barras quedan muy bajitas. Es lo correcto con una escala lineal, y los montos encima siguen mostrando el número.
- **Los meses pasados pueden cambiar** (nota de E3-01): el gráfico siempre refleja el estado actual, igual que la lista.

## Decisiones tomadas
- Gráfico de barras simple en SVG propio, sin librerías.
- Una barra por mes, de los últimos 6, verde si la ganancia es 0 o más y roja si es negativa, con el monto encima.
- Debajo, la lista actual.
- Sin cambios de base ni RPC.

## Dudas abiertas
- Ninguna.
