/** Estados admitidos para una tarea u operación. */
export type GanttStatus = 'finished' | 'running' | 'notStarted';

/** Escala horizontal del diagrama: diaria (80 px por día) o compacta (44 px por día). */
export type GanttZoom = 'day' | 'compact';

/** Intervalo temporal de una barra, con fechas inclusivas según la escala del diagrama. */
export interface GanttRange {
  start: Date;
  end: Date;
}

/** Tarea u operación que se representa como una fila del diagrama. */
export interface GanttTask {
  /** Identificador único; es la clave de las dependencias (`dependsOn`) y de la selección. */
  id: string;
  /** Código visible opcional, independiente de la identidad única de las dependencias. */
  code?: string;
  /** Nombre mostrado junto al identificador. */
  name: string;
  /** Las operaciones se muestran como filas secundarias, sangradas y con barras más finas. */
  type: 'task' | 'operation';
  status: GanttStatus;
  /** Equipo responsable, mostrado a continuación del nombre. */
  team?: string;
  /** Intervalo de planificación de referencia, dibujado como línea discontinua. */
  planned: GanttRange;
  /** Intervalo real de ejecución. */
  actual?: GanttRange;
  /** Horas declaradas para la ejecución real, mostradas en el tooltip de la barra. */
  actualDurationHours?: number;
  /** Intervalo de previsión actual. */
  forecast?: GanttRange;
  /** Avance entre 0 y 100; rellena la barra proporcionalmente si no hay intervalo real. */
  progress?: number;
  /** Indica si la tarea debe marcarse como crítica. */
  critical?: boolean;
  /** Indica si debe mostrarse un aviso junto al identificador. */
  warning?: boolean;
  /** Nota opcional mostrada junto a la desviación. */
  note?: string;
  /** Identificadores de tareas predecesoras para dibujar dependencias. */
  dependsOn?: string[];
  /** Eventos puntuales dibujados como marcadores circulares sobre la línea temporal de la fila. */
  events?: GanttEvent[];
}

/** Evento puntual de una tarea, por ejemplo un hito, un cambio de pieza o un hallazgo técnico. */
export interface GanttEvent {
  id: string;
  /** Día del evento; el marcador se centra en ese día. */
  date: Date;
  /** Texto del tooltip y del nombre accesible, precedido por la fecha `dd/mm`. */
  label: string;
  /** Color de fondo del círculo (cualquier valor CSS); por defecto, `--lgantt-event`. */
  color?: string;
  /** Ruta de una imagen de 14 px mostrada dentro del círculo. */
  icon?: string;
  /**
   * Clases CSS de un icono de fuente, alternativa a `icon`; por ejemplo `bi bi-flag`
   * (Bootstrap Icons) o `fa-solid fa-flag` (Font Awesome). La librería de iconos la aporta la aplicación.
   */
  iconClass?: string;
}

/** Textos configurables de cabeceras, estados, barra de herramientas, leyenda y tooltips. */
export interface GanttLabels {
  task: string;
  today: string;
  critical: string;
  planned: string;
  forecast: string;
  actual: string;
  deviation: string;
  progress: string;
  /** Prefijo de la duración real en el tooltip. */
  actualDuration: string;
  /** Abreviatura de semana en la cabecera, por ejemplo `Sem 41 · 5 oct`. */
  week: string;
  /** Nombre accesible del icono de aviso. */
  warning: string;
  /** Nombre accesible del área desplazable. */
  region: string;
  toolbar: {
    /** Nombre accesible del grupo de botones de escala. */
    zoom: string;
    day: string;
    compact: string;
    goToToday: string;
  };
  status: Record<GanttStatus, string>;
  legend: {
    planned: string;
    finished: string;
    running: string;
    delayed: string;
    dependency: string;
  };
}

/** Textos predeterminados en español. */
export const DEFAULT_GANTT_LABELS: GanttLabels = {
  task: 'Tarea / operación',
  today: 'Hoy',
  critical: 'Crítica',
  planned: 'Planificado',
  forecast: 'Previsto',
  actual: 'Real',
  deviation: 'Desviación',
  progress: 'Avance',
  actualDuration: 'Duración real',
  week: 'Sem',
  warning: 'Aviso',
  region: 'Diagrama de Gantt',
  toolbar: {
    zoom: 'Escala',
    day: 'Día',
    compact: 'Compacto',
    goToToday: 'Ir a hoy',
  },
  status: {
    finished: 'Finalizado',
    running: 'En curso',
    notStarted: 'Sin comenzar',
  },
  legend: {
    planned: 'Planificado',
    finished: 'Finalizado',
    running: 'En curso',
    delayed: 'Previsión con retraso',
    dependency: 'Dependencia',
  },
};

/** Textos en inglés, listos para usar con `[labels]` y un `locale` como `en-GB`. */
export const GANTT_LABELS_EN: GanttLabels = {
  task: 'Task / operation',
  today: 'Today',
  critical: 'Critical',
  planned: 'Planned',
  forecast: 'Forecast',
  actual: 'Actual',
  deviation: 'Deviation',
  progress: 'Progress',
  actualDuration: 'Actual duration',
  week: 'Wk',
  warning: 'Warning',
  region: 'Gantt chart',
  toolbar: {
    zoom: 'Scale',
    day: 'Day',
    compact: 'Compact',
    goToToday: 'Go to today',
  },
  status: {
    finished: 'Finished',
    running: 'In progress',
    notStarted: 'Not started',
  },
  legend: {
    planned: 'Planned',
    finished: 'Finished',
    running: 'In progress',
    delayed: 'Delayed forecast',
    dependency: 'Dependency',
  },
};

/** Sobrescritura parcial de textos; los grupos anidados también admiten claves sueltas. */
export type GanttLabelsInput = Partial<Omit<GanttLabels, 'toolbar' | 'status' | 'legend'>> & {
  toolbar?: Partial<GanttLabels['toolbar']>;
  status?: Partial<GanttLabels['status']>;
  legend?: Partial<GanttLabels['legend']>;
};

/** Posición y ancho de una barra, expresados en píxeles. */
export interface GanttBarView {
  left: number;
  width: number;
}

/** Día visible y sus etiquetas de presentación. */
export interface GanttDayView {
  date: Date;
  label: string;
  /** Etiqueta numérica usada en la escala compacta. */
  shortLabel: string;
  nonWorking: boolean;
  /** Indica que el día abre una semana ISO (lunes). */
  weekStart: boolean;
  /** Indica que el día contiene el instante marcado como hoy. */
  today: boolean;
}

/** Tramo de la cabecera superior que agrupa los días visibles de una semana ISO. */
export interface GanttWeekView {
  /** Texto de la semana, por ejemplo `Sem 41 · 5 oct`. */
  label: string;
  /** Número de días visibles de la semana. */
  days: number;
}

/** Datos calculados que necesita la plantilla para representar una fila. */
export interface GanttRowView {
  task: GanttTask;
  planned: GanttBarView;
  main: GanttBarView;
  mainKind: 'finished' | 'running' | 'delayed' | 'idle';
  progress?: GanttBarView;
  progressLabel?: string;
  deviation: string;
  tooltip: string[];
  /** Marcadores de los eventos que caen dentro del rango visible. */
  events: GanttEventView[];
}

/** Valor emitido al activar un marcador de evento. */
export interface GanttEventClick {
  task: GanttTask;
  event: GanttEvent;
}

/** Posición y texto calculados de un marcador de evento. */
export interface GanttEventView {
  event: GanttEvent;
  /** Centro horizontal del marcador, en píxeles desde el inicio de la línea temporal. */
  center: number;
  tooltip: string;
}

/** Geometría de una flecha de dependencia entre dos filas. */
export interface GanttDependencyView {
  from: string;
  to: string;
  path: string;
  arrow: string;
}
