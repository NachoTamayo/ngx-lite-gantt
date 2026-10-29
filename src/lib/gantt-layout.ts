import {
  GanttDayView,
  GanttDependencyView,
  GanttEvent,
  GanttEventView,
  GanttLabels,
  GanttRange,
  GanttRowView,
  GanttTask,
  GanttWeekView,
  GanttZoom,
} from './gantt.model';

/** Altura de la cabecera, en píxeles; debe coincidir con las medidas del SCSS. */
export const GANTT_HEADER_HEIGHT = 52;
/** Altura de cada fila, en píxeles; debe coincidir con las medidas del SCSS. */
export const GANTT_ROW_HEIGHT = 52;
/** Ancho de la columna fija de tareas, en píxeles. */
export const GANTT_LEFT_WIDTH = 276;
/** Distancia del borde superior de la fila al centro de la barra principal. */
const BAR_CENTER_Y = 31;
/** Ancho de cada día para las escalas disponibles. */
export const ZOOM_DAY_WIDTH: Record<GanttZoom, number> = { day: 80, compact: 44 };

const MS_DAY = 86_400_000;
const pad = (value: number) => String(value).padStart(2, '0');
const ddmm = (date: Date) => `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;

/** Devuelve la medianoche local correspondiente a una fecha. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Calcula días fraccionarios usando fechas locales para evitar saltos por horario de verano. */
export function dayOffset(origin: Date, date: Date): number {
  const originUtc = Date.UTC(origin.getFullYear(), origin.getMonth(), origin.getDate());
  const dateUtc =
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) +
    ((date.getHours() * 60 + date.getMinutes()) * 60 + date.getSeconds()) * 1000;
  return (dateUtc - originUtc) / MS_DAY;
}

/**
 * Genera los días visibles y marca los no laborables, los lunes y el día de hoy.
 * @param today Instante de la línea de hoy; si se omite, ningún día se marca como hoy.
 */
export function buildDays(
  start: Date,
  end: Date,
  nonWorkingWeekdays: number[],
  locale: string,
  today?: Date,
): GanttDayView[] {
  const days: GanttDayView[] = [];
  const first = startOfDay(start);
  const last = startOfDay(end);
  const todayTime = today ? startOfDay(today).getTime() : null;
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  for (let date = new Date(first); date <= last; date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)) {
    const weekdayLabel = weekday.format(date).replace('.', '');
    days.push({
      date,
      label: `${weekdayLabel.charAt(0).toUpperCase()}${weekdayLabel.slice(1)} ${ddmm(date)}`,
      shortLabel: pad(date.getDate()),
      nonWorking: nonWorkingWeekdays.includes(date.getDay()),
      weekStart: date.getDay() === 1,
      today: date.getTime() === todayTime,
    });
  }
  return days;
}

/** Número de semana ISO 8601 de una fecha local. */
export function isoWeek(date: Date): number {
  const thursday = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  thursday.setUTCDate(thursday.getUTCDate() + 3 - ((thursday.getUTCDay() + 6) % 7));
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  return 1 + Math.round(
    ((thursday.getTime() - firstThursday.getTime()) / MS_DAY - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
  );
}

/**
 * Agrupa los días visibles por semana ISO; la primera semana puede ser parcial.
 * @param weekLabel Abreviatura que precede al número de semana.
 */
export function buildWeeks(days: GanttDayView[], locale: string, weekLabel = 'Sem'): GanttWeekView[] {
  const month = new Intl.DateTimeFormat(locale, { month: 'short' });
  const weeks: GanttWeekView[] = [];
  days.forEach((day, index) => {
    if (index === 0 || day.weekStart) {
      const label = `${weekLabel} ${isoWeek(day.date)} · ${day.date.getDate()} ${month.format(day.date).replace('.', '')}`;
      weeks.push({ label, days: 0 });
    }
    weeks[weeks.length - 1].days++;
  });
  return weeks;
}

function bar(origin: Date, range: GanttRange, dayWidth: number) {
  const left = dayOffset(origin, range.start) * dayWidth;
  const width = Math.max((dayOffset(origin, range.end) - dayOffset(origin, range.start)) * dayWidth, 6);
  return { left: left + 2, width: width - 2 };
}

/** Calcula los días laborables transcurridos entre dos instantes. */
export function workingDaysBetween(start: Date, end: Date, nonWorking: number[]): number {
  const origin = startOfDay(start);
  const from = dayOffset(origin, start);
  const to = dayOffset(origin, end);
  if (to <= from) return 0;
  let total = 0;
  for (let day = Math.floor(from); day < to; day++) {
    const date = new Date(origin.getFullYear(), origin.getMonth(), origin.getDate() + day);
    if (nonWorking.includes(date.getDay())) continue;
    total += Math.min(to, day + 1) - Math.max(from, day);
  }
  return total;
}

/** Formatea el retraso del fin previsto en días laborables y medios días. */
export function formatDeviation(
  planned: GanttRange,
  forecast: GanttRange | undefined,
  locale: string,
  nonWorking: number[],
): string {
  if (!forecast) return '';
  const delta = Math.round(workingDaysBetween(planned.end, forecast.end, nonWorking) * 2) / 2;
  if (delta <= 0) return '';
  return `+${new Intl.NumberFormat(locale).format(delta)} d`;
}

function formatDate(date: Date): string {
  return `${ddmm(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Centra cada evento en su día y descarta los que quedan fuera de los días visibles.
 * @param visibleDays Número de días visibles; si se omite, solo se descartan los anteriores al origen.
 */
export function buildEvents(
  events: GanttEvent[],
  origin: Date,
  dayWidth: number,
  visibleDays?: number,
): GanttEventView[] {
  return events
    .map((event) => ({ event, day: Math.floor(dayOffset(origin, event.date)) }))
    .filter(({ day }) => day >= 0 && (visibleDays == null || day < visibleDays))
    .map(({ event, day }) => ({
      event,
      center: (day + 0.5) * dayWidth,
      tooltip: `${ddmm(event.date)} · ${event.label}`,
    }));
}

/**
 * Calcula barras, avance, desviación, eventos y textos accesibles de las filas visibles.
 * @param visibleDays Número de días visibles, usado para descartar eventos fuera de rango.
 */
export function buildRows(
  tasks: GanttTask[],
  origin: Date,
  zoom: GanttZoom,
  labels: GanttLabels,
  locale: string,
  nonWorking: number[],
  visibleDays?: number,
): GanttRowView[] {
  const dayWidth = ZOOM_DAY_WIDTH[zoom];
  return tasks.map((task) => {
    const planned = bar(origin, task.planned, dayWidth);
    const deviation = formatDeviation(task.planned, task.forecast, locale, nonWorking);
    let main = planned;
    let mainKind: GanttRowView['mainKind'] = 'idle';
    let progress: GanttRowView['progress'];
    let progressLabel: string | undefined;

    if (task.status === 'finished') {
      main = bar(origin, task.actual ?? task.planned, dayWidth);
      mainKind = 'finished';
    } else if (task.status === 'running') {
      main = bar(origin, task.forecast ?? task.actual ?? task.planned, dayWidth);
      mainKind = 'running';
      if (task.actual) progress = bar(origin, task.actual, dayWidth);
    } else if (task.forecast) {
      main = bar(origin, task.forecast, dayWidth);
      mainKind = deviation ? 'delayed' : 'idle';
    }

    if (task.type === 'task' && task.progress != null) {
      progressLabel = `${task.progress} %`;
      // Sin fechas reales, el porcentaje rellena el plan sin inventar un intervalo de ejecucion.
      if (!task.actual && task.status !== 'finished' && task.progress > 0) {
        progress = { left: main.left, width: main.width * task.progress / 100 };
      }
    }
    const tooltip = [
      `${task.code ?? task.id} · ${task.name}`,
      `${labels.status[task.status]}${task.progress != null ? ` · ${task.progress} %` : ''}`,
      `${labels.planned}: ${formatDate(task.planned.start)} → ${formatDate(task.planned.end)}`,
    ];
    if (task.forecast) {
      tooltip.push(`${labels.forecast}: ${formatDate(task.forecast.start)} → ${formatDate(task.forecast.end)}`);
    } else if (task.actual) {
      tooltip.push(`${labels.actual}: ${formatDate(task.actual.start)} → ${formatDate(task.actual.end)}`);
    }
    if (task.actualDurationHours != null) {
      const hours = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(task.actualDurationHours);
      tooltip.push(`${labels.actualDuration}: ${hours} h`);
    }
    if (deviation) tooltip.push(`${labels.deviation}: ${deviation}${task.note ? ` · ${task.note}` : ''}`);

    const events = buildEvents(task.events ?? [], origin, dayWidth, visibleDays);
    return { task, planned, main, mainKind, progress, progressLabel, deviation, tooltip, events };
  });
}

/** Construye las rutas SVG de dependencias; ignora predecesoras no visibles. */
export function buildDependencies(rows: GanttRowView[]): GanttDependencyView[] {
  const index = new Map(rows.map((row, rowIndex) => [row.task.id, rowIndex]));
  const dependencies: GanttDependencyView[] = [];
  for (const row of rows) {
    for (const dependency of row.task.dependsOn ?? []) {
      const fromIndex = index.get(dependency);
      const toIndex = index.get(row.task.id);
      if (fromIndex == null || toIndex == null) continue;
      const fromBar = rows[fromIndex].main;
      const fromX = GANTT_LEFT_WIDTH + fromBar.left + fromBar.width;
      const toX = GANTT_LEFT_WIDTH + row.main.left;
      const fromY = GANTT_HEADER_HEIGHT + fromIndex * GANTT_ROW_HEIGHT + BAR_CENTER_Y;
      const toY = GANTT_HEADER_HEIGHT + toIndex * GANTT_ROW_HEIGHT + BAR_CENTER_Y;
      const middleX = Math.max(toX - 10, fromX + 6);
      dependencies.push({
        from: dependency,
        to: row.task.id,
        path: `M${fromX} ${fromY} H${middleX} V${toY} H${toX - 1}`,
        arrow: `${toX},${toY} ${toX - 6},${toY - 3.5} ${toX - 6},${toY + 3.5}`,
      });
    }
  }
  return dependencies;
}