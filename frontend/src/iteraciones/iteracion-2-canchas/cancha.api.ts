/**
 * ============================================================================
 * ARCHIVO: cancha.api.ts
 * CAPA: API Service (Frontend)
 * 
 * PROPÓSITO:
 * Conecta los componentes de React con los endpoints de Express del backend:
 * - GET /api/canchas
 * - GET /api/canchas/:id
 * - POST /api/canchas
 * - PATCH /api/canchas/:id
 * - DELETE /api/canchas/:id
 * ============================================================================
 */

import { api } from '../../api/client';
import type { ApiResponse } from '../../api/client';
import type { Cancha, CanchaFormData } from './cancha.types';

// Datos de demostración locales en caso de que el backend o docker aún no esté iniciado
export const DEMO_CANCHAS: Cancha[] = [
  {
    id_cancha: 1,
    nombre: 'Cancha Central Principal',
    disciplina: 'futbol',
    capacidad: 22,
    precio_hora: 120.00,
    estado: 'disponible',
    ubicacion: 'Bloque A - Planta baja',
    largo: 90,
    ancho: 45,
    hora_apertura: '07:00',
    hora_cierre: '22:00',
  },
  {
    id_cancha: 2,
    nombre: 'Cancha Norte Techada',
    disciplina: 'basquet',
    capacidad: 10,
    precio_hora: 80.00,
    estado: 'disponible',
    ubicacion: 'Bloque B - Piso 1',
    largo: 28,
    ancho: 15,
    hora_apertura: '07:00',
    hora_cierre: '22:00',
  },
  {
    id_cancha: 3,
    nombre: 'Cancha Sur Reglamentaria',
    disciplina: 'voley',
    capacidad: 12,
    precio_hora: 70.00,
    estado: 'disponible',
    ubicacion: 'Bloque B - Piso 1',
    largo: 18,
    ancho: 9,
    hora_apertura: '07:00',
    hora_cierre: '22:00',
  },
  {
    id_cancha: 4,
    nombre: 'Cancha Este de Arcilla',
    disciplina: 'tenis',
    capacidad: 4,
    precio_hora: 60.00,
    estado: 'mantenimiento',
    ubicacion: 'Bloque C - Exterior',
    largo: 24,
    ancho: 11,
    hora_apertura: '08:00',
    hora_cierre: '20:00',
  },
  {
    id_cancha: 5,
    nombre: 'Cancha de Pádel Panorámica',
    disciplina: 'padel',
    capacidad: 4,
    precio_hora: 65.00,
    estado: 'disponible',
    ubicacion: 'Bloque C - Exterior',
    largo: 20,
    ancho: 10,
    hora_apertura: '08:00',
    hora_cierre: '22:00',
  },
  {
    id_cancha: 6,
    nombre: 'Cancha Futsal Coliseo',
    disciplina: 'futsal',
    capacidad: 14,
    precio_hora: 95.00,
    estado: 'disponible',
    ubicacion: 'Bloque A - Piso 1',
    largo: 40,
    ancho: 20,
    hora_apertura: '07:00',
    hora_cierre: '23:00',
  },
];

export const canchaApi = {
  /**
   * Obtener todas las canchas desde el backend
   */
  async getAll(disciplina?: string): Promise<{ data: Cancha[]; isLive: boolean }> {
    try {
      const endpoint = disciplina && disciplina !== 'todas'
        ? `/canchas?disciplina=${encodeURIComponent(disciplina)}`
        : '/canchas';

      const res = await api.get<ApiResponse<Cancha[]>>(endpoint);
      return {
        data: res.data || [],
        isLive: true,
      };
    } catch (error) {
      console.warn('⚠️ No se pudo conectar con el backend (usando datos demo locales):', error);
      // Fallback a demo data
      let filtered = [...DEMO_CANCHAS];
      if (disciplina && disciplina !== 'todas') {
        filtered = filtered.filter(c => c.disciplina?.toLowerCase() === disciplina.toLowerCase());
      }
      return {
        data: filtered,
        isLive: false,
      };
    }
  },

  /**
   * Crear una nueva cancha
   */
  async create(data: CanchaFormData): Promise<Cancha> {
    const payload = {
      nombre: data.nombre,
      disciplina: data.disciplina || null,
      capacidad: data.capacidad ? Number(data.capacidad) : null,
      precio_hora: Number(data.precio_hora),
      estado: data.estado || 'disponible',
      ubicacion: data.ubicacion || null,
      largo: data.largo ? Number(data.largo) : null,
      ancho: data.ancho ? Number(data.ancho) : null,
      hora_apertura: data.hora_apertura || null,
      hora_cierre: data.hora_cierre || null,
    };

    const res = await api.post<ApiResponse<Cancha>>('/canchas', payload);
    return res.data!;
  },

  /**
   * Actualizar cancha
   */
  async update(id: number, data: Partial<CanchaFormData>): Promise<Cancha> {
    const payload: any = {};
    if (data.nombre !== undefined) payload.nombre = data.nombre;
    if (data.disciplina !== undefined) payload.disciplina = data.disciplina;
    if (data.precio_hora !== undefined && data.precio_hora !== '') payload.precio_hora = Number(data.precio_hora);
    if (data.capacidad !== undefined) payload.capacidad = data.capacidad === '' ? null : Number(data.capacidad);
    if (data.estado !== undefined) payload.estado = data.estado;
    if (data.ubicacion !== undefined) payload.ubicacion = data.ubicacion;
    if (data.largo !== undefined) payload.largo = data.largo === '' ? null : Number(data.largo);
    if (data.ancho !== undefined) payload.ancho = data.ancho === '' ? null : Number(data.ancho);
    if (data.hora_apertura !== undefined) payload.hora_apertura = data.hora_apertura;
    if (data.hora_cierre !== undefined) payload.hora_cierre = data.hora_cierre;

    const res = await api.patch<ApiResponse<Cancha>>(`/canchas/${id}`, payload);
    return res.data!;
  },

  /**
   * Eliminar cancha
   */
  async delete(id: number): Promise<void> {
    await api.delete<ApiResponse>(`/canchas/${id}`);
  },
};
