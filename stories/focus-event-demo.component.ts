import { Component, Input } from '@angular/core';
import { GanttEvent, GanttTask, LiteGanttComponent } from '../src/public-api';

/**
 * Demostración de `focusEvent()`: un panel externo lista los eventos de las tareas
 * y, al pulsar uno, el diagrama se desplaza hasta su marcador y lo enfoca.
 */
@Component({
  selector: 'lite-gantt-focus-event-demo',
  standalone: true,
  imports: [LiteGanttComponent],
  template: `
    <div style="display: grid; grid-template-columns: 220px 1fr; gap: 16px; font-family: system-ui, sans-serif">
      <ul style="margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; align-content: start">
        @for (item of events; track item.event.id) {
          <li>
            <button type="button" style="width: 100%; text-align: left; padding: 8px; cursor: pointer"
                    (click)="gantt.focusEvent(item.event.id, item.task.id)">
              <strong>{{ item.task.code ?? item.task.id }}</strong><br />{{ item.event.label }}
            </button>
          </li>
        }
      </ul>
      <lite-gantt #gantt [tasks]="tasks" [start]="start" [end]="end" [today]="today" [maxHeight]="360" />
    </div>
  `,
})
export class FocusEventDemoComponent {
  /** Tareas que se dibujan y cuyos eventos se listan en el panel. */
  @Input() tasks: GanttTask[] = [];
  /** Primer día visible. */
  @Input() start!: Date;
  /** Último día visible. */
  @Input() end!: Date;
  /** Instante de la línea de hoy. */
  @Input() today = new Date();

  /** Eventos de todas las tareas, junto con la tarea propietaria. */
  get events(): { task: GanttTask; event: GanttEvent }[] {
    return this.tasks.flatMap((task) => (task.events ?? []).map((event) => ({ task, event })));
  }
}
