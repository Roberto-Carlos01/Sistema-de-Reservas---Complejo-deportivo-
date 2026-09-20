/**
 * ============================================================================
 * ITERACIÓN 5: EVENTOS Y SERVICIOS SOCIALES
 * Archivo de tipos para Eventos, Servicios, Inscripciones
 * ============================================================================
 */

export interface Evento {
  id_evento: number;
  nombre_evento: string;
  descripcion: string | null;
  fecha_evento: string;
  hora_inicio: string;
  hora_fin: string;
  cupo_maximo: number | null;
  tipo_evento: string | null;
  motivo_cancelacion: string | null;
  fecha_cancelacion: string | null;
  estado: 'programado' | 'en_curso' | 'finalizado' | 'cancelado' | string;
  id_administrador: number;
  fecha_creacion: string;
}

export interface Servicio {
  id_servicio: number;
  nombre: string;
  tipo_servicio: string | null;
  precio_referencia: number | null;
  estado: string;
}
