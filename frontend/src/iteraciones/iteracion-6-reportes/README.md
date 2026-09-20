# 📊 Iteración 6: Reportes y Notificaciones

## Objetivo
Generar dashboards y métricas para administradores: horas de mayor demanda, canchas más rentables, ingresos por período y alertas de mantenimiento.

## Estructura sugerida
- `reporte.types.ts`: Tipos para reportes estadísticos y filtros por rango de fechas.
- `reporte.api.ts`: Endpoints `GET /api/reportes/ocupacion`, `GET /api/reportes/ingresos`.
- `DashboardMetricas.tsx`: Resumen de KPIs en tarjetas minimalistas.
- `GraficoOcupacion.tsx`: Barras o gráficas de ocupación de canchas.
