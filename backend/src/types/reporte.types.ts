/**
 * ============================================================================
 * ITERACIÓN 6: ELABORACIÓN DE REPORTES Y NOTIFICACIONES
 * Archivo de tipos para Estadísticas, Resúmenes de Ocupación e Ingresos
 * ============================================================================
 */

export interface ReporteOcupacion {
  id_cancha: number;
  nombre_cancha: string;
  total_reservas: number;
  horas_ocupadas: number;
  porcentaje_ocupacion: number;
}

export interface ReporteFinanciero {
  periodo: string;
  total_ingresos: number;
  metodo_predominante: string;
  total_transacciones: number;
}
