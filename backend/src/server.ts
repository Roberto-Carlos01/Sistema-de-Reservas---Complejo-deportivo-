/**
 * ============================================================================
 * ARCHIVO: server.ts
 * CAPA: Punto de Entrada (Entry Point)
 * 
 * PROPÓSITO:
 * Inicializa el servidor HTTP de Node.js escuchando en el puerto configurado.
 * Antes de comenzar a recibir tráfico, prueba la conexión con PostgreSQL.
 * ============================================================================
 */

import app from './app.js';
import { testDatabaseConnection } from './config/database.js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const PORT = Number(process.env.PORT) || 4000;

/**
 * Función de arranque del servidor
 */
const startServer = async () => {
  try {
    // 1. Probar conectividad con PostgreSQL
    console.log('🔄 Verificando conexión con PostgreSQL...');
    await testDatabaseConnection();

    // 2. Iniciar servidor HTTP
    app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`🚀 Servidor backend escuchando en: http://localhost:${PORT}`);
      console.log(`📋 API Canchas lista en: http://localhost:${PORT}/api/canchas`);
      console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
      console.log('====================================================');
    });
  } catch (error) {
    console.error('❌ Error fatal al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();
