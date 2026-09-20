# 💳 Iteración 4: Gestión de Pagos

## Objetivo
Procesar pagos asociados a cada reserva mediante pasarelas digitales (tarjeta, QR) o registro manual en efectivo, emitiendo comprobantes.

## Estructura sugerida
- `pago.types.ts`: Definición de comprobantes y pagos.
- `pago.api.ts`: Endpoints `POST /api/pagos`, `GET /api/pagos/:id`.
- `PagoModal.tsx`: Interfaz de selección de método de pago (Tarjeta / QR / Efectivo).
- `ComprobanteRecibo.tsx`: Vista descargable o imprimible del comprobante de pago.
