import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DEFAULT_GANTT_LABELS, GANTT_LABELS_EN, GanttTask } from './gantt.model';
import { LiteGanttComponent } from './lite-gantt.component';
import { GANTT_HEADER_HEIGHT, GANTT_LEFT_WIDTH, GANTT_ROW_HEIGHT, ZOOM_DAY_WIDTH } from './gantt-layout';

/** Comprueba el recalculo del Gantt sin renderizar ni acceder a servicios externos. */
describe('LiteGanttComponent: recalculo de escala', () => {
  it('actualiza las dimensiones y emite el zoom sin modificar el intervalo visible', () => {
    const component = new LiteGanttComponent();
    component.start = new Date(2026, 9, 1);
    component.end = new Date(2026, 9, 3);
    component.today = new Date(2026, 9, 2);
    const emit = jest.spyOn(component.zoomChange, 'emit');

    component.ngOnChanges();
    expect(component.days).toHaveLength(3);
    expect(component.timelineWidth).toBe(3 * ZOOM_DAY_WIDTH.day);

    component.setZoom('compact');
    expect(component.zoom).toBe('compact');
    expect(component.days).toHaveLength(3);
    expect(component.dayWidth).toBe(ZOOM_DAY_WIDTH.compact);
    expect(component.timelineWidth).toBe(3 * ZOOM_DAY_WIDTH.compact);
    expect(component.todayLeft).toBe(ZOOM_DAY_WIDTH.compact);
    expect(emit).toHaveBeenCalledWith('compact');

    component.setZoom('compact');
    expect(emit).toHaveBeenCalledTimes(1);
  });
});

/** Comprueba la activación de marcadores de evento sin propagarla a la barra de la tarea. */
describe('LiteGanttComponent: eventos', () => {
  it('emite el evento y su tarea sin emitir taskClick', () => {
    const component = new LiteGanttComponent();
    component.start = new Date(2026, 9, 1);
    component.end = new Date(2026, 9, 3);
    component.tasks = [{
      id: 'T-1', name: 'Tarea', type: 'task', status: 'running',
      planned: { start: new Date(2026, 9, 1), end: new Date(2026, 9, 3) },
      events: [{ id: 'E-1', date: new Date(2026, 9, 2), label: 'Cambio de pieza' }],
    }];
    component.ngOnChanges();
    const row = component.rows[0];
    const eventClick = jest.spyOn(component.eventClick, 'emit');
    const taskClick = jest.spyOn(component.taskClick, 'emit');
    const domEvent = new Event('click');
    const stop = jest.spyOn(domEvent, 'stopPropagation');

    component.onActivateEvent(row, row.events[0], domEvent);

    expect(eventClick).toHaveBeenCalledWith({ task: row.task, event: row.task.events![0] });
    expect(taskClick).not.toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
  });

  it('muestra el tooltip de un marcador como una sola línea', () => {
    const component = new LiteGanttComponent();
    const target = document.createElement('button');
    const domEvent = { currentTarget: target } as unknown as MouseEvent;
    component.showTooltip({ event: { id: 'E-1', date: new Date(), label: 'x' }, center: 0, tooltip: '02/10 · x' }, domEvent);
    expect(component.tooltip?.lines).toEqual(['02/10 · x']);
  });
});

/** Comprueba el enfoque programático de marcadores desde paneles externos al diagrama. */
describe('LiteGanttComponent: focusEvent', () => {
  function crear(): { component: LiteGanttComponent; scroller: HTMLElement } {
    const component = new LiteGanttComponent();
    component.start = new Date(2026, 9, 1);
    component.end = new Date(2026, 9, 10);
    const planned = { start: new Date(2026, 9, 1), end: new Date(2026, 9, 10) };
    component.tasks = [
      { id: 'T-1', name: 'Tarea 1', type: 'task', status: 'running', planned },
      { id: 'T-2', name: 'Tarea 2', type: 'task', status: 'running', planned,
        events: [{ id: 'E-1', date: new Date(2026, 9, 5), label: 'Hallazgo' }] },
      { id: 'T-3', name: 'Tarea 3', type: 'task', status: 'running', planned,
        events: [{ id: 'E-fuera', date: new Date(2026, 10, 20), label: 'Fuera de rango' }] },
    ];
    component.ngOnChanges();
    const scroller = document.createElement('div');
    for (const row of component.rows) {
      for (const marker of row.events) {
        const button = document.createElement('button');
        button.className = 'lgantt__event';
        button.dataset['eventId'] = marker.event.id;
        button.dataset['taskId'] = row.task.id;
        scroller.appendChild(button);
      }
    }
    document.body.appendChild(scroller);
    component.scroller = new ElementRef(scroller);
    return { component, scroller };
  }

  afterEach(() => document.body.replaceChildren());

  it('desplaza hasta la fila, enfoca el marcador y lo resalta hasta perder el foco', () => {
    const { component, scroller } = crear();
    const button = scroller.querySelector<HTMLElement>('[data-event-id="E-1"]')!;

    expect(component.focusEvent('E-1')).toBe(true);

    expect(document.activeElement).toBe(button);
    expect(button.classList).toContain('lgantt__event--focused');
    // jsdom no tiene layout (clientWidth/clientHeight = 0), así que el viewport útil es negativo.
    expect(scroller.scrollLeft).toBe(component.rows[1].events[0].center + GANTT_LEFT_WIDTH / 2);
    expect(scroller.scrollTop).toBe(GANTT_ROW_HEIGHT * 1.5 + GANTT_HEADER_HEIGHT / 2);

    button.blur();
    expect(button.classList).not.toContain('lgantt__event--focused');
  });

  it('devuelve false si el evento no existe, está fuera de rango o pertenece a otra tarea', () => {
    const { component } = crear();
    expect(component.focusEvent('E-x')).toBe(false);
    expect(component.focusEvent('E-fuera')).toBe(false);
    expect(component.focusEvent('E-1', 'T-1')).toBe(false);
    expect(component.focusEvent('E-1', 'T-2')).toBe(true);
  });
});

/** Comprueba la selección de filas por clic en la fila, la barra o un marcador. */
describe('LiteGanttComponent: selección de filas', () => {
  function crear(): LiteGanttComponent {
    const component = new LiteGanttComponent();
    component.start = new Date(2026, 9, 1);
    component.end = new Date(2026, 9, 3);
    component.tasks = ['T-1', 'T-2'].map((id) => ({
      id, name: id, type: 'task' as const, status: 'running' as const,
      planned: { start: new Date(2026, 9, 1), end: new Date(2026, 9, 3) },
      events: [{ id: `E-${id}`, date: new Date(2026, 9, 2), label: 'Evento' }],
    }));
    component.ngOnChanges();
    return component;
  }

  it('selecciona la fila y emite su id solo cuando cambia', () => {
    const component = crear();
    const emit = jest.spyOn(component.selectedIdChange, 'emit');

    component.select(component.rows[1]);
    component.select(component.rows[1]);

    expect(component.selectedId).toBe('T-2');
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('T-2');
  });

  it('selecciona la fila con Enter o Espacio sobre la celda', () => {
    const component = crear();
    const domEvent = new Event('keydown');
    const prevent = jest.spyOn(domEvent, 'preventDefault');

    component.onSelectKey(component.rows[0], domEvent);

    expect(component.selectedId).toBe('T-1');
    expect(prevent).toHaveBeenCalled();
  });

  it('selecciona la fila al activar su barra o un marcador', () => {
    const component = crear();
    const taskClick = jest.spyOn(component.taskClick, 'emit');

    component.onActivate(component.rows[0], new Event('click'));
    expect(component.selectedId).toBe('T-1');
    expect(taskClick).toHaveBeenCalledWith(component.rows[0].task);

    const row = component.rows[1];
    component.onActivateEvent(row, row.events[0], new Event('click'));
    expect(component.selectedId).toBe('T-2');
  });
});

/** Comprueba la combinación de textos parciales con los predeterminados. */
describe('LiteGanttComponent: textos', () => {
  it('combina sobrescrituras parciales de grupos anidados y aplica la abreviatura de semana', () => {
    const component = new LiteGanttComponent();
    component.start = new Date(2026, 9, 5);
    component.end = new Date(2026, 9, 6);
    component.labels = { week: 'Wk', toolbar: { goToToday: 'Today' }, status: { running: 'Doing' } };
    component.ngOnChanges();

    expect(component.l.toolbar).toEqual({ ...DEFAULT_GANTT_LABELS.toolbar, goToToday: 'Today' });
    expect(component.l.status.running).toBe('Doing');
    expect(component.l.status.finished).toBe(DEFAULT_GANTT_LABELS.status.finished);
    expect(component.weeks[0].label).toBe('Wk 41 · 5 oct');
  });
});

/** Renderiza el componente para comprobar la plantilla sin estilos ni librerías externas. */
describe('LiteGanttComponent: renderizado', () => {
  const planned = { start: new Date(2026, 9, 5), end: new Date(2026, 9, 8) };

  async function renderizar(tasks: GanttTask[]) {
    await TestBed.configureTestingModule({ imports: [LiteGanttComponent] }).compileComponents();
    const fixture = TestBed.createComponent(LiteGanttComponent);
    fixture.componentRef.setInput('start', new Date(2026, 9, 5));
    fixture.componentRef.setInput('end', new Date(2026, 9, 11));
    fixture.componentRef.setInput('today', new Date(2026, 9, 6, 12));
    fixture.componentRef.setInput('labels', GANTT_LABELS_EN);
    fixture.componentRef.setInput('locale', 'en-GB');
    fixture.componentRef.setInput('tasks', tasks);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('dibuja filas, etiquetas de estado, dependencias, eventos y la línea de hoy', async () => {
    const { element } = await renderizar([
      { id: 'A', name: 'Alpha', type: 'task', status: 'finished', planned, critical: true },
      { id: 'B', name: 'Beta', type: 'operation', status: 'running', planned, dependsOn: ['A'], warning: true,
        events: [{ id: 'E', date: new Date(2026, 9, 7), label: 'Milestone', iconClass: 'icon icon-flag' }] },
    ]);

    expect(element.querySelectorAll('.lgantt__row:not(.lgantt__row--head)')).toHaveLength(2);
    expect(element.querySelector('.lgantt__tag--finished')?.textContent?.trim()).toBe('Finished');
    expect(element.querySelector('.lgantt__tag--critical')?.textContent?.trim()).toBe('Critical');
    expect(element.querySelectorAll('.lgantt__deps path')).toHaveLength(1);
    expect(element.querySelector('.lgantt__icon--warn')?.getAttribute('aria-label')).toBe('Warning');
    expect(element.querySelector('.lgantt__event-icon')?.className).toContain('icon-flag');
    expect(element.querySelector('.lgantt__today')).not.toBeNull();
    expect(element.querySelector('[role="region"]')?.getAttribute('aria-label')).toBe('Gantt chart');
    expect(element.querySelector('.lgantt__toolbar')?.textContent).toContain('Go to today');
  });

  it('marca la escala activa en la barra de herramientas', async () => {
    const { fixture, element } = await renderizar([]);
    const [day, compact] = Array.from(element.querySelectorAll<HTMLButtonElement>('.lgantt__btn-group .lgantt__btn'));

    expect(day.getAttribute('aria-pressed')).toBe('true');
    compact.click();
    fixture.detectChanges();

    expect(compact.classList).toContain('lgantt__btn--active');
    expect(day.getAttribute('aria-pressed')).toBe('false');
  });
});
