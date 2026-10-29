# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [SemVer](https://semver.org/lang/es/).

## [0.1.0] - 2026-10-29

### Añadido

- Componente standalone `LiteGanttComponent` (`<lite-gantt>`) con tareas, operaciones, barras planificada,
  real, prevista y de avance, desviación en días laborables, dependencias, eventos, línea de hoy,
  escala diaria/compacta y selección de filas.
- Método `focusEvent()` para enfocar marcadores desde paneles externos.
- Textos configurables (`DEFAULT_GANTT_LABELS` en español y `GANTT_LABELS_EN`).
- Tema basado en propiedades CSS `--lgantt-*`, sin dependencias de Bootstrap ni de librerías de iconos.
- Historias y documentación MDX para Storybook.
