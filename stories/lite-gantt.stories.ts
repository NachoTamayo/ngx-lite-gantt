import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { GANTT_LABELS_EN, LiteGanttComponent } from '../src/public-api';
import { DEMO_END, DEMO_START, DEMO_TASKS, DEMO_TODAY } from './demo-data';
import { FocusEventDemoComponent } from './focus-event-demo.component';

/**
 * Los controles de fecha de Storybook devuelven marcas de tiempo numéricas;
 * `render` las convierte en `Date` antes de pasarlas al componente.
 */
type GanttStoryArgs = Omit<LiteGanttComponent, 'start' | 'end' | 'today'> & {
  start: Date | number;
  end: Date | number;
  today: Date | number;
};

const meta: Meta<GanttStoryArgs> = {
  title: 'Components/Gantt',
  component: LiteGanttComponent,
  tags: ['autodocs'],
  render: (args) => ({
    props: {
      ...args,
      start: new Date(args.start),
      end: new Date(args.end),
      today: new Date(args.today),
    },
  }),
  argTypes: {
    tasks: { control: 'object', description: 'Tareas y operaciones en el orden de presentación.' },
    start: { control: 'date', description: 'Primer día visible.' },
    end: { control: 'date', description: 'Último día visible (incluido).' },
    today: { control: 'date', description: 'Instante de la línea de hoy.' },
    zoom: { control: 'inline-radio', options: ['day', 'compact'] },
    showOperations: { control: 'boolean' },
    locale: { control: 'text' },
    nonWorkingWeekdays: { control: 'object', description: 'Domingo = 0 … sábado = 6.' },
    maxHeight: { control: 'number' },
    selectedId: { control: 'text' },
    labels: { control: 'object' },
    zoomChange: { action: 'zoomChange' },
    selectedIdChange: { action: 'selectedIdChange' },
    taskClick: { action: 'taskClick' },
    eventClick: { action: 'eventClick' },
  },
  args: {
    tasks: DEMO_TASKS,
    start: DEMO_START,
    end: DEMO_END,
    today: DEMO_TODAY,
    zoom: 'day',
    showOperations: true,
    locale: 'es-ES',
    nonWorkingWeekdays: [0, 6],
    maxHeight: 640,
    selectedId: null,
    labels: {},
  },
};

export default meta;

type Story = StoryObj<GanttStoryArgs>;

/** Plan completo con tareas, operaciones, dependencias, eventos, avisos y desviaciones. */
export const PorDefecto: Story = {};

/** Escala compacta (44 px por día), útil para planes largos. */
export const Compacto: Story = {
  args: { zoom: 'compact' },
};

/** Solo las tareas principales: las operaciones se ocultan con `showOperations = false`. */
export const SoloTareas: Story = {
  args: { showOperations: false },
};

/** Fila preseleccionada mediante `selectedId`. */
export const ConSeleccion: Story = {
  args: { selectedId: 'T3' },
};

/** Textos en inglés con `GANTT_LABELS_EN` y locale `en-GB`. */
export const EnIngles: Story = {
  args: { labels: GANTT_LABELS_EN, locale: 'en-GB' },
};

/** Sin tareas: se muestran la escala, la línea de hoy y la leyenda. */
export const SinTareas: Story = {
  args: { tasks: [] },
};

/** Tema oscuro definido solo con variables CSS `--lgantt-*` en un contenedor. */
export const TemaOscuro: Story = {
  render: (args) => ({
    props: { ...args, start: new Date(args.start), end: new Date(args.end), today: new Date(args.today) },
    styles: [`
      .dark {
        padding: 16px;
        background: #0f172a;
        --lgantt-color-scheme: dark;
        --lgantt-fg: #e2e8f0;
        --lgantt-muted: #94a3b8;
        --lgantt-surface: #111827;
        --lgantt-alt: #1a2332;
        --lgantt-head: #1e293b;
        --lgantt-line: #334155;
        --lgantt-nonwork: #0b1220;
        --lgantt-finished: #22c55e;
        --lgantt-running: #38bdf8;
        --lgantt-running-soft: #164e63;
        --lgantt-idle: #334155;
        --lgantt-plan: #94a3b8;
        --lgantt-delay-bg: #451a03;
        --lgantt-delay-border: #f59e0b;
        --lgantt-delay-fg: #fcd34d;
        --lgantt-today: #f43f5e;
        --lgantt-dependency: #94a3b8;
        --lgantt-critical-bg: #4c0519;
        --lgantt-critical-fg: #fda4af;
        --lgantt-tooltip-bg: #f8fafc;
        --lgantt-tooltip-fg: #0f172a;
        --lgantt-selected-bg: #1e3a5f;
        --lgantt-on-accent: #0f172a;
      }
    `],
    template: `
      <div class="dark">
        <lite-gantt [tasks]="tasks" [start]="start" [end]="end" [today]="today" [zoom]="zoom"
                    [showOperations]="showOperations" [locale]="locale" [nonWorkingWeekdays]="nonWorkingWeekdays"
                    [maxHeight]="maxHeight" [labels]="labels" [selectedId]="selectedId"
                    (zoomChange)="zoomChange($event)" (selectedIdChange)="selectedIdChange($event)"
                    (taskClick)="taskClick($event)" (eventClick)="eventClick($event)" />
      </div>
    `,
  }),
};

/** Botones en la barra de herramientas proyectados con el atributo `ganttToolbar`. */
export const AccionesEnBarra: Story = {
  render: (args) => ({
    props: { ...args, start: new Date(args.start), end: new Date(args.end), today: new Date(args.today) },
    template: `
      <lite-gantt [tasks]="tasks" [start]="start" [end]="end" [today]="today" [nonWorkingWeekdays]="nonWorkingWeekdays">
        <button ganttToolbar type="button" style="margin-left: auto">Exportar</button>
      </lite-gantt>
    `,
  }),
};

/** Panel externo que enfoca los marcadores de evento con `focusEvent()`. */
export const EnfocarEvento: Story = {
  decorators: [moduleMetadata({ imports: [FocusEventDemoComponent] })],
  render: (args) => ({
    props: { ...args, start: new Date(args.start), end: new Date(args.end), today: new Date(args.today) },
    template: `<lite-gantt-focus-event-demo [tasks]="tasks" [start]="start" [end]="end" [today]="today" />`,
  }),
};
