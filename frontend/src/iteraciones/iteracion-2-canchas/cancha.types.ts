/**
 * ============================================================================
 * INTERFAZ Y TIPOS DE CANCHA (FRONTEND)
 * ============================================================================
 */

export interface Cancha {
  id_cancha: number;
  nombre: string;
  disciplina: string | null;
  capacidad: number | null;
  precio_hora: number;
  estado: 'disponible' | 'mantenimiento' | 'ocupada' | string;
  ubicacion: string | null;
  largo: number | null;
  ancho: number | null;
  hora_apertura: string | null;
  hora_cierre: string | null;
}

export interface CanchaFormData {
  nombre: string;
  disciplina: string;
  capacidad: number | '';
  precio_hora: number | '';
  estado: string;
  ubicacion: string;
  largo: number | '';
  ancho: number | '';
  hora_apertura: string;
  hora_cierre: string;
}
