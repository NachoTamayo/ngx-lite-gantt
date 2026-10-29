import { GanttTask } from '../src/public-api';

/** Crea una fecha local de octubre de 2026; fija los datos para que las capturas sean reproducibles. */
const d = (day: number, hours = 0, month = 9) => new Date(2026, month, day, hours);

/** Instante usado como "hoy" en todas las historias. */
export const DEMO_TODAY = d(14, 12);
/** Primer día visible de las historias. */
export const DEMO_START = d(5);
/** Último día visible de las historias. */
export const DEMO_END = d(30);

/**
 * Plan de ejemplo de un proyecto genérico: cubre los cuatro tipos de barra (finalizada,
 * en curso con avance real, en curso con porcentaje y retrasada), operaciones, dependencias,
 * eventos con icono y color, avisos y tareas críticas.
 */
export const DEMO_TASKS: GanttTask[] = [
  {
    id: 'T1', code: 'T-01', name: 'Análisis de requisitos', type: 'task', status: 'finished', team: 'Producto',
    planned: { start: d(5, 8), end: d(8, 18) },
    actual: { start: d(5, 8), end: d(8, 12) },
    progress: 100,
  },
  {
    id: 'T1-O1', code: 'OP-01', name: 'Entrevistas con usuarios', type: 'operation', status: 'finished',
    planned: { start: d(5, 8), end: d(6, 18) },
    actual: { start: d(5, 9), end: d(6, 14) },
    actualDurationHours: 13.5,
  },
  {
    id: 'T2', code: 'T-02', name: 'Diseño de la arquitectura', type: 'task', status: 'running', team: 'Arquitectura',
    planned: { start: d(9, 8), end: d(15, 18) },
    actual: { start: d(9, 8), end: d(14, 12) },
    forecast: { start: d(9, 8), end: d(16, 18) },
    progress: 70,
    dependsOn: ['T1'],
    events: [
      { id: 'E1', date: d(12), label: 'Revisión de diseño aprobada', color: '#2e7d32' },
    ],
  },
  {
    id: 'T3', code: 'T-03', name: 'Desarrollo del módulo de facturación', type: 'task', status: 'running',
    team: 'Equipo A', critical: true,
    planned: { start: d(13, 8), end: d(22, 18) },
    progress: 25,
    dependsOn: ['T2'],
  },
  {
    id: 'T3-O1', code: 'OP-02', name: 'Integración con pasarela de pago', type: 'operation', status: 'notStarted',
    planned: { start: d(16, 8), end: d(20, 18) },
    events: [
      { id: 'E2', date: d(17), label: 'Credenciales de sandbox pendientes' },
    ],
  },
  {
    id: 'T4', code: 'T-04', name: 'Pruebas de aceptación', type: 'task', status: 'notStarted', team: 'QA',
    warning: true,
    planned: { start: d(21, 8), end: d(26, 18) },
    forecast: { start: d(23, 8), end: d(28, 18) },
    note: 'Entorno no disponible',
    dependsOn: ['T3'],
  },
  {
    id: 'T5', code: 'T-05', name: 'Despliegue en producción', type: 'task', status: 'notStarted', team: 'Operaciones',
    planned: { start: d(27, 8), end: d(28, 18) },
    dependsOn: ['T4'],
    events: [
      { id: 'E3', date: d(28), label: 'Ventana de mantenimiento', color: '#6a1b9a' },
    ],
  },
];
