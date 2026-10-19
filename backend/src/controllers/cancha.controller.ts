/**
 * ============================================================================
 * ARCHIVO: cancha.controller.ts
 * CAPA: Controladores (Controllers/)
 * 
 * PROPÓSITO:
 * El controlador actúa como intermediario entre la capa de red (Rutas HTTP)
 * y la lógica de negocio (Servicios).
 * - Recibe los objetos Request y Response de Express.
 * - Extrae parámetros de la URL (req.params), query string (req.query) o cuerpo (req.body).
 * - Valida datos básicos de entrada.
 * - Invoca los métodos correspondientes del servicio.
 * - Responde al cliente con el código de estado HTTP adecuado (200, 201, 400, 404, 500).
 * ============================================================================
 */

import type { Request, Response } from 'express';
import { canchaService } from '../services/cancha.service';
import type { Cancha, CreateCanchaDTO, UpdateCanchaDTO, CanchaFilters } from '../types/cancha.types';
import { saveCanchaImage } from '../utils/canchaImage.util';

// Helper para extraer string de parámetros o queries de Express
const extractString = (val: unknown): string | undefined => {
  if (typeof val === 'string') return val;
  if (Array.isArray(val) && typeof val[0] === 'string') return val[0];
  return undefined;
};

export class CanchaController {
  /**
   * GET /api/canchas
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const filters: CanchaFilters = {
        disciplina: extractString(req.query.disciplina),
        estado: extractString(req.query.estado),
        search: extractString(req.query.search),
      };

      const canchas = await canchaService.getAllCanchas(filters);

      res.status(200).json({
        success: true,
        count: canchas.length,
        data: canchas,
      });
    } catch (error) {
      console.error('Error en CanchaController.getAll:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener las canchas',
        error: (error as Error).message,
      });
    }
  }

  /**
   * GET /api/canchas/:id
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const rawId = extractString(req.params.id);
      if (!rawId) {
        res.status(400).json({
          success: false,
          message: 'Debe especificar el ID de la cancha',
        });
        return;
      }

      const id = parseInt(rawId, 10);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'El ID de la cancha debe ser un número entero válido',
        });
        return;
      }

      const cancha = await canchaService.getCanchaById(id);

      if (!cancha) {
        res.status(404).json({
          success: false,
          message: `No se encontró la cancha con ID ${id}`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: cancha,
      });
    } catch (error) {
      console.error(`Error en CanchaController.getById (${req.params.id}):`, error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener la cancha',
        error: (error as Error).message,
      });
    }
  }

  /**
   * GET /api/canchas/:id/reservas
   */
  async getReservasPorCancha(req: Request, res: Response): Promise<void> {
    try {
      const rawId = extractString(req.params.id);
      if (!rawId) {
        res.status(400).json({
          success: false,
          message: 'Debe especificar el ID de la cancha',
        });
        return;
      }

      const id = parseInt(rawId, 10);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'El ID de la cancha debe ser un número entero válido',
        });
        return;
      }

      const { mes, fecha } = req.query;
      const reservas = await canchaService.getReservasDeCancha(id, {
        mes: typeof mes === 'string' ? mes : undefined,
        fecha: typeof fecha === 'string' ? fecha : undefined,
      });

      res.status(200).json({
        success: true,
        data: reservas,
      });
    } catch (error) {
      console.error(`Error en CanchaController.getReservasPorCancha (${req.params.id}):`, error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al consultar la disponibilidad',
        error: (error as Error).message,
      });
    }
  }

  /**
   * POST /api/canchas
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;

      if (!data.nombre || String(data.nombre).trim() === '') {
        res.status(400).json({
          success: false,
          message: 'El campo "nombre" es obligatorio',
        });
        return;
      }

      const precioHoraNum = Number(data.precio_hora);
      if (data.precio_hora === undefined || isNaN(precioHoraNum) || precioHoraNum < 0) {
        res.status(400).json({
          success: false,
          message: 'El campo "precio_hora" es obligatorio y debe ser un número positivo',
        });
        return;
      }

      const payload: CreateCanchaDTO = {
        nombre: String(data.nombre).trim(),
        disciplina: data.disciplina || null,
        capacidad: data.capacidad ? parseInt(String(data.capacidad), 10) : null,
        precio_hora: precioHoraNum,
        estado: data.estado || 'disponible',
        ubicacion: data.ubicacion || null,
        largo: data.largo ? parseFloat(String(data.largo)) : null,
        ancho: data.ancho ? parseFloat(String(data.ancho)) : null,
        hora_apertura: data.hora_apertura || null,
        hora_cierre: data.hora_cierre || null,
      };

      const nuevaCancha = await canchaService.createCancha(payload);

      // Si se adjuntó un archivo de imagen en la petición (multipart/form-data)
      if (req.file) {
        const imagenUrl = saveCanchaImage(nuevaCancha.id_cancha, req.file.path, req.file.originalname);
        nuevaCancha.imagen_url = imagenUrl;
      }

      res.status(201).json({
        success: true,
        message: 'Cancha creada exitosamente',
        data: nuevaCancha,
      });
    } catch (error) {
      console.error('Error en CanchaController.create:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al crear la cancha',
        error: (error as Error).message,
      });
    }
  }

  /**
   * PATCH /api/canchas/:id
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const rawId = extractString(req.params.id);
      if (!rawId) {
        res.status(400).json({
          success: false,
          message: 'Debe especificar el ID de la cancha',
        });
        return;
      }

      const id = parseInt(rawId, 10);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'El ID de la cancha debe ser un número entero válido',
        });
        return;
      }

      const data = req.body || {};
      const updateData: UpdateCanchaDTO = {};

      if (data.nombre !== undefined) updateData.nombre = String(data.nombre).trim();
      if (data.disciplina !== undefined) updateData.disciplina = data.disciplina || null;
      if (data.capacidad !== undefined) updateData.capacidad = data.capacidad ? parseInt(String(data.capacidad), 10) : null;
      if (data.precio_hora !== undefined) updateData.precio_hora = Number(data.precio_hora);
      if (data.estado !== undefined) updateData.estado = data.estado;
      if (data.ubicacion !== undefined) updateData.ubicacion = data.ubicacion || null;
      if (data.largo !== undefined) updateData.largo = data.largo ? parseFloat(String(data.largo)) : null;
      if (data.ancho !== undefined) updateData.ancho = data.ancho ? parseFloat(String(data.ancho)) : null;
      if (data.hora_apertura !== undefined) updateData.hora_apertura = data.hora_apertura || null;
      if (data.hora_cierre !== undefined) updateData.hora_cierre = data.hora_cierre || null;

      // Si se adjuntó una nueva imagen, se guarda y reemplaza la previa
      if (req.file) {
        saveCanchaImage(id, req.file.path, req.file.originalname);
      }

      let canchaActualizada: Cancha | null = null;
      if (Object.keys(updateData).length > 0) {
        canchaActualizada = await canchaService.updateCancha(id, updateData);
      } else {
        canchaActualizada = await canchaService.getCanchaById(id);
      }

      if (!canchaActualizada) {
        res.status(404).json({
          success: false,
          message: `No se pudo actualizar: La cancha con ID ${id} no existe`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Cancha actualizada correctamente',
        data: canchaActualizada,
      });
    } catch (error) {
      console.error(`Error en CanchaController.update (${req.params.id}):`, error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al actualizar la cancha',
        error: (error as Error).message,
      });
    }
  }

  /**
   * DELETE /api/canchas/:id (Eliminación Lógica / Soft Delete)
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const rawId = extractString(req.params.id);
      if (!rawId) {
        res.status(400).json({
          success: false,
          message: 'Debe especificar el ID de la cancha',
        });
        return;
      }

      const id = parseInt(rawId, 10);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'El ID de la cancha debe ser un número entero válido',
        });
        return;
      }

      const deleted = await canchaService.deleteCancha(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: `No se encontró la cancha con ID ${id} para dar de baja`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Cancha con ID ${id} desactivada correctamente (baja lógica)`,
      });
    } catch (error) {
      console.error(`Error en CanchaController.delete (${req.params.id}):`, error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al desactivar la cancha',
        error: (error as Error).message,
      });
    }
  }
}

export const canchaController = new CanchaController();