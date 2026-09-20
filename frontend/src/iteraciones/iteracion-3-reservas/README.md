# 📅 Iteración 3: Gestión de Reservas

## Objetivo
Permitir a los clientes y empleados consultar disponibilidad horaria de canchas, reservar turnos y asociar utilidades deportivas (balones, chalecos, cronómetros).

## Estructura sugerida
- `reserva.types.ts`: Tipos de Reserva y Utilidad.
- `reserva.api.ts`: Métodos `POST /api/reservas`, `GET /api/reservas`, etc.
- `CalendarioHorarios.tsx`: Selector visual de horas disponibles por cancha.
- `ReservaForm.tsx`: Formulario de confirmación de turno y selección de utilidades.
- `MisReservas.tsx`: Listado de reservas del cliente con estado (pendiente, confirmada, cancelada).
