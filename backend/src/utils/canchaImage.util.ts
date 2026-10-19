/**
 * ============================================================================
 * ARCHIVO: canchaImage.util.ts
 * UTILIDAD: Manejo de imágenes de canchas en el sistema de archivos
 * 
 * PROPÓSITO:
 * Permitir asociar y persistir imágenes de canchas SIN MODIFICAR el esquema
 * de la base de datos PostgreSQL. Utiliza convención por ID:
 *   /uploads/canchas/cancha-{id_cancha}.[ext]
 * ============================================================================
 */

import path from 'path';
import fs from 'fs';

export const CANCHAS_UPLOAD_DIR = path.join(__dirname, '../../uploads/canchas');

/**
 * Asegura que el directorio de imágenes de canchas exista.
 */
export const ensureCanchasDirExists = (): void => {
  if (!fs.existsSync(CANCHAS_UPLOAD_DIR)) {
    fs.mkdirSync(CANCHAS_UPLOAD_DIR, { recursive: true });
  }
};

/**
 * Busca si existe una imagen guardada en disco para el id_cancha dado.
 * Retorna la ruta relativa para ser consumida como URL estática (ej: /uploads/canchas/cancha-1.jpg),
 * o null si no tiene ninguna imagen asociada.
 */
export const findCanchaImage = (id_cancha: number): string | null => {
  try {
    ensureCanchasDirExists();
    const files = fs.readdirSync(CANCHAS_UPLOAD_DIR);
    const pattern = new RegExp(`^cancha-${id_cancha}\\.(jpg|jpeg|png|webp|gif|svg)$`, 'i');
    const matched = files.find((file) => pattern.test(file));
    if (matched) {
      return `/uploads/canchas/${matched}`;
    }
  } catch (error) {
    console.error(`[canchaImage.util] Error al buscar imagen para cancha #${id_cancha}:`, error);
  }
  return null;
};

/**
 * Guarda o reemplaza la imagen de una cancha específica.
 * Elimina cualquier versión previa (con otra extensión) y renombra el archivo subido a:
 *   cancha-{id_cancha}.ext
 */
export const saveCanchaImage = (id_cancha: number, tempFilePath: string, originalName: string): string => {
  ensureCanchasDirExists();

  // 1. Eliminar imágenes anteriores de esta misma cancha si existían
  deleteCanchaImage(id_cancha);

  // 2. Determinar la nueva extensión
  const ext = (path.extname(originalName) || '.jpg').toLowerCase();
  const targetFileName = `cancha-${id_cancha}${ext}`;
  const targetPath = path.join(CANCHAS_UPLOAD_DIR, targetFileName);

  // 3. Mover o copiar el archivo desde la ruta temporal
  fs.renameSync(tempFilePath, targetPath);

  return `/uploads/canchas/${targetFileName}`;
};

/**
 * Elimina cualquier archivo de imagen asociado a la cancha especificada.
 */
export const deleteCanchaImage = (id_cancha: number): void => {
  try {
    ensureCanchasDirExists();
    const files = fs.readdirSync(CANCHAS_UPLOAD_DIR);
    const pattern = new RegExp(`^cancha-${id_cancha}\\.(jpg|jpeg|png|webp|gif|svg)$`, 'i');
    for (const file of files) {
      if (pattern.test(file)) {
        fs.unlinkSync(path.join(CANCHAS_UPLOAD_DIR, file));
      }
    }
  } catch (error) {
    console.error(`[canchaImage.util] Error al eliminar imagen para cancha #${id_cancha}:`, error);
  }
};
