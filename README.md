# ngx-lite-gantt

Diagrama de Gantt **ligero, standalone y sin dependencias de UI** para Angular (17 o superior).

- Tareas y operaciones (filas secundarias) con barras planificada, real, prevista y de avance.
- Desviación del fin previsto en **días laborables**, con días no laborables configurables.
- Dependencias entre tareas dibujadas como flechas SVG.
- Eventos puntuales (hitos, incidencias…) como marcadores circulares con icono y color.
- Escala diaria o compacta, cabecera de semanas ISO, línea de "hoy" y botón "Ir a hoy".
- Selección de filas con enlace bidireccional, navegación por teclado y nombres accesibles.
- Textos traducibles (español por defecto, inglés incluido) y tema 100 % personalizable con variables CSS.
- Sin Bootstrap, sin librerías de iconos y sin servicios: solo `@angular/core` y `@angular/common`.

## Índice

1. [Instalación](#instalación)
2. [Uso básico](#uso-básico)
3. [Modelo de datos](#modelo-de-datos)
4. [Entradas y salidas](#entradas-y-salidas)
5. [Métodos públicos](#métodos-públicos)
6. [Reglas de representación](#reglas-de-representación)
7. [Textos e idioma](#textos-e-idioma)
8. [Personalizar el estilo](#personalizar-el-estilo)
9. [Barra de herramientas](#barra-de-herramientas)
10. [Accesibilidad](#accesibilidad)
11. [Storybook](#storybook)
12. [Desarrollo](#desarrollo)
13. [Limitaciones conocidas](#limitaciones-conocidas)

## Instalación

El repositorio es privado y no se publica en npm. Hay dos formas de usarlo:

**A. Copiar el código fuente** (la más sencilla). Copia `src/lib/` en tu proyecto, por ejemplo en
`src/app/shared/components/lite-gantt/`, e importa desde `src/public-api.ts` o directamente desde los ficheros.

**B. Compilarlo como paquete Angular** con `ng-packagr`:

```bash
git clone https://github.com/NachoTamayo/ngx-lite-gantt.git
cd ngx-lite-gantt
npm install
npm run build              # genera dist/ngx-lite-gantt
cd dist/ngx-lite-gantt && npm pack   # genera ngx-lite-gantt-<versión>.tgz
```

Después instala el `.tgz` en tu aplicación: `npm install ../ruta/ngx-lite-gantt-0.1.0.tgz`.

**Requisitos:** Angular ≥ 17 (usa el control de flujo `@if`/`@for`). Funciona con y sin Zone.js.

## Uso básico

```ts
import { Component } from '@angular/core';
import { GanttTask, LiteGanttComponent } from 'ngx-lite-gantt';

@Component({
  selector: 'app-plan',
  standalone: true,
  imports: [LiteGanttComponent],
  template: `
    <lite-gantt
      [tasks]="tasks"
      [start]="start"
      [end]="end"
      [nonWorkingWeekdays]="[0, 6]"
      [(selectedId)]="selected"
      (taskClick)="openTask($event)" />
  `,
})
export class PlanComponent {
  start = new Date(2026, 9, 5);
  end = new Date(2026, 9, 30);
  selected: string | null = null;

  tasks: GanttTask[] = [
    {
      id: 'T1', name: 'Análisis', type: 'task', status: 'finished',
      planned: { start: new Date(2026, 9, 5, 8), end: new Date(2026, 9, 8, 18) },
      actual: { start: new Date(2026, 9, 5, 8), end: new Date(2026, 9, 8, 12) },
    },
    {
      id: 'T2', name: 'Diseño', type: 'task', status: 'running', progress: 40,
      planned: { start: new Date(2026, 9, 9, 8), end: new Date(2026, 9, 15, 18) },
      dependsOn: ['T1'],
    },
  ];

  openTask(task: GanttTask): void {
    console.log('Tarea activada', task.id);
  }
}
```

> El componente usa `ChangeDetectionStrategy.OnPush`: para que se recalcule, **sustituye** los arrays
> u objetos de entrada (`this.tasks = [...this.tasks, nueva]`) en lugar de mutarlos.

## Modelo de datos

### `GanttTask`

| Propiedad | Tipo | Obligatoria | Descripción |
|---|---|:---:|---|
| `id` | `string` | ✔ | Identificador único. Es la clave de `dependsOn`, `selectedId` y `focusEvent()`. |
| `code` | `string` | | Código visible. Si se omite se muestra `id`. |
| `name` | `string` | ✔ | Descripción mostrada bajo el código. |
| `type` | `'task' \| 'operation'` | ✔ | Las operaciones se muestran sangradas, con fondo alterno y barras más finas. |
| `status` | `'finished' \| 'running' \| 'notStarted'` | ✔ | Estado; determina la barra principal y la etiqueta. |
| `team` | `string` | | Responsable, añadido a la descripción (`Nombre · Equipo`). |
| `planned` | `GanttRange` | ✔ | Plan de referencia (línea discontinua superior). |
| `actual` | `GanttRange` | | Ejecución real. |
| `actualDurationHours` | `number` | | Horas reales; se muestran en el tooltip. |
| `forecast` | `GanttRange` | | Previsión actual; si acaba después del plan se calcula la desviación. |
| `progress` | `number` (0–100) | | Porcentaje de avance; solo se pinta en filas `task`. |
| `critical` | `boolean` | | Añade la etiqueta "Crítica". |
| `warning` | `boolean` | | Muestra un icono de aviso junto al código. |
| `note` | `string` | | Texto añadido tras la desviación (`+2 d · nota`). |
| `dependsOn` | `string[]` | | `id` de las predecesoras. Se ignoran las que no están visibles. |
| `events` | `GanttEvent[]` | | Marcadores puntuales sobre la fila. |

`GanttRange` es `{ start: Date; end: Date }`. Las horas cuentan: una barra de `08:00` a `18:00` ocupa 10/24 del día.

### `GanttEvent`

| Propiedad | Tipo | Obligatoria | Descripción |
|---|---|:---:|---|
| `id` | `string` | ✔ | Identificador; se emite en `eventClick` y se usa en `focusEvent()`. |
| `date` | `Date` | ✔ | Día del evento; el marcador se centra en ese día. |
| `label` | `string` | ✔ | Texto del tooltip, precedido de la fecha `dd/mm`. |
| `color` | `string` | | Cualquier color CSS. Por defecto `--lgantt-event`. |
| `icon` | `string` | | URL de una imagen de 14 px. |
| `iconClass` | `string` | | Clases de un icono de fuente, por ejemplo `bi bi-flag` o `fa-solid fa-flag`. La fuente de iconos la aporta la aplicación. |

## Entradas y salidas

### Entradas

| Entrada | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `tasks` | `GanttTask[]` | `[]` | Filas en el orden de presentación. |
| `start` | `Date` | — (**obligatoria**) | Primer día visible (se toma su medianoche local). |
| `end` | `Date` | — (**obligatoria**) | Último día visible, incluido. |
| `today` | `Date` | `new Date()` | Instante de la línea de hoy. Fíjalo para tests y capturas reproducibles. |
| `nonWorkingWeekdays` | `number[]` | `[0]` | Días no laborables (domingo = 0 … sábado = 6). Se sombrean y no cuentan en la desviación. |
| `zoom` | `'day' \| 'compact'` | `'day'` | Escala: 80 px/día con nombre del día, o 44 px/día con número. Admite `[(zoom)]`. |
| `showOperations` | `boolean` | `true` | Con `false` se ocultan las filas `operation`. |
| `locale` | `string` | `'es-ES'` | Locale de `Intl` para días, meses, horas y números. |
| `labels` | `GanttLabelsInput` | `{}` | Sobrescritura parcial de textos (ver [Textos e idioma](#textos-e-idioma)). |
| `maxHeight` | `number \| null` | `640` | Alto máximo del área con scroll, en px. Con `null` ocupa el alto del contenedor. |
| `selectedId` | `string \| null` | `null` | Fila seleccionada. Admite `[(selectedId)]`. |

### Salidas

| Salida | Valor | Cuándo se emite |
|---|---|---|
| `zoomChange` | `GanttZoom` | El usuario cambia la escala desde la barra de herramientas. |
| `selectedIdChange` | `string \| null` | Cambia la fila seleccionada (clic o Enter/Espacio en la fila, la barra o un evento). |
| `taskClick` | `GanttTask` | Se activa la barra principal de una fila (clic, Enter o Espacio). |
| `eventClick` | `GanttEventClick` (`{ task, event }`) | Se activa un marcador de evento. No dispara `taskClick`. |

## Métodos públicos

Accesibles con `@ViewChild(LiteGanttComponent)` o con una variable de plantilla (`#gantt`).

| Método | Descripción |
|---|---|
| `scrollToToday(): void` | Centra horizontalmente la línea de hoy si está dentro del rango. |
| `focusEvent(eventId: string, taskId?: string): boolean` | Desplaza el área hasta el marcador, lo enfoca (muestra su tooltip) y lo resalta. Devuelve `false` si el evento no está dibujado (no existe, cae fuera del rango o su operación está oculta). Pasa `taskId` si el mismo `eventId` se repite en varias tareas. |
| `setZoom(zoom: GanttZoom): void` | Cambia la escala y emite `zoomChange`. |

```html
<button (click)="gantt.focusEvent('E1')">Ver hito</button>
<lite-gantt #gantt [tasks]="tasks" [start]="start" [end]="end" />
```

## Reglas de representación

**Barra principal según el estado:**

| `status` | Intervalo dibujado | Aspecto |
|---|---|---|
| `finished` | `actual` (o `planned`) | Sólida, color `--lgantt-finished`. |
| `running` | `forecast` → `actual` → `planned` (el primero que exista) | Suave (`--lgantt-running-soft`) con la parte real (`actual`) en `--lgantt-running` superpuesta. |
| `notStarted` con `forecast` retrasada | `forecast` | Discontinua en tonos de retraso (`--lgantt-delay-*`). |
| `notStarted` sin retraso | `forecast` o `planned` | Neutra (`--lgantt-idle`). |

**Avance:** en filas `task` con `progress`, se muestra la etiqueta `NN %`. Si no hay `actual` y la tarea
no ha terminado, la barra se rellena proporcionalmente con `--lgantt-running`.

**Desviación:** si `forecast.end` es posterior a `planned.end`, se muestra `+N d` a la derecha de la barra,
contando solo días laborables y redondeando a medios días.

**Dependencias:** flecha desde el final de la barra principal de la predecesora hasta el inicio de la sucesora.

**Eventos:** solo se dibujan los que caen dentro de los días visibles.

## Textos e idioma

Los textos predeterminados están en español (`DEFAULT_GANTT_LABELS`). Para otro idioma, pasa un objeto
parcial en `labels` y ajusta `locale`; los grupos anidados (`toolbar`, `status`, `legend`) también admiten claves sueltas.

```html
<!-- Inglés completo -->
<lite-gantt [labels]="GANTT_LABELS_EN" locale="en-GB" ... />

<!-- Solo algunos textos -->
<lite-gantt [labels]="{ task: 'Actividad', status: { running: 'En ejecución' } }" ... />
```

Con ngx-translate u otro sistema de i18n, construye el objeto `labels` con las traducciones y sustitúyelo
cuando cambie el idioma.

| Clave | Uso |
|---|---|
| `task` | Cabecera de la columna fija. |
| `today` | Tooltip del día de hoy en la cabecera (`Hoy 12:00`). |
| `critical` | Etiqueta de tareas críticas. |
| `planned`, `forecast`, `actual`, `deviation`, `actualDuration` | Líneas del tooltip de la barra. |
| `progress` | Reservada para el texto de avance. |
| `week` | Abreviatura de semana (`Sem 41 · 5 oct`). |
| `warning` | Nombre accesible del icono de aviso. |
| `region` | Nombre accesible del área con scroll. |
| `toolbar.zoom`, `toolbar.day`, `toolbar.compact`, `toolbar.goToToday` | Barra de herramientas. |
| `status.finished`, `status.running`, `status.notStarted` | Etiquetas de estado y tooltip. |
| `legend.*` | Leyenda inferior. |

Las fechas de los tooltips usan siempre el formato `dd/mm HH:mm`.

## Personalizar el estilo

Todo el aspecto se controla con **propiedades CSS personalizadas** `--lgantt-*`. Puedes declararlas en
`:root`, en cualquier contenedor o en el propio `<lite-gantt>`; no hace falta `::ng-deep` ni desactivar la encapsulación.

```scss
// styles.scss: integrar con el tema de la aplicación
lite-gantt {
  --lgantt-font: inherit;
  --lgantt-running: var(--brand-primary);
  --lgantt-today: var(--brand-danger);
}

// Con Bootstrap 5.3, reutilizando sus variables:
lite-gantt {
  --lgantt-fg: var(--bs-body-color);
  --lgantt-muted: var(--bs-secondary-color);
  --lgantt-surface: var(--bs-body-bg);
  --lgantt-alt: var(--bs-tertiary-bg);
  --lgantt-line: var(--bs-border-color);
  --lgantt-finished: var(--bs-success);
  --lgantt-running: var(--bs-primary);
  --lgantt-today: var(--bs-danger);
}
```

### Variables disponibles

| Variable | Por defecto | Uso |
|---|---|---|
| `--lgantt-font` | `system-ui, …` | Familia tipográfica. |
| `--lgantt-font-size` | `14px` | Tamaño base. |
| `--lgantt-radius` | `4px` | Radio del contenedor y los botones. |
| `--lgantt-bar-radius` | `3px` | Radio de las barras. |
| `--lgantt-color-scheme` | `normal` | `color-scheme` del componente (usa `dark` en temas oscuros para las barras de scroll). |
| `--lgantt-fg` | `#1f2933` | Texto principal. |
| `--lgantt-muted` | `#616e7c` | Texto secundario, días y leyenda. |
| `--lgantt-subtle` | `= muted` | Descripción de la fila. |
| `--lgantt-surface` | `#ffffff` | Fondo. |
| `--lgantt-alt` | `#f7f9fb` | Fondo de la celda de operaciones. |
| `--lgantt-head` | `#f1f4f8` | Fondo de la cabecera y hover de botones. |
| `--lgantt-line` | `#d9e0e8` | Bordes. |
| `--lgantt-week-line` | `= line` | Separador de semanas. |
| `--lgantt-row-line` | `= line` | Separador de filas. |
| `--lgantt-nonwork` | `#f2f4f7` | Sombreado de días no laborables. |
| `--lgantt-nonwork-fg` | `= muted` | Texto de días no laborables. |
| `--lgantt-on-accent` | `#ffffff` | Texto sobre colores sólidos (barras, botón activo, día de hoy). |
| `--lgantt-finished` | `#2e7d32` | Barra y etiqueta finalizadas. |
| `--lgantt-running` | `#1565c0` | Avance real, etiqueta en curso y botón activo. |
| `--lgantt-running-soft` | `#cfe3fa` | Fondo de la barra en curso. |
| `--lgantt-idle` | `#e3e8ee` | Barra sin comenzar. |
| `--lgantt-plan` | `#7b8794` | Línea discontinua del plan. |
| `--lgantt-delay-bg` | `#fff4e5` | Fondo de la previsión retrasada. |
| `--lgantt-delay-border` | `#e08a00` | Borde de la previsión retrasada e icono de aviso. |
| `--lgantt-delay-fg` | `#8a4b00` | Texto de la previsión retrasada. |
| `--lgantt-alert` | `= delay-fg` | Texto de la desviación `+N d`. |
| `--lgantt-today` | `#d32f2f` | Línea y día de hoy. |
| `--lgantt-event` | `= today` | Color por defecto de los eventos. |
| `--lgantt-dependency` | `#52606d` | Flechas de dependencia. |
| `--lgantt-critical-bg` / `--lgantt-critical-fg` | `#fdecea` / `#b71c1c` | Etiqueta "Crítica". |
| `--lgantt-tag-finished-bg` / `-fg` | tinte de `finished` | Etiqueta "Finalizado". |
| `--lgantt-tag-running-bg` / `-fg` | tinte de `running` | Etiqueta "En curso". |
| `--lgantt-tag-not-started-bg` / `-fg` | `transparent` / `= muted` | Etiqueta "Sin comenzar". |
| `--lgantt-tooltip-bg` / `--lgantt-tooltip-fg` | `#1f2933` / `#ffffff` | Tooltip. |
| `--lgantt-selected-bg` | `#e8f0fe` | Fondo de la fila seleccionada. |
| `--lgantt-selected-border` | `= running` | Borde izquierdo de la fila seleccionada. |
| `--lgantt-focus` | `= running` | Anillo de foco de botones y área. |

Las medidas geométricas (52 px por fila, 276 px de columna fija, 80/44 px por día) son fijas porque las
dependencias se calculan en TypeScript; están exportadas como `GANTT_ROW_HEIGHT`, `GANTT_LEFT_WIDTH` y `ZOOM_DAY_WIDTH`.

### Tema oscuro

Ejemplo completo en la historia *TemaOscuro* (`stories/lite-gantt.stories.ts`). Basta con redefinir las variables:

```scss
@media (prefers-color-scheme: dark) {
  lite-gantt {
    --lgantt-color-scheme: dark;
    --lgantt-fg: #e2e8f0;
    --lgantt-muted: #94a3b8;
    --lgantt-surface: #111827;
    --lgantt-head: #1e293b;
    --lgantt-line: #334155;
    /* … */
  }
}
```

## Barra de herramientas

Proyecta tus propios controles en la barra con el atributo `ganttToolbar`:

```html
<lite-gantt [tasks]="tasks" [start]="start" [end]="end">
  <button ganttToolbar type="button" (click)="exportar()">Exportar</button>
  <label ganttToolbar><input type="checkbox" [(ngModel)]="verOps" /> Operaciones</label>
</lite-gantt>
```

## Accesibilidad

- El área con scroll es una región enfocable con nombre (`labels.region`).
- Cada celda de fila es un botón con `aria-pressed` que se selecciona con Enter o Espacio.
- Las barras y los marcadores son enfocables y tienen nombre accesible con todo el contenido del tooltip.
- Los tooltips se muestran también al recibir el foco de teclado.
- Los botones de escala exponen `aria-pressed`, y la animación de `focusEvent()` respeta `prefers-reduced-motion`.

## Storybook

`stories/` contiene las historias listas para un Storybook 9–10 con `@storybook/angular`:

| Fichero | Contenido |
|---|---|
| `lite-gantt.stories.ts` | Historias *PorDefecto*, *Compacto*, *SoloTareas*, *ConSeleccion*, *EnIngles*, *SinTareas*, *TemaOscuro*, *AccionesEnBarra* y *EnfocarEvento*, con controles y acciones para todas las entradas y salidas. |
| `lite-gantt.mdx` | Página de documentación (introducción, uso, tema y API). |
| `demo-data.ts` | Datos de ejemplo con fechas fijas (capturas reproducibles). |
| `focus-event-demo.component.ts` | Componente de demostración de `focusEvent()`. |

Para integrarlas en el Storybook de otro proyecto:

1. Copia `src/lib/` y `stories/` al proyecto (o instala el paquete).
2. Ajusta los imports `'../src/public-api'` a la ruta o al paquete real.
3. Asegúrate de que `.storybook/main.ts` incluye la ruta en `stories` (por ejemplo `../src/**/*.stories.ts` y `../src/**/*.mdx`).
4. Cambia `title: 'Components/Gantt'` si tu catálogo usa otra jerarquía.

## Desarrollo

```bash
npm install
npm test            # Jest + jest-preset-angular
npm run typecheck   # tipos de la librería y los tests
npm run build       # paquete Angular en dist/ngx-lite-gantt
```

Estructura:

```
src/
  public-api.ts                 API pública
  lib/
    gantt.model.ts              Tipos, textos ES/EN
    gantt-layout.ts             Cálculo puro de días, semanas, barras, eventos y dependencias
    lite-gantt.component.*      Componente (plantilla, estilos, lógica)
    *.spec.ts                   Tests
stories/                        Storybook
```

`gantt-layout.ts` no depende de Angular: puedes reutilizar sus funciones (`buildRows`, `workingDaysBetween`,
`isoWeek`…) en otros contextos, como informes o exportaciones.

## Limitaciones conocidas

- Pensado para planes de días o semanas: no hay escala por horas ni por meses.
- Sin virtualización: con cientos de filas conviene paginar o filtrar.
- Las fechas del tooltip usan siempre `dd/mm HH:mm`, sea cual sea el `locale`.
- No permite arrastrar barras para editar fechas: es un componente de visualización.

## Licencia

[MIT](LICENSE) © 2026 Nacho Tamayo
