/**
 * ============================================================================
 * ARCHIVO: cancha.api.ts
 * CAPA: Capa de Servicios de Canchas (Frontend)
 * ============================================================================
 */

import api from '../../services/api';
import type { Cancha, CanchaFormData } from './cancha.types';

// Datos de demostración locales en caso de que el backend o docker aún no esté iniciado
export const DEMO_CANCHAS: Cancha[] = [
  {
    id_cancha: 1,
    nombre: 'Cancha Central de Fútbol 11',
    disciplina: 'futbol',
    capacidad: 22,
    precio_hora: 120.0,
    estado: 'disponible',
    ubicacion: 'Sector A - Principal',
    largo: 105.0,
    ancho: 68.0,
    hora_apertura: '07:00:00',
    hora_cierre: '23:00:00',
  },
  {
    id_cancha: 2,
    nombre: 'Cancha de Pádel Pro 1',
    disciplina: 'padel',
    capacidad: 4,
    precio_hora: 80.0,
    estado: 'disponible',
    ubicacion: 'Bloque B - Cristales',
    largo: 20.0,
    ancho: 10.0,
    hora_apertura: '06:00:00',
    hora_cierre: '23:30:00',
  },
  {
    id_cancha: 3,
    nombre: 'Coliseo de Básquetbol',
    disciplina: 'basquet',
    capacidad: 10,
    precio_hora: 70.0,
    estado: 'disponible',
    ubicacion: 'Pabellón Cubierto 2',
    largo: 28.0,
    ancho: 15.0,
    hora_apertura: '08:00:00',
    hora_cierre: '22:00:00',
  },
  {
    id_cancha: 4,
    nombre: 'Cancha de Futsal Sintético',
    disciplina: 'futsal',
    capacidad: 10,
    precio_hora: 65.0,
    estado: 'mantenimiento',
    ubicacion: 'Sector C - Lateral',
    largo: 40.0,
    ancho: 20.0,
    hora_apertura: '07:30:00',
    hora_cierre: '22:30:00',
  },
  {
    id_cancha: 5,
    nombre: 'Cancha de Tenis Polvo de Ladrillo',
    disciplina: 'tenis',
    capacidad: 4,
    precio_hora: 90.0,
    estado: 'disponible',
    ubicacion: 'Sector Tenis 1',
    largo: 23.77,
    ancho: 10.97,
    hora_apertura: '07:00:00',
    hora_cierre: '21:00:00',
  },
  {
    id_cancha: 6,
    nombre: 'Cancha de Voleibol Arena',
    disciplina: 'voley',
    capacidad: 12,
    precio_hora: 50.0,
    estado: 'disponible',
    ubicacion: 'Sector Playa',
    largo: 18.0,
    ancho: 9.0,
    hora_apertura: '08:00:00',
    hora_cierre: '20:00:00',
  },
];

export const canchaApi = {
  async getAll(disciplina?: string): Promise<{ data: Cancha[]; isLive: boolean }> {
    try {
      const endpoint = disciplina && disciplina !== 'todas'
        ? `/canchas?disciplina=${encodeURIComponent(disciplina)}`
        : '/canchas';
      
      const res = await api.get(endpoint);
      const canchas = res.data?.data || res.data || [];
      if (Array.isArray(canchas)) {
        return { data: canchas, isLive: true };
      }
      return { data: DEMO_CANCHAS, isLive: false };
    } catch (error) {
      console.warn('⚠️ [canchaApi] Backend no disponible, usando datos de demostración locales:', error);
      let filtradas = DEMO_CANCHAS;
      if (disciplina && disciplina !== 'todas') {
        filtradas = DEMO_CANCHAS.filter(c => c.disciplina?.toLowerCase() === disciplina.toLowerCase());
      }
      return { data: filtradas, isLive: false };
    }
  },

  async getById(id: number): Promise<Cancha | null> {
    try {
      const res = await api.get(`/canchas/${id}`);
      return res.data?.data || res.data || null;
    } catch (error) {
      console.error(`Error al obtener cancha #${id}:`, error);
      const demo = DEMO_CANCHAS.find(c => c.id_cancha === id);
      return demo || null;
    }
  },

  async create(data: CanchaFormData): Promise<Cancha> {
    if (data.imagen instanceof File) {
      const formData = new FormData();
      formData.append('nombre', data.nombre);
      if (data.disciplina) formData.append('disciplina', data.disciplina);
      if (data.capacidad !== '' && data.capacidad !== null && data.capacidad !== undefined) {
        formData.append('capacidad', String(data.capacidad));
      }
      formData.append('precio_hora', String(data.precio_hora));
      formData.append('estado', data.estado || 'disponible');
      if (data.ubicacion) formData.append('ubicacion', data.ubicacion);
      if (data.largo !== '' && data.largo !== null && data.largo !== undefined) {
        formData.append('largo', String(data.largo));
      }
      if (data.ancho !== '' && data.ancho !== null && data.ancho !== undefined) {
        formData.append('ancho', String(data.ancho));
      }
      if (data.hora_apertura) formData.append('hora_apertura', data.hora_apertura);
      if (data.hora_cierre) formData.append('hora_cierre', data.hora_cierre);
      formData.append('imagen', data.imagen);

      const res = await api.post('/canchas', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data?.data || res.data;
    }

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

    const res = await api.post('/canchas', payload);
    return res.data?.data || res.data;
  },

  async update(id: number, data: Partial<CanchaFormData>): Promise<Cancha> {
    if (data.imagen instanceof File) {
      const formData = new FormData();
      if (data.nombre !== undefined) formData.append('nombre', data.nombre);
      if (data.disciplina !== undefined) formData.append('disciplina', data.disciplina || '');
      if (data.capacidad !== undefined) formData.append('capacidad', data.capacidad ? String(data.capacidad) : '');
      if (data.precio_hora !== undefined) formData.append('precio_hora', String(data.precio_hora));
      if (data.estado !== undefined) formData.append('estado', data.estado || 'disponible');
      if (data.ubicacion !== undefined) formData.append('ubicacion', data.ubicacion || '');
      if (data.largo !== undefined) formData.append('largo', data.largo ? String(data.largo) : '');
      if (data.ancho !== undefined) formData.append('ancho', data.ancho ? String(data.ancho) : '');
      if (data.hora_apertura !== undefined) formData.append('hora_apertura', data.hora_apertura || '');
      if (data.hora_cierre !== undefined) formData.append('hora_cierre', data.hora_cierre || '');
      formData.append('imagen', data.imagen);

      const res = await api.patch(`/canchas/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data?.data || res.data;
    }

    const payload: any = { ...data };
    delete payload.imagen;
    if (data.precio_hora !== undefined) payload.precio_hora = Number(data.precio_hora);
    if (data.capacidad !== undefined) payload.capacidad = data.capacidad ? Number(data.capacidad) : null;
    if (data.largo !== undefined) payload.largo = data.largo ? Number(data.largo) : null;
    if (data.ancho !== undefined) payload.ancho = data.ancho ? Number(data.ancho) : null;

    const res = await api.patch(`/canchas/${id}`, payload);
    return res.data?.data || res.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/canchas/${id}`);
  },
};

/**
 * Convierte una ruta relativa de imagen del backend en URL absoluta accesible
 */
export const getCanchaImageUrl = (imagen_url?: string | null): string | null => {
  if (!imagen_url) return null;
  if (imagen_url.startsWith('http://') || imagen_url.startsWith('https://')) {
    return imagen_url;
  }
  const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000/api';
  const backendBase = apiUrl.replace(/\/api\/?$/, '');
  const cleanPath = imagen_url.startsWith('/') ? imagen_url : `/${imagen_url}`;
  return `${backendBase}${cleanPath}`;
};

/**
 * Provee una imagen deportiva de alta calidad por defecto según la disciplina
 */
export const getDisciplinaDefaultImage = (disciplina: string | null): string => {
  const d = (disciplina || '').toLowerCase();
  if (d.includes('futbol') || d.includes('futsal')) {
    return 'https://images.unsplash.com/photo-1529900240041-22f1df4d1897?w=800&auto=format&fit=crop&q=80';
  }
  if (d.includes('padel')) {
    return 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop&q=80';
  }
  if (d.includes('tenis')) {
    return 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&auto=format&fit=crop&q=80';
  }
  if (d.includes('basquet')) {
    return 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80';
  }
  if (d.includes('voley')) {
    return 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&auto=format&fit=crop&q=80';
  }
  if (d.includes('atletismo')) {
    return 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80';
};

