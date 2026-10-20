/**
 * ============================================================================
 * ARCHIVO: CanchaModal.tsx
 * COMPONENTE: Modal para Crear / Editar Cancha Deportiva
 * ACCESO:
 *   - Administrador: Crear nuevas canchas y editar existentes.
 *   - Empleado: Solo editar canchas existentes (canEditOnly = true).
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import type { Cancha, CanchaFormData } from './cancha.types';
import { getCanchaImageUrl } from './cancha.api';

interface CanchaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CanchaFormData, editingId?: number) => Promise<void>;
  canchaToEdit?: Cancha | null;
  /** Cuando es true, el usuario solo puede editar (rol Empleado), no crear nuevas canchas */
  canEditOnly?: boolean;
}

const INITIAL_FORM: CanchaFormData = {
  nombre: '',
  disciplina: 'futbol',
  capacidad: '',
  precio_hora: '',
  estado: 'disponible',
  ubicacion: '',
  largo: '',
  ancho: '',
  hora_apertura: '07:00',
  hora_cierre: '23:00',
  imagen: null,
  imagen_url: null,
};

export const CanchaModal: React.FC<CanchaModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  canchaToEdit,
  canEditOnly = false,
}) => {
  const [formData, setFormData] = useState<CanchaFormData>(INITIAL_FORM);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isEditing = Boolean(canchaToEdit);

  useEffect(() => {
    if (canchaToEdit) {
      setFormData({
        nombre: canchaToEdit.nombre,
        disciplina: canchaToEdit.disciplina || 'futbol',
        capacidad: canchaToEdit.capacidad ?? '',
        precio_hora: canchaToEdit.precio_hora,
        estado: canchaToEdit.estado || 'disponible',
        ubicacion: canchaToEdit.ubicacion || '',
        largo: canchaToEdit.largo ?? '',
        ancho: canchaToEdit.ancho ?? '',
        hora_apertura: canchaToEdit.hora_apertura ? canchaToEdit.hora_apertura.slice(0, 5) : '07:00',
        hora_cierre: canchaToEdit.hora_cierre ? canchaToEdit.hora_cierre.slice(0, 5) : '23:00',
        imagen: null,
        imagen_url: canchaToEdit.imagen_url || null,
      });
      setImagePreview(getCanchaImageUrl(canchaToEdit.imagen_url));
    } else {
      setFormData(INITIAL_FORM);
      setImagePreview(null);
    }
    setErrorMsg('');
  }, [canchaToEdit, isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('La imagen seleccionada supera el límite máximo de 5MB');
        return;
      }
      setFormData(prev => ({ ...prev, imagen: file }));
      setImagePreview(URL.createObjectURL(file));
      setErrorMsg('');
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, imagen: null, imagen_url: null }));
    setImagePreview(null);
  };

  if (!isOpen) return null;

  // Si es empleado y no hay cancha a editar, no se permite crear
  if (canEditOnly && !isEditing) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Acceso Restringido</h2>
            <button type="button" className="btn-close" onClick={onClose}>×</button>
          </div>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🚫</p>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Sin permisos para crear canchas</p>
            <p style={{ color: 'var(--text-muted, #888)', fontSize: '0.9rem' }}>
              El rol <strong>Empleado</strong> solo puede <strong>editar</strong> canchas existentes.
              Para crear nuevas canchas contacta al Administrador.
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              style={{ marginTop: '1.5rem' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.nombre.trim()) {
      setErrorMsg('El nombre de la cancha es obligatorio');
      return;
    }

    if (!formData.precio_hora || Number(formData.precio_hora) < 0) {
      setErrorMsg('Debes ingresar un precio por hora válido');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData, canchaToEdit?.id_cancha);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la cancha en el servidor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? `Editar Cancha #${canchaToEdit?.id_cancha}` : 'Registrar Nueva Cancha'}</h2>
          <button type="button" className="btn-close" onClick={onClose}>×</button>
        </div>

        {errorMsg && (
          <div className="form-error-banner">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Fotografía de la Cancha */}
          <div className="form-group">
            <label>Fotografía de la Cancha (Opcional)</label>
            <div className="image-upload-container">
              {imagePreview ? (
                <div className="image-preview-card">
                  <img src={imagePreview} alt="Previsualización de cancha" className="image-preview-thumbnail" />
                  <div className="image-preview-actions">
                    <label htmlFor="cancha-file-upload" className="btn-upload-subtle">
                      📷 Cambiar imagen
                    </label>
                    <button
                      type="button"
                      className="btn-upload-danger"
                      onClick={handleRemoveImage}
                    >
                      🗑️ Quitar
                    </button>
                  </div>
                </div>
              ) : (
                <label htmlFor="cancha-file-upload" className="image-upload-dropzone">
                  <div className="dropzone-inner">
                    <span className="dropzone-icon">📷</span>
                    <span className="dropzone-text">Selecciona una fotografía para la cancha</span>
                    <span className="dropzone-formats">Formatos permitidos: JPG, PNG, WEBP (Hasta 5MB)</span>
                  </div>
                </label>
              )}
              <input
                id="cancha-file-upload"
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="hidden-file-input"
                onChange={handleImageChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Nombre de la Cancha *</label>
            <input
              type="text"
              placeholder="Ej: Cancha Central Sintética"
              value={formData.nombre}
              onChange={e => setFormData({ ...formData, nombre: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Disciplina Deportiva</label>
              <select
                value={formData.disciplina}
                onChange={e => setFormData({ ...formData, disciplina: e.target.value })}
              >
                <option value="futbol">Fútbol</option>
                <option value="futsal">Futsal</option>
                <option value="padel">Pádel</option>
                <option value="tenis">Tenis</option>
                <option value="basquet">Básquetbol</option>
                <option value="voley">Voleibol</option>
                <option value="atletismo">Atletismo</option>
                <option value="multiuso">Multiuso</option>
              </select>
            </div>

            <div className="form-group">
              <label>Estado Operativo</label>
              <select
                value={formData.estado}
                onChange={e => setFormData({ ...formData, estado: e.target.value })}
              >
                <option value="disponible">Disponible</option>
                <option value="mantenimiento">En Mantenimiento</option>
                <option value="ocupada">Ocupada</option>
                <option value="inactiva">Inactiva</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Precio por Hora (Bs.) *</label>
              <input
                type="number"
                step="0.50"
                min="0"
                placeholder="100.00"
                value={formData.precio_hora}
                onChange={e => setFormData({ ...formData, precio_hora: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Capacidad (personas)</label>
              <input
                type="number"
                min="1"
                placeholder="Ej: 14"
                value={formData.capacidad}
                onChange={e => setFormData({ ...formData, capacidad: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Ubicación / Sector en el Complejo</label>
            <input
              type="text"
              placeholder="Ej: Sector Norte - Bloque C"
              value={formData.ubicacion}
              onChange={e => setFormData({ ...formData, ubicacion: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Largo (metros)</label>
              <input
                type="number"
                step="0.1"
                placeholder="Ej: 40.0"
                value={formData.largo}
                onChange={e => setFormData({ ...formData, largo: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Ancho (metros)</label>
              <input
                type="number"
                step="0.1"
                placeholder="Ej: 20.0"
                value={formData.ancho}
                onChange={e => setFormData({ ...formData, ancho: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Hora Apertura</label>
              <input
                type="time"
                value={formData.hora_apertura}
                onChange={e => setFormData({ ...formData, hora_apertura: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Hora Cierre</label>
              <input
                type="time"
                value={formData.hora_cierre}
                onChange={e => setFormData({ ...formData, hora_cierre: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Cancha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default CanchaModal;
