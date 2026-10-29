import {
  buildDays, buildDependencies, buildEvents, buildRows, buildWeeks, dayOffset, formatDeviation, isoWeek, workingDaysBetween,
} from './gantt-layout';
import { DEFAULT_GANTT_LABELS, GANTT_LABELS_EN, GanttTask } from './gantt.model';

describe('gantt-layout', () => {
  const origin = new Date(2026, 9, 5);
  const task = (id: string, overrides: Partial<GanttTask> = {}): GanttTask => ({
    id,
    name: `Tarea ${id}`,
    type: 'task',
    status: 'notStarted',
    planned: { start: new Date(2026, 9, 5), end: new Date(2026, 9, 8) },
    ...overrides,
  });

  it('calcula días fraccionarios desde el origen local', () => {
    expect(dayOffset(origin, new Date(2026, 9, 7, 12))).toBe(2.5);
  });

  it('muestra el codigo visible sin reutilizarlo como identidad de dependencias', () => {
    const rows = buildRows([task('T-1', { code: '29-10-00' })],
      origin, 'day', DEFAULT_GANTT_LABELS, 'es-ES', [0, 6]);
    expect(rows[0].task.id).toBe('T-1');
    expect(rows[0].tooltip[0]).toBe('29-10-00 · Tarea T-1');
  });

  it('genera los días visibles y marca domingos no laborables', () => {
    const days = buildDays(new Date(2026, 9, 5), new Date(2026, 9, 11), [0], 'es-ES');
    expect(days).toHaveLength(7);
    expect(days[0].label).toBe('Lun 05/10');
    expect(days.filter((day) => day.nonWorking).map((day) => day.label)).toEqual(['Dom 11/10']);
  });

  it('marca los lunes y el día de hoy', () => {
    const days = buildDays(new Date(2026, 9, 3), new Date(2026, 9, 7), [0, 6], 'es-ES', new Date(2026, 9, 6, 15, 30));
    expect(days.filter((day) => day.weekStart).map((day) => day.shortLabel)).toEqual(['05']);
    expect(days.filter((day) => day.today).map((day) => day.shortLabel)).toEqual(['06']);
    expect(buildDays(new Date(2026, 9, 3), new Date(2026, 9, 7), [0], 'es-ES').some((day) => day.today)).toBe(false);
  });

  it('agrupa los días por semana ISO con la primera semana parcial', () => {
    const days = buildDays(new Date(2026, 9, 3), new Date(2026, 9, 13), [0, 6], 'es-ES');
    expect(buildWeeks(days, 'es-ES')).toEqual([
      { label: 'Sem 40 · 3 oct', days: 2 },
      { label: 'Sem 41 · 5 oct', days: 7 },
      { label: 'Sem 42 · 12 oct', days: 2 },
    ]);
  });

  it('calcula la semana ISO en el cambio de año', () => {
    expect(isoWeek(new Date(2026, 0, 1))).toBe(1);
    expect(isoWeek(new Date(2027, 0, 1))).toBe(53);
    expect(isoWeek(new Date(2025, 11, 29))).toBe(1);
  });

  it('excluye los días no laborables del cálculo de jornadas', () => {
    expect(workingDaysBetween(new Date(2026, 9, 8), new Date(2026, 9, 12), [0])).toBe(3);
  });

  it('formatea el retraso en días laborables y devuelve vacío si no hay retraso', () => {
    const planned = { start: new Date(2026, 9, 5), end: new Date(2026, 9, 8) };
    const forecast = { start: new Date(2026, 9, 5), end: new Date(2026, 9, 12) };
    expect(formatDeviation(planned, forecast, 'es-ES', [0])).toBe('+3 d');
    expect(formatDeviation(planned, planned, 'es-ES', [0])).toBe('');
  });

  it('selecciona la barra prevista retrasada y la barra real finalizada', () => {
    const tasks = [
      task('T-01', {
        status: 'finished',
        actual: { start: new Date(2026, 9, 5), end: new Date(2026, 9, 7) },
      }),
      task('T-02', {
        forecast: { start: new Date(2026, 9, 5), end: new Date(2026, 9, 12) },
      }),
    ];
    const rows = buildRows(tasks, origin, 'day', DEFAULT_GANTT_LABELS, 'es-ES', [0]);
    expect(rows[0].mainKind).toBe('finished');
    expect(rows[1].mainKind).toBe('delayed');
    expect(rows[1].main.width).toBeGreaterThan(rows[1].planned.width);
  });

  it('incluye duracion real en el tooltip de la ejecucion', () => {
    const rows = buildRows([task('O-1', {
      type: 'operation',
      status: 'finished',
      actual: { start: new Date(2026, 9, 5, 10), end: new Date(2026, 9, 5, 11, 30) },
      actualDurationHours: 1.5,
    })], origin, 'day', DEFAULT_GANTT_LABELS, 'es-ES', [0, 6]);

    expect(rows[0].tooltip).toContain('Duración real: 1,5 h');
  });

  it.each(['day', 'compact'] as const)('rellena exactamente el porcentaje del plan en escala %s', zoom => {
    const [row] = buildRows([task('OT', { status: 'running', progress: 33.3 })],
      origin, zoom, DEFAULT_GANTT_LABELS, 'es-ES', [0, 6]);
    expect(row.progress?.left).toBe(row.main.left);
    expect(row.progress?.width).toBeCloseTo(row.main.width * 0.333);
    expect(row.progressLabel).toBe('33.3 %');
    expect(row.tooltip).toContain('En curso \u00b7 33.3 %');
    expect(row.task.actual).toBeUndefined();
  });

  it.each([0, 100])('muestra el extremo %s sin una segunda barra de avance', progress => {
    const [row] = buildRows([task('OT', { status: progress === 100 ? 'finished' : 'notStarted', progress })],
      origin, 'day', DEFAULT_GANTT_LABELS, 'es-ES', [0, 6]);
    expect(row.progress).toBeUndefined();
    expect(row.progressLabel).toBe(progress + ' %');
    expect(row.mainKind).toBe(progress === 100 ? 'finished' : 'idle');
  });

  it('conserva las barras reales y las filas sin porcentaje', () => {
    const actual = { start: new Date(2026, 9, 5), end: new Date(2026, 9, 6) };
    const [conReal, sinPorcentaje] = buildRows([
      task('T-1', { status: 'running', progress: 50, actual }), task('T-2', { status: 'running' }),
    ], origin, 'day', DEFAULT_GANTT_LABELS, 'es-ES', [0, 6]);
    expect(conReal.progress?.width).toBe(78);
    expect(sinPorcentaje.progress).toBeUndefined();
    expect(sinPorcentaje.progressLabel).toBeUndefined();
    expect(sinPorcentaje.mainKind).toBe('running');
  });

  it('omite dependencias cuyo predecesor no está entre las filas visibles', () => {
    const rows = buildRows(
      [task('T-01'), task('T-02', { dependsOn: ['T-01', 'INEXISTENTE'] })],
      origin,
      'day',
      DEFAULT_GANTT_LABELS,
      'es-ES',
      [0],
    );
    const dependencies = buildDependencies(rows);
    expect(dependencies).toHaveLength(1);
    expect(dependencies[0].from).toBe('T-01');
    expect(dependencies[0].to).toBe('T-02');
  });
  it('centra los eventos en su día y descarta los que quedan fuera del rango visible', () => {
    const evento = (id: string, date: Date) => ({ id, date, label: 'Cambio de pieza' });
    const markers = buildEvents([
      evento('antes', new Date(2026, 9, 4, 23)),
      evento('dentro', new Date(2026, 9, 7, 15)),
      evento('despues', new Date(2026, 9, 10)),
    ], origin, 80, 5);
    expect(markers.map((marker) => marker.event.id)).toEqual(['dentro']);
    expect(markers[0].center).toBe(2.5 * 80);
    expect(markers[0].tooltip).toBe('07/10 · Cambio de pieza');
  });

  it('calcula los marcadores de evento de cada fila', () => {
    const [conEventos, sinEventos] = buildRows([
      task('T-1', { events: [{ id: 'E-1', date: new Date(2026, 9, 6), label: 'Hallazgo' }] }), task('T-2'),
    ], origin, 'compact', DEFAULT_GANTT_LABELS, 'es-ES', [0], 7);
    expect(conEventos.events).toHaveLength(1);
    expect(conEventos.events[0].center).toBe(1.5 * 44);
    expect(sinEventos.events).toEqual([]);
  });
});
describe('gantt-layout: textos configurables', () => {
  it('usa los textos en inglés para la semana y la duración real', () => {
    const days = buildDays(new Date(2026, 9, 5), new Date(2026, 9, 6), [0], 'en-GB');
    expect(buildWeeks(days, 'en-GB', GANTT_LABELS_EN.week)[0].label).toBe('Wk 41 · 5 Oct');
    const [row] = buildRows([{
      id: 'O-1', name: 'Op', type: 'operation', status: 'finished', actualDurationHours: 1.5,
      planned: { start: new Date(2026, 9, 5), end: new Date(2026, 9, 6) },
    }], new Date(2026, 9, 5), 'day', GANTT_LABELS_EN, 'en-GB', [0]);
    expect(row.tooltip).toContain('Actual duration: 1.5 h');
    expect(row.tooltip[1]).toBe('Finished');
  });
});
