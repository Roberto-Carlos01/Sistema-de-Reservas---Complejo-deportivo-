/**
 * ============================================================================
 * ITERACIÓN 4: GESTIÓN DE PAGOS
 * Archivo de tipos para Pagos, Pasarelas y Comprobantes
 * ============================================================================
 */

export interface Pago {
  id_pago: number;
  monto: number;
  metodo_pago: 'tarjeta' | 'efectivo' | 'qr' | string;
  fecha_pago: string;
  tipo_registro: 'automatico' | 'manual' | string;
  referencia_pasarela: string | null;
  nro_comprobante: string | null;
  estado: 'pagado' | 'pendiente' | 'reembolsado' | string;
  id_reserva: number;
}

export interface CreatePagoDTO {
  id_reserva: number;
  monto: number;
  metodo_pago: 'tarjeta' | 'efectivo' | 'qr';
  referencia_pasarela?: string;
  nro_comprobante?: string;
}
