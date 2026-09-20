/**
 * ============================================================================
 * ARCHIVO: app.ts
 * CAPA: Configuración de la Aplicación Express
 * 
 * PROPÓSITO:
 * Centralizar la creación y configuración de la instancia de Express:
 * 1. Middlewares globales (CORS, JSON body parser).
 * 2. Registro de rutas de cada módulo/iteración.
 * 3. Manejo centralizado de errores y rutas no encontradas (404).
 * ============================================================================
 */

import express from 'express';
import type { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';

// Importación de rutas por iteración
import canchaRoutes from './routes/cancha.routes.js';

// 1. Inicialización de la aplicación Express
const app: Application = express();

// 2. Middlewares globales
// CORS: Permite que el frontend (ej. React en http://localhost:5173) haga peticiones a este backend
app.use(cors({
  origin: '*', // En producción se recomienda cambiar por el dominio específico del frontend
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser: Permite a Express leer y transformar cuerpos de peticiones en formato JSON
app.use(express.json());

// Logger simple para registrar peticiones entrantes en consola
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`📡 [${req.method}] ${req.url} - ${new Date().toLocaleTimeString()}`);
  next();
});

// 3. Ruta de salud del sistema (Health Check)
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'Backend del Complejo Deportivo funcionando correctamente',
    timestamp: new Date().toISOString(),
  });
});

// 4. Registro de Rutas por Iteración / Módulo
// Iteración 2: Gestión de Canchas
app.use('/api/canchas', canchaRoutes);

// 5. Manejador de rutas no encontradas (404)
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `La ruta [${req.method}] ${req.originalUrl} no existe en este servidor`,
  });
});

// 6. Middleware global para captura de excepciones no controladas (500)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('💥 Error no controlado en la aplicación:', err);
  res.status(500).json({
    success: false,
    message: 'Ocurrió un error inesperado en el servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default app;
