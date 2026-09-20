/**
 * ============================================================================
 * ITERACIÓN 1: GESTIÓN DE USUARIOS
 * Archivo de tipos e interfaces para Usuarios, Clientes, Administradores y Empleados
 * ============================================================================
 */

export interface Usuario {
  id_usuario: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  correo: string;
  telefono: string | null;
  contrasena: string;
  fecha_registro: string;
  estado_cuenta: 'activo' | 'inactivo' | string;
}

export interface Cliente {
  id_cliente: number;
  fecha_nacimiento: string | null;
  edad: number | null;
  ci_nit: string | null;
  calle: string | null;
  zona: string | null;
  ciudad: string | null;
}

export interface CreateUsuarioDTO {
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  correo: string;
  telefono?: string;
  contrasena: string;
  rol: 'cliente' | 'administrador' | 'empleado';
}
