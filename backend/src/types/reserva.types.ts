/**
 * ============================================================================
 * ITERACIÓN 3: GESTIÓN DE RESERVAS
 * Archivo de tipos e interfaces para Reservas y Utilidades asociadas
 * ============================================================================
 */

export interface Reserva {
  id_reserva: number;
  fecha_solicitud: string;
  estado: 'pendiente' | 'confirmada' | 'cancelada' | string;
  fecha_reserva: string;
  canal_reserva: 'en_linea' | 'presencial' | string;
  hora_inicio: string;
  hora_fin: string;
  id_cliente: number;
  id_cancha: number;
  id_empleado?: number | null;
  fecha_gestion?: string | null;
  observaciones?: string | null;
}

export interface CreateReservaDTO {
  id_cliente: number;
  id_cancha: number;
  fecha_reserva: string;
  hora_inicio: string;
  hora_fin: string;
  canal_reserva?: string;
  observaciones?: string;
  utilidades?: number[];
}
