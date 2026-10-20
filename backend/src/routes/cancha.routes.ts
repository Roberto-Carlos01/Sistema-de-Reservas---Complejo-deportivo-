/**
 * ============================================================================
 * ARCHIVO: cancha.routes.ts
 * CAPA: Rutas (Routes/)
 * 
 * PROPÓSITO:
 * Mapea los verbos HTTP (GET, POST, PATCH, DELETE) y las URLs a las funciones
 * correspondientes del controlador 'canchaController'.
 * 
 * Flujo:
 * Petición Cliente -> Router -> Controller -> Service -> Base de Datos
 * ============================================================================
 */

import { Router } from 'express';
import { canchaController } from '../controllers/cancha.controller';
import { verificarToken, esAdmin, esAdminOEmpleado } from '../middlewares/authMiddleware';
import multer from 'multer';
import path from 'path';
import { CANCHAS_UPLOAD_DIR, ensureCanchasDirExists } from '../utils/canchaImage.util';

const router = Router();

// Asegurar existencia del directorio de subida
ensureCanchasDirExists();

// Configuración de almacenamiento Multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureCanchasDirExists();
    cb(null, CANCHAS_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `temp-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes válidas (JPG, PNG, WEBP, etc.)'));
    }
  }
});

/**
 * @route   GET /api/canchas
 * @desc    Obtener todas las canchas (soporta filtros: ?disciplina=futbol&estado=disponible&search=central)
 * @access  Público
 */
router.get('/', (req, res) => canchaController.getAll(req, res));

/**
 * @route   GET /api/canchas/:id/reservas
 * @desc    Consultar reservas de una cancha por mes o por fecha
 * @access  Público
 */
router.get('/:id/reservas', (req, res) => canchaController.getReservasPorCancha(req, res));

/**
 * @route   GET /api/canchas/:id
 * @desc    Obtener el detalle de una cancha específica por su ID
 * @access  Público
 */
router.get('/:id', (req, res) => canchaController.getById(req, res));

/**
 * @route   POST /api/canchas
 * @desc    Crear una nueva cancha (con opción a subir imagen)
 * @access  Solo Administrador
 */
router.post('/', verificarToken, esAdmin, upload.single('imagen'), (req, res) => canchaController.create(req, res));

/**
 * @route   PATCH /api/canchas/:id
 * @desc    Actualizar datos o reemplazar imagen de una cancha
 * @access  Administrador y Empleado
 */
router.patch('/:id', verificarToken, esAdminOEmpleado, upload.single('imagen'), (req, res) => canchaController.update(req, res));

/**
 * @route   DELETE /api/canchas/:id
 * @desc    Eliminar una cancha por su ID (baja lógica)
 * @access  Solo Administrador
 */
router.delete('/:id', verificarToken, esAdmin, (req, res) => canchaController.delete(req, res));

export default router;