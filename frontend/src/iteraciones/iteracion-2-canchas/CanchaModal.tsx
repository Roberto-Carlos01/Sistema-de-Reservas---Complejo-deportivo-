import React, { useState, useEffect } from 'react';
import type { Cancha, CanchaFormData } from './cancha.types';

interface CanchaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: CanchaFormData, editingId?: number) => Promise<void>;
  canchaToEdit?: Cancha | null;
}

const initialForm: CanchaFormData = {
  nombre: '',
  disciplina: 'futbol',
  capacidad: 14,
  precio_hora: 100,
  estado: 'disponible',
  ubicacion: '',
  largo: 40,
  ancho: 20,
  hora_apertura: '07:00',
  hora_cierre: '23:00',
};

export const CanchaModal: React.FC<CanchaModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  canchaToEdit,
}) => {
  const [formData, setFormData] = useState<CanchaFormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (canchaToEdit) {
      setFormData({
        nombre: canchaToEdit.nombre || '',
        disciplina: canchaToEdit.disciplina || 'futbol',
        capacidad: canchaToEdit.capacidad ?? '',
        precio_hora: canchaToEdit.precio_hora ?? '',
        estado: canchaToEdit.estado || 'disponible',
        ubicacion: canchaToEdit.ubicacion || '',
        largo: canchaToEdit.largo ?? '',
        ancho: canchaToEdit.ancho ?? '',
        hora_apertura: canchaToEdit.hora_apertura?.slice(0, 5) || '07:00',
        hora_cierre: canchaToEdit.hora_cierre?.slice(0, 5) || '23:00',
      });
    } else {
      setFormData(initialForm);
    }
    setError(null);
  }, [canchaToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setError('El nombre de la cancha es obligatorio');
      return;
    }
    if (!formData.precio_hora || Number(formData.precio_hora) <= 0) {
      setError('El precio por hora debe ser mayor a 0');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(formData, canchaToEdit?.id_cancha);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la cancha');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{canchaToEdit ? 'Editar Cancha' : 'Nueva Cancha'}</h2>
          <button type="button" className="btn-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="form-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="nombre">Nombre de la Cancha *</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              required
              placeholder="Ej. Cancha Central de Césped"
              value={formData.nombre}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="disciplina">Disciplina Deportiva</label>
              <select
                id="disciplina"
                name="disciplina"
                value={formData.disciplina}
                onChange={handleChange}
              >
                <option value="futbol">Fútbol</option>
                <option value="futsal">Futsal</option>
                <option value="basquet">Básquetbol</option>
                <option value="voley">Voleibol</option>
                <option value="tenis">Tenis</option>
                <option value="padel">Pádel</option>
                <option value="atletismo">Atletismo</option>
                <option value="polideportivo">Polideportivo</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="estado">Estado</label>
              <select
                id="estado"
                name="estado"
                value={formData.estado}
                onChange={handleChange}
              >
                <option value="disponible">Disponible</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="inactiva">Inactiva</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="precio_hora">Precio por Hora (Bs.) *</label>
              <input
                type="number"
                id="precio_hora"
                name="precio_hora"
                min="0"
                step="5"
                required
                value={formData.precio_hora}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="capacidad">Capacidad (Personas)</label>
              <input
                type="number"
                id="capacidad"
                name="capacidad"
                placeholder="Ej. 14"
                value={formData.capacidad}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="ubicacion">Ubicación dentro del complejo</label>
            <input
              type="text"
              id="ubicacion"
              name="ubicacion"
              placeholder="Ej. Bloque A - Planta Baja"
              value={formData.ubicacion}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="largo">Largo (metros)</label>
              <input
                type="number"
                id="largo"
                name="largo"
                placeholder="Ej. 40"
                value={formData.largo}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="ancho">Ancho (metros)</label>
              <input
                type="number"
                id="ancho"
                name="ancho"
                placeholder="Ej. 20"
                value={formData.ancho}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="hora_apertura">Hora de Apertura</label>
              <input
                type="time"
                id="hora_apertura"
                name="hora_apertura"
                value={formData.hora_apertura}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="hora_cierre">Hora de Cierre</label>
              <input
                type="time"
                id="hora_cierre"
                name="hora_cierre"
                value={formData.hora_cierre}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : canchaToEdit ? 'Actualizar Cancha' : 'Crear Cancha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
