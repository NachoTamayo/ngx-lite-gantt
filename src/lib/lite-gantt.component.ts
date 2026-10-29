import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  ViewChild,
} from '@angular/core';
import { NgClass } from '@angular/common';
import {
  DEFAULT_GANTT_LABELS,
  GanttDayView,
  GanttDependencyView,
  GanttEventClick,
  GanttEventView,
  GanttLabels,
  GanttLabelsInput,
  GanttRowView,
  GanttTask,
  GanttWeekView,
  GanttZoom,
} from './gantt.model';
import {
  GANTT_HEADER_HEIGHT,
  GANTT_LEFT_WIDTH,
  GANTT_ROW_HEIGHT,
  ZOOM_DAY_WIDTH,
  buildDays,
  buildDependencies,
  buildRows,
  buildWeeks,
  dayOffset,
  startOfDay,
} from './gantt-layout';

interface TooltipState {
  lines: string[];
  x: number;
  y: number;
}

/**
 * Diagrama de Gantt standalone para representar tareas, operaciones, eventos y dependencias.
 *
 * No depende de ninguna librería de UI: los colores, la tipografía y los radios se
 * personalizan con propiedades CSS `--lgantt-*` y los textos con la entrada `labels`.
 */
@Component({
  selector: 'lite-gantt',
  standalone: true,
  imports: [NgClass],
  templateUrl: './lite-gantt.component.html',
  styleUrls: ['./lite-gantt.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiteGanttComponent implements OnChanges {
  /** Tareas y operaciones en el orden de presentación. */
  @Input() tasks: GanttTask[] = [];
  /** Primer día visible, interpretado a medianoche local. Obligatorio. */
  @Input() start!: Date;
  /** Último día visible, incluido en la escala. Obligatorio. */
  @Input() end!: Date;
  /** Instante usado para posicionar y etiquetar la línea de hoy. */
  @Input() today: Date = new Date();
  /** Días de la semana no laborables, donde el domingo es 0. */
  @Input() nonWorkingWeekdays: number[] = [0];
  /** Escala horizontal; puede enlazarse mediante `[(zoom)]`. */
  @Input() zoom: GanttZoom = 'day';
  /** Indica si se muestran también las filas de operaciones. */
  @Input() showOperations = true;
  /** Locale para nombres de días y meses y formato de números. */
  @Input() locale = 'es-ES';
  /** Sobrescrituras parciales de los textos del diagrama; ver `DEFAULT_GANTT_LABELS`. */
  @Input() labels: GanttLabelsInput = {};
  /**
   * Altura máxima del área desplazable, en píxeles. Con `null` no se limita y el área
   * ocupa el alto que el contenedor asigne al componente.
   */
  @Input() maxHeight: number | null = 640;
  /** Identificador de la fila seleccionada (`GanttTask.id`); puede enlazarse mediante `[(selectedId)]`. */
  @Input() selectedId: string | null = null;

  /** Emite la escala elegida desde la barra de herramientas del componente. */
  @Output() zoomChange = new EventEmitter<GanttZoom>();
  /** Emite el identificador de la fila seleccionada con clic, Enter o Espacio. */
  @Output() selectedIdChange = new EventEmitter<string | null>();
  /** Emite la tarea cuya barra se activa con clic, Enter o Espacio. */
  @Output() taskClick = new EventEmitter<GanttTask>();
  /** Emite el evento activado con clic, Enter o Espacio, junto con su tarea. */
  @Output() eventClick = new EventEmitter<GanttEventClick>();

  @ViewChild('scroller', { static: true }) scroller!: ElementRef<HTMLElement>;

  readonly headerHeight = GANTT_HEADER_HEIGHT;
  readonly leftWidth = GANTT_LEFT_WIDTH;
  days: GanttDayView[] = [];
  weeks: GanttWeekView[] = [];
  rows: GanttRowView[] = [];
  dependencies: GanttDependencyView[] = [];
  dayWidth = ZOOM_DAY_WIDTH.day;
  timelineWidth = 0;
  totalHeight = 0;
  todayLeft: number | null = null;
  todayLabel = '';
  /** Textos efectivos: los predeterminados combinados con `labels`. */
  l: GanttLabels = DEFAULT_GANTT_LABELS;
  tooltip: TooltipState | null = null;

  /** Recalcula las posiciones y etiquetas cuando cambian las entradas. */
  ngOnChanges(): void {
    if (!this.start || !this.end) return;
    this.l = {
      ...DEFAULT_GANTT_LABELS,
      ...this.labels,
      toolbar: { ...DEFAULT_GANTT_LABELS.toolbar, ...this.labels.toolbar },
      status: { ...DEFAULT_GANTT_LABELS.status, ...this.labels.status },
      legend: { ...DEFAULT_GANTT_LABELS.legend, ...this.labels.legend },
    };
    const origin = startOfDay(this.start);
    this.dayWidth = ZOOM_DAY_WIDTH[this.zoom];
    this.days = buildDays(this.start, this.end, this.nonWorkingWeekdays, this.locale, this.today);
    this.weeks = buildWeeks(this.days, this.locale, this.l.week);
    this.timelineWidth = this.days.length * this.dayWidth;
    const visible = this.showOperations ? this.tasks : this.tasks.filter((task) => task.type === 'task');
    this.rows = buildRows(visible, origin, this.zoom, this.l, this.locale, this.nonWorkingWeekdays, this.days.length);
    this.dependencies = buildDependencies(this.rows);
    this.totalHeight = GANTT_HEADER_HEIGHT + this.rows.length * GANTT_ROW_HEIGHT;

    const offset = dayOffset(origin, this.today);
    this.todayLeft = offset >= 0 && offset <= this.days.length ? offset * this.dayWidth : null;
    const time = new Intl.DateTimeFormat(this.locale, { hour: '2-digit', minute: '2-digit' }).format(this.today);
    this.todayLabel = `${this.l.today} ${time}`;
  }

  /** Actualiza la escala y emite el nuevo valor para el enlace bidireccional. */
  setZoom(zoom: GanttZoom): void {
    if (zoom === this.zoom) return;
    this.zoom = zoom;
    this.zoomChange.emit(zoom);
    this.ngOnChanges();
  }

  /** Desplaza el área para centrar la línea de hoy, cuando está visible. */
  scrollToToday(): void {
    if (this.todayLeft == null) return;
    const element = this.scroller.nativeElement;
    element.scrollLeft = Math.max(
      0,
      GANTT_LEFT_WIDTH + this.todayLeft - (element.clientWidth + GANTT_LEFT_WIDTH) / 2,
    );
  }

  /**
   * Desplaza el área hasta el marcador de un evento, lo centra, le da el foco (mostrando su
   * tooltip) y lo resalta hasta que lo pierde. Pensado para paneles externos que enlazan con
   * los eventos del diagrama; puede invocarse mediante `@ViewChild(LiteGanttComponent)`.
   *
   * @param eventId Identificador del evento (`GanttEvent.id`).
   * @param taskId Tarea propietaria, necesaria solo si el mismo `eventId` se repite en varias tareas.
   * @returns `false` si el evento no está dibujado: no existe, cae fuera del rango visible o
   *   pertenece a una operación oculta por `showOperations`.
   */
  focusEvent(eventId: string, taskId?: string): boolean {
    const index = this.rows.findIndex(
      (row) => (taskId == null || row.task.id === taskId) && row.events.some((marker) => marker.event.id === eventId),
    );
    if (index < 0) return false;
    const row = this.rows[index];
    const marker = row.events.find((item) => item.event.id === eventId)!;
    const scroller = this.scroller.nativeElement;
    const button = Array.from(scroller.querySelectorAll<HTMLElement>('.lgantt__event')).find(
      (element) => element.dataset['eventId'] === eventId && element.dataset['taskId'] === row.task.id,
    );
    if (!button) return false;

    scroller.scrollLeft = Math.max(0, marker.center - (scroller.clientWidth - GANTT_LEFT_WIDTH) / 2);
    const rowCenter = GANTT_HEADER_HEIGHT + index * GANTT_ROW_HEIGHT + GANTT_ROW_HEIGHT / 2;
    scroller.scrollTop = Math.max(0, rowCenter - GANTT_HEADER_HEIGHT - (scroller.clientHeight - GANTT_HEADER_HEIGHT) / 2);

    // El resaltado se aplica sobre el DOM porque el foco programático no activa `:focus-visible`
    // tras un clic y el componente es OnPush; se retira al perder el foco.
    button.classList.add('lgantt__event--focused');
    button.addEventListener('blur', () => button.classList.remove('lgantt__event--focused'), { once: true });
    button.focus({ preventScroll: true });
    return true;
  }

  /** Muestra el tooltip alineado con la barra o el marcador enfocado o bajo el puntero. */
  showTooltip(row: GanttRowView | GanttEventView, event: MouseEvent | FocusEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const lines = typeof row.tooltip === 'string' ? [row.tooltip] : row.tooltip;
    this.tooltip = { lines, x: rect.left + rect.width / 2, y: rect.top };
  }

  /** Oculta el tooltip activo. */
  hideTooltip(): void {
    this.tooltip = null;
  }

  /** Selecciona una fila y emite su identificador si cambia la selección. */
  select(row: GanttRowView): void {
    if (row.task.id === this.selectedId) return;
    this.selectedId = row.task.id;
    this.selectedIdChange.emit(row.task.id);
  }

  /** Selecciona la fila activada desde su celda con Enter o Espacio. */
  onSelectKey(row: GanttRowView, event: Event): void {
    event.preventDefault();
    this.select(row);
  }

  /** Selecciona la fila y emite la tarea de una barra activada por ratón o teclado. */
  onActivate(row: GanttRowView, event: Event): void {
    event.preventDefault();
    this.select(row);
    this.taskClick.emit(row.task);
  }

  /** Selecciona la fila y emite el evento de un marcador activado por ratón o teclado, sin activar la barra. */
  onActivateEvent(row: GanttRowView, marker: GanttEventView, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.select(row);
    this.eventClick.emit({ task: row.task, event: marker.event });
  }
}
