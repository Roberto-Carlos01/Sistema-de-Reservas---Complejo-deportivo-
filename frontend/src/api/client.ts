/**
 * ============================================================================
 * ARCHIVO: client.ts
 * CAPA: Conexión API Frontend -> Backend
 * 
 * PROPÓSITO:
 * Centralizar todas las llamadas HTTP (fetch) que hace el frontend al backend.
 * - Lee la URL base de una variable de entorno de Vite (VITE_API_URL) o usa
 *   'http://localhost:4000/api' por defecto.
 * - Configura cabeceras comunes (Content-Type: application/json).
 * - Maneja errores de red y parsea las respuestas JSON automáticamente.
 * ============================================================================
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
  count?: number;
  error?: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Petición HTTP GET genérica
   */
  async get<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Error HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error(`Error en GET ${url}:`, error);
      throw error;
    }
  }

  /**
   * Petición HTTP POST genérica
   */
  async post<T>(endpoint: string, body: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Error HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error(`Error en POST ${url}:`, error);
      throw error;
    }
  }

  /**
   * Petición HTTP PATCH genérica
   */
  async patch<T>(endpoint: string, body: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Error HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error(`Error en PATCH ${url}:`, error);
      throw error;
    }
  }

  /**
   * Petición HTTP DELETE genérica
   */
  async delete<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Error HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error(`Error en DELETE ${url}:`, error);
      throw error;
    }
  }
}

// Exportamos la instancia única
export const api = new ApiClient(API_BASE_URL);
