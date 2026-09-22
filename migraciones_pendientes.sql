-- ============================================================
-- MIGRACIONES PENDIENTES - Base de datos bdcomplejodeportivo
-- Fecha: 2026-09-22
-- ============================================================
-- Uso: cada integrante del equipo corre esto UNA sola vez
-- contra su propia base de datos local, después de un git pull:
--   psql -h localhost -p 5432 -U tu_usuario -d bdcomplejodeportivo -f migraciones_pendientes.sql
-- ============================================================

-- 1) RF48 - registrar qué administrador/empleado canceló un evento
--    (usado en eventoModel.ts / evento.controller.ts)
ALTER TABLE evento
ADD COLUMN IF NOT EXISTS id_usuario_cancelacion INTEGER REFERENCES usuario(id_usuario);

-- 2) Módulo de Pagos - guardar el comprobante subido por el cliente
--    (usado en pagoModel.ts / pagoController.ts / VerificarPagos.tsx)
ALTER TABLE pago
ADD COLUMN IF NOT EXISTS comprobante_url TEXT;