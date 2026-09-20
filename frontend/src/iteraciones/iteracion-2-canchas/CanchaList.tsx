/**
 * ============================================================================
 * ARCHIVO: CanchaList.tsx
 * ITERACIÓN 2: GESTIÓN DE CANCHAS (FRONTEND)
 * 
 * PROPÓSITO:
 * Muestra el catálogo interactivo de canchas, pestañas de disciplinas,
 * barra de búsqueda, indicadores de estado de conexión con el backend
 * y gestiona las operaciones de Crear, Editar y Eliminar (CRUD).
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import type { Cancha, CanchaFormData } from './cancha.types';
import { canchaApi } from './cancha.api';
import { CanchaCard } from './CanchaCard';
import { CanchaModal } from './CanchaModal';

const DISCIPLINAS = [
  { id: 'todas', label: 'Todas las canchas', icon: '⚡' },
  { id: 'futbol', label: 'Fútbol', icon: '⚽' },
  { id: 'futsal', label: 'Futsal', icon: '🥅' },
  { id: 'basquet', label: 'Básquet', icon: '🏀' },
  { id: 'voley', label: 'Vóley', icon: '🏐' },
  { id: 'tenis', label: 'Tenis', icon: '🎾' },
  { id: 'padel', label: 'Pádel', icon: '🏸' },
  { id: 'atletismo', label: 'Pista Atletismo', icon: '🏃' },
];

export const CanchaList: React.FC = () => {
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [activeDisciplina, setActiveDisciplina] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado del Modal (Crear / Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [canchaToEdit, setCanchaToEdit] = useState<Cancha | null>(null);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Función para cargar canchas desde el backend
  const cargarCanchas = async (disciplina = activeDisciplina) => {
    setIsLoading(true);
    try {
      const res = await canchaApi.getAll(disciplina);
      setCanchas(res.data);
      setIsBackendOnline(res.isLive);
    } catch (err: any) {
      console.error('Error al cargar canchas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarCanchas(activeDisciplina);
  }, [activeDisciplina]);

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Manejador para Guardar (Crear o Actualizar)
  const handleSaveCancha = async (formData: CanchaFormData, editingId?: number) => {
    if (editingId) {
      // Actualización
      if (isBackendOnline) {
        await canchaApi.update(editingId, formData);
        showNotification('Cancha actualizada exitosamente');
        await cargarCanchas();
      } else {
        // En modo demo local
        setCanchas(prev => prev.map(c => c.id_cancha === editingId ? {
          ...c,
          ...formData,
          precio_hora: Number(formData.precio_hora),
          capacidad: formData.capacidad ? Number(formData.capacidad) : null,
          largo: formData.largo ? Number(formData.largo) : null,
          ancho: formData.ancho ? Number(formData.ancho) : null,
        } : c));
        showNotification('Cancha actualizada (Modo Demo)');
      }
    } else {
      // Creación
      if (isBackendOnline) {
        await canchaApi.create(formData);
        showNotification('Cancha creada exitosamente');
        await cargarCanchas();
      } else {
        // En modo demo local
        const newId = Math.max(0, ...canchas.map(c => c.id_cancha)) + 1;
        const newCancha: Cancha = {
          id_cancha: newId,
          nombre: formData.nombre,
          disciplina: formData.disciplina,
          precio_hora: Number(formData.precio_hora),
          capacidad: formData.capacidad ? Number(formData.capacidad) : null,
          estado: formData.estado,
          ubicacion: formData.ubicacion,
          largo: formData.largo ? Number(formData.largo) : null,
          ancho: formData.ancho ? Number(formData.ancho) : null,
          hora_apertura: formData.hora_apertura,
          hora_cierre: formData.hora_cierre,
        };
        setCanchas(prev => [newCancha, ...prev]);
        showNotification('Nueva cancha registrada (Modo Demo)');
      }
    }
  };

  // Manejador para Eliminar
  const handleDeleteCancha = async (id: number) => {
    const confirmDelete = window.confirm(`¿Estás seguro de que deseas eliminar la cancha #${id}?`);
    if (!confirmDelete) return;

    try {
      if (isBackendOnline) {
        await canchaApi.delete(id);
        showNotification(`Cancha #${id} eliminada exitosamente`);
        await cargarCanchas();
      } else {
        setCanchas(prev => prev.filter(c => c.id_cancha !== id));
        showNotification(`Cancha #${id} eliminada (Modo Demo)`);
      }
    } catch (err: any) {
      showNotification(err.message || 'Error al eliminar la cancha', 'error');
    }
  };

  // Abrir modal de creación
  const handleOpenCreateModal = () => {
    setCanchaToEdit(null);
    setIsModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEditModal = (cancha: Cancha) => {
    setCanchaToEdit(cancha);
    setIsModalOpen(true);
  };

  // Filtrado en memoria por texto de búsqueda
  const filteredCanchas = canchas.filter(c => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(term) ||
      (c.ubicacion && c.ubicacion.toLowerCase().includes(term)) ||
      (c.disciplina && c.disciplina.toLowerCase().includes(term))
    );
  });

  return (
    <section className="canchas-section" id="canchas">
      {/* Notificación Toast */}
      {notification && (
        <div className={`toast-alert toast-${notification.type}`}>
          {notification.type === 'success' ? '✓' : '⚠️'} {notification.msg}
        </div>
      )}

      <div className="section-header">
        <div>
          <div className="inline-badge">
            <span className={`status-indicator ${isBackendOnline ? 'online' : 'demo'}`}></span>
            {isBackendOnline ? 'Conectado a PostgreSQL (Backend API)' : 'Modo Demostración Frontend'}
          </div>
          <h2 className="section-title">Nuestras Canchas y Escenarios Deportivos</h2>
          <p className="section-subtitle">
            Instalaciones de alto rendimiento con iluminación LED, césped sintético y piso flotante reglamentario.
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={handleOpenCreateModal}
          >
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Cancha
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="filters-bar">
        <div className="disciplinas-pills">
          {DISCIPLINAS.map(d => (
            <button
              key={d.id}
              type="button"
              className={`pill-btn ${activeDisciplina === d.id ? 'active' : ''}`}
              onClick={() => setActiveDisciplina(d.id)}
            >
              <span className="pill-icon">{d.icon}</span>
              {d.label}
            </button>
          ))}
        </div>

        <div className="search-box">
          <svg className="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre o bloque..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>×</button>
          )}
        </div>
      </div>

      {/* Grid de Canchas */}
      {isLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando canchas del complejo...</p>
        </div>
      ) : filteredCanchas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏟️</div>
          <h3>No se encontraron canchas</h3>
          <p>No hay canchas registradas para esta disciplina o término de búsqueda.</p>
          <button type="button" className="btn-secondary" onClick={handleOpenCreateModal}>
            Crear primera cancha
          </button>
        </div>
      ) : (
        <div className="canchas-grid">
          {filteredCanchas.map(cancha => (
            <CanchaCard
              key={cancha.id_cancha}
              cancha={cancha}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteCancha}
              onSelectReserva={(c) => {
                showNotification(`Has seleccionado la cancha "${c.nombre}". Redirigiendo al formulario de reserva...`);
              }}
            />
          ))}
        </div>
      )}

      {/* Modal Crear / Editar */}
      <CanchaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveCancha}
        canchaToEdit={canchaToEdit}
      />
    </section>
  );
};
