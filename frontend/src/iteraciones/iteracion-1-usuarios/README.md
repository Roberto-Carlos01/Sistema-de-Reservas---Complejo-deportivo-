# 👥 Iteración 1: Gestión de Usuarios

## Objetivo
Gestionar el registro, autenticación, roles y perfiles de los usuarios del Complejo Deportivo:
- **Cliente**
- **Administrador**
- **Empleado**

## Estructura sugerida
- `usuario.types.ts`: Tipos TypeScript para Usuario, Cliente, Empleado y Admin.
- `usuario.api.ts`: Métodos HTTP para conectar con `/api/usuarios`, `/api/auth/login`, `/api/auth/register`.
- `LoginForm.tsx`: Componente de inicio de sesión.
- `RegistroCliente.tsx`: Formulario de registro de cliente con datos personales y contacto.
- `PerfilUsuario.tsx`: Visualización y edición de datos del usuario autenticado.
