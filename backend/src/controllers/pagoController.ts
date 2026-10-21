import { Request, Response } from 'express';
import { readFile } from 'fs/promises';
import { ReservaModel } from '../models/reservaModel';
import { PagoModel } from '../models/pagoModel';
import { calcularMontoReserva, PagoValidacionError, validarMontoInformado } from '../services/pago.service';
import { notificarCambioPago } from '../services/pagoNotificacion.service';

const normalizarMetodoPago = (metodo: string) => {
    if (['presencial', 'fisico', 'efectivo'].includes(metodo)) return 'presencial';
    if (['tarjeta', 'tarjeta_debito', 'tarjeta_credito'].includes(metodo)) return 'tarjeta';
    return metodo;
};

const validarFirmaComprobante = async (archivo?: Express.Multer.File) => {
    if (!archivo) return false;
    const cabecera = await readFile(archivo.path).then((contenido) => contenido.subarray(0, 12));
    const tipo = archivo.mimetype;
    if (tipo === 'application/pdf') return cabecera.subarray(0, 5).toString() === '%PDF-';
    if (tipo === 'image/jpeg') return cabecera[0] === 0xff && cabecera[1] === 0xd8 && cabecera[2] === 0xff;
    if (tipo === 'image/png') return cabecera.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (tipo === 'image/webp') return cabecera.subarray(0, 4).toString() === 'RIFF' && cabecera.subarray(8, 12).toString() === 'WEBP';
    return false;
};

export const PagoController = {
    procesarPagoConComprobante: async (req: Request, res: Response) => {
        try {
            const { id_usuario, rol } = (req as any).usuario;
            const { id_reserva, metodo_pago: metodoEntrada, nro_comprobante, referencia_pasarela, monto, detalles } = req.body;
            const metodo_pago = normalizarMetodoPago(String(metodoEntrada || '').trim().toLowerCase());

            if (!id_reserva || !metodo_pago) {
                return res.status(400).json({ error: 'id_reserva y metodo_pago son obligatorios' });
            }

            const metodosValidos = ['presencial', 'tarjeta', 'qr'];
            if (!metodosValidos.includes(metodo_pago)) {
                return res.status(400).json({ 
                    error: `Método de pago inválido. Opciones: ${metodosValidos.join(', ')}` 
                });
            }

            const esVirtual = ['tarjeta', 'qr'].includes(metodo_pago);

            if (esVirtual && !req.file) {
                return res.status(400).json({ 
                    error: 'Para pagos virtuales es obligatorio subir el comprobante de pago.' 
                });
            }
            if (req.file && !(await validarFirmaComprobante(req.file))) {
                return res.status(400).json({ error: 'El contenido del archivo no coincide con el tipo de comprobante permitido.' });
            }
            if (esVirtual && !String(nro_comprobante || '').trim()) {
                return res.status(400).json({ error: 'El número de operación del comprobante es obligatorio.' });
            }
            if (String(nro_comprobante || '').trim().length > 50) {
                return res.status(400).json({ error: 'El número de operación no puede superar 50 caracteres.' });
            }

            const reserva = await ReservaModel.obtenerPorId(Number(id_reserva));
            if (!reserva) {
                return res.status(404).json({ error: 'La reserva no existe' });
            }
            if (reserva.estado === 'cancelada') {
                return res.status(409).json({ error: 'No se puede pagar una reserva cancelada.' });
            }
                if (rol?.toLowerCase() === 'cliente' && Number(reserva.id_cliente) !== Number(id_usuario)) {
                return res.status(403).json({ error: 'No puedes pagar una reserva ajena.' });
            }

            const pagoExistente = await PagoModel.obtenerPorReserva(Number(id_reserva));
            if (pagoExistente && pagoExistente.estado !== 'rechazado') {
                return res.status(409).json({ error: 'Esta reserva ya tiene un pago activo.' });
            }

            const calculado = await calcularMontoReserva(reserva, detalles);
            validarMontoInformado(monto, calculado.monto);

            let comprobanteUrl = null;
            if (req.file) {
                comprobanteUrl = `/uploads/comprobantes/${req.file.filename}`;
            }

            const tipoRegistro = metodo_pago === 'presencial' ? 'presencial' : 'online';
            const estadoPago = metodo_pago === 'presencial' ? 'pagado' : 'pendiente_verificacion';

            const pago = await PagoModel.crearPago({
                id_reserva: Number(id_reserva),
                metodo_pago,
                tipo_registro: tipoRegistro,
                referencia_pasarela: referencia_pasarela || `RES-${id_reserva}`,
                nro_comprobante: String(nro_comprobante || '').trim() || null,
                comprobante_url: comprobanteUrl,
                detalle_adicionales: calculado.detalles,
                monto: calculado.monto,
                estado: estadoPago,
                id_usuario: Number(id_usuario)
            });

            if (metodo_pago === 'presencial') {
                await ReservaModel.actualizarEstado(Number(id_reserva), 'confirmada');
                const revision = await PagoModel.obtenerRevisionReserva(Number(id_reserva));
                try {
                    await notificarCambioPago({
                        correo: revision?.reserva?.cliente_correo,
                        nombre: revision?.reserva?.cliente_nombre,
                        id_reserva: Number(id_reserva),
                        monto: calculado.monto,
                        estado: 'pagado'
                    });
                } catch (error) {
                    console.error('No se pudo enviar la notificación de pago presencial:', error);
                }
            } else {
                await ReservaModel.actualizarEstado(Number(id_reserva), 'pendiente_pago');
            }

            res.status(201).json({
                success: true,
                message: metodo_pago === 'presencial' 
                    ? 'Pago presencial registrado. Reserva confirmada.'
                    : 'Comprobante enviado. Tu reserva está pendiente de verificación por un administrador.',
                data: pago
            });

        } catch (error: any) {
            if (error instanceof PagoValidacionError) {
                return res.status(400).json({ error: error.message });
            }
            if (error?.code === '23505') {
                return res.status(409).json({ error: 'Ya existe un pago activo para esta reserva.' });
            }
            console.error('Error en procesarPagoConComprobante:', error);
            res.status(500).json({ error: error.message || 'Error al procesar el pago' });
        }
    },

    procesarPago: async (req: Request, res: Response) => {
        try {
            const { id_usuario, rol } = (req as any).usuario;
            const { id_reserva, metodo_pago: metodoEntrada, nro_comprobante, referencia_pasarela, monto } = req.body;
            const metodo_pago = normalizarMetodoPago(String(metodoEntrada || '').trim().toLowerCase());

            if (!id_reserva || !metodo_pago) {
                return res.status(400).json({ error: 'id_reserva y metodo_pago son obligatorios' });
            }

            if (metodo_pago !== 'presencial') {
                return res.status(400).json({ error: 'Los pagos virtuales deben enviarse con su comprobante.' });
            }

            const reserva = await ReservaModel.obtenerPorId(Number(id_reserva));
            if (!reserva) {
                return res.status(404).json({ error: 'La reserva no existe' });
            }
            if (reserva.estado === 'cancelada') {
                return res.status(409).json({ error: 'No se puede pagar una reserva cancelada.' });
            }
            if (rol?.toLowerCase() === 'cliente' && Number(reserva.id_cliente) !== Number(id_usuario)) {
                return res.status(403).json({ error: 'No puedes pagar una reserva ajena.' });
            }

            const pagoExistente = await PagoModel.obtenerPorReserva(Number(id_reserva));
            if (pagoExistente && pagoExistente.estado !== 'rechazado') {
                return res.status(409).json({ error: 'Esta reserva ya tiene un pago activo.' });
            }

            const calculado = await calcularMontoReserva(reserva);
            validarMontoInformado(monto, calculado.monto);

            const pago = await PagoModel.crearPago({
                id_reserva: Number(id_reserva),
                monto: calculado.monto,
                metodo_pago,
                tipo_registro: 'presencial',
                referencia_pasarela: referencia_pasarela || null,
                nro_comprobante: nro_comprobante || null,
                estado: 'pagado',
                id_usuario: Number(id_usuario)
            });

            await ReservaModel.actualizarEstado(Number(id_reserva), 'confirmada');

            res.status(201).json({
                success: true,
                message: metodo_pago === 'presencial' 
                    ? 'Pago presencial registrado. Reserva confirmada.'
                    : 'Comprobante enviado. Tu reserva está pendiente de verificación.',
                data: pago
            });

        } catch (error: any) {
            if (error instanceof PagoValidacionError) {
                return res.status(400).json({ error: error.message });
            }
            if (error?.code === '23505') {
                return res.status(409).json({ error: 'Ya existe un pago activo para esta reserva.' });
            }
            console.error('Error en procesarPago:', error);
            res.status(500).json({ error: error.message || 'Error al procesar el pago' });
        }
    },

    subirComprobante: async (req: Request, res: Response) => {
        try {
            const { id_pago } = req.params;
            const { id_usuario } = (req as any).usuario;

            if (!req.file) {
                return res.status(400).json({ error: 'No se subió ningún archivo' });
            }
            if (!(await validarFirmaComprobante(req.file))) {
                return res.status(400).json({ error: 'El contenido del archivo no coincide con el tipo de comprobante permitido.' });
            }

            const comprobanteUrl = `/uploads/comprobantes/${req.file.filename}`;

            const pago = await PagoModel.obtenerPorId(Number(id_pago));
            if (!pago) {
                return res.status(404).json({ error: 'Pago no encontrado' });
            }

            const reserva = await ReservaModel.obtenerPorId(pago.id_reserva);
            if (!reserva || Number(reserva.id_cliente) !== Number(id_usuario)) {
                return res.status(403).json({ error: 'No autorizado' });
            }

            const esVirtual = ['tarjeta', 'tarjeta_debito', 'tarjeta_credito', 'qr', 'transferencia'].includes(pago.metodo_pago);
            if (!esVirtual) {
                return res.status(400).json({ error: 'Los pagos presenciales no requieren comprobante' });
            }

            if (reserva.estado === 'cancelada') {
                return res.status(409).json({ error: 'No se puede adjuntar comprobante a una reserva cancelada.' });
            }
            const pagoActualizado = await PagoModel.actualizarComprobante(Number(id_pago), comprobanteUrl);
            if (!pagoActualizado) {
                return res.status(409).json({ error: 'El pago ya fue verificado o no admite cambios.' });
            }

            res.json({
                success: true,
                message: 'Comprobante subido correctamente. Tu reserva será verificada pronto.',
                data: pagoActualizado
            });

        } catch (error: any) {
            console.error('Error en subirComprobante:', error);
            res.status(500).json({ error: error.message || 'Error al subir comprobante' });
        }
    },

    verificarPago: async (req: Request, res: Response) => {
        try {
            const { id_pago } = req.params;
            const { estado, motivo_rechazo } = req.body;

            if (!estado || !['pagado', 'rechazado'].includes(estado)) {
                return res.status(400).json({ error: 'Estado inválido. Use "pagado" o "rechazado"' });
            }
            const motivo = String(motivo_rechazo || '').trim();
            if (estado === 'rechazado' && (motivo.length < 5 || motivo.length > 500)) {
                return res.status(400).json({ error: 'Indica un motivo de rechazo de entre 5 y 500 caracteres.' });
            }

            const pago = await PagoModel.obtenerPorId(Number(id_pago));
            if (!pago) return res.status(404).json({ error: 'Pago no encontrado.' });
            if (!['pendiente', 'pendiente_verificacion'].includes(pago.estado)) {
                return res.status(409).json({ error: 'Este pago ya fue verificado.' });
            }
            const reserva = await ReservaModel.obtenerPorId(pago.id_reserva);
            if (!reserva || reserva.estado === 'cancelada') {
                return res.status(409).json({ error: 'No se puede verificar un pago de una reserva cancelada.' });
            }
            if (estado === 'pagado' && normalizarMetodoPago(pago.metodo_pago) !== 'presencial' && !pago.comprobante_url) {
                return res.status(400).json({ error: 'No se puede aprobar un pago virtual sin comprobante.' });
            }
            const { id_usuario } = (req as any).usuario;
            const actualizado = await PagoModel.verificarPagoConAuditoria(Number(id_pago), estado, motivo || null, Number(id_usuario));
            if (!actualizado) return res.status(409).json({ error: 'Este pago ya fue verificado.' });
            const revision = await PagoModel.obtenerRevisionReserva(pago.id_reserva);
            const reservaInfo = revision?.reserva;
            try {
                await notificarCambioPago({
                    correo: reservaInfo?.cliente_correo,
                    nombre: reservaInfo?.cliente_nombre,
                    id_reserva: pago.id_reserva,
                    monto: pago.monto,
                    estado,
                    motivo
                });
            } catch (error) {
                console.error('No se pudo enviar la notificación de pago:', error);
            }

            res.json({
                success: true,
                message: `Pago ${estado === 'pagado' ? 'aprobado y reserva confirmada' : 'rechazado'}`
            });

        } catch (error: any) {
            console.error('Error en verificarPago:', error);
            res.status(500).json({ error: error.message || 'Error al verificar pago' });
        }
    },

    obtenerPagosPorReserva: async (req: Request, res: Response) => {
        try {
            const idReserva = Number(req.params.id_reserva);
            const { id_usuario, rol } = (req as any).usuario;
            const reserva = await ReservaModel.obtenerPorId(idReserva);
            if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada.' });
            const personal = ['admin', 'administrador', 'empleado'].includes(String(rol).toLowerCase());
            if (!personal && Number(reserva.id_cliente) !== Number(id_usuario)) {
                return res.status(403).json({ error: 'No autorizado.' });
            }
            const pagos = await PagoModel.obtenerPagosPorReserva(idReserva);
            res.json({ success: true, data: pagos });
        } catch (error) {
            console.error('Error en obtenerPagosPorReserva:', error);
            res.status(500).json({ error: 'Error al obtener los pagos de la reserva.' });
        }
    },

    revisionPagoReserva: async (req: Request, res: Response) => {
        try {
            const idReserva = Number(req.params.id_reserva);
            const revision = await PagoModel.obtenerRevisionReserva(idReserva);
            if (!revision) return res.status(404).json({ error: 'Reserva no encontrada.' });
            res.json({ success: true, data: revision });
        } catch (error) {
            console.error('Error en revisionPagoReserva:', error);
            res.status(500).json({ error: 'Error al consultar el pago de la reserva.' });
        }
    },

    historialPagos: async (req: Request, res: Response) => {
        try {
            const { id_usuario } = (req as any).usuario;
            const pagos = await PagoModel.obtenerHistorialPagos(id_usuario);
            res.json({ success: true, data: pagos });
        } catch (error: any) {
            console.error('Error en historialPagos:', error);
            res.status(500).json({ error: 'Error al obtener historial de pagos' });
        }
    },

    pagosPendientes: async (_req: Request, res: Response) => {
        try {
            const pagos = await PagoModel.obtenerPagosPendientes();
            res.json({ success: true, data: pagos });
        } catch (error: any) {
            console.error('Error en pagosPendientes:', error);
            res.status(500).json({ error: 'Error al obtener pagos pendientes' });
        }
    },

    todosLosPagos: async (_req: Request, res: Response) => {
        try {
            const pagos = await PagoModel.obtenerTodosPagos();
            res.json({ success: true, data: pagos });
        } catch (error) {
            console.error('Error en todosLosPagos:', error);
            res.status(500).json({ error: 'Error al obtener el historial de pagos.' });
        }
    },

    conciliacionPagos: async (req: Request, res: Response) => {
        try {
            const hoy = new Date().toISOString().slice(0, 10);
            const desde = String(req.query.desde || '2000-01-01');
            const hasta = String(req.query.hasta || hoy);
            const esFecha = (fecha: string) => /^\d{4}-\d{2}-\d{2}$/.test(fecha) && !Number.isNaN(new Date(`${fecha}T00:00:00Z`).getTime());
            if (!esFecha(desde) || !esFecha(hasta) || desde > hasta) {
                return res.status(400).json({ error: 'Indica un rango de fechas válido (desde <= hasta).' });
            }
            const data = await PagoModel.obtenerConciliacion(desde, hasta);
            res.json({ success: true, data: { ...data, desde, hasta } });
        } catch (error: any) {
            console.error('Error al conciliar pagos:', error);
            res.status(500).json({ error: error.message || 'No se pudo calcular la conciliación.' });
        }
    },

    registrarReembolso: async (req: Request, res: Response) => {
        try {
            const id_pago = Number(req.params.id_pago);
            const { monto, motivo, referencia_externa } = req.body;
            const montoNumero = Number(monto);
            const motivoLimpio = String(motivo || '').trim();
            if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
                return res.status(400).json({ error: 'Indica un monto de reembolso mayor que cero.' });
            }
            if (motivoLimpio.length < 5 || motivoLimpio.length > 500) {
                return res.status(400).json({ error: 'El motivo debe tener entre 5 y 500 caracteres.' });
            }
            if (String(referencia_externa || '').trim().length > 100) {
                return res.status(400).json({ error: 'La referencia externa no puede superar 100 caracteres.' });
            }
            const pago = await PagoModel.obtenerPorId(id_pago);
            if (!pago) return res.status(404).json({ error: 'Pago no encontrado.' });
            const { id_usuario } = (req as any).usuario;
            const resultado = await PagoModel.registrarReembolso(
                id_pago,
                Number(id_usuario),
                Math.round(montoNumero * 100) / 100,
                motivoLimpio,
                String(referencia_externa || '').trim() || null
            );
            if ('error' in resultado) return res.status(409).json({ error: resultado.error });
            const revision = await PagoModel.obtenerRevisionReserva(pago.id_reserva);
            const estadoNotificacion: 'reembolsado' | 'reembolso_parcial' = resultado.estado;
            try {
                await notificarCambioPago({
                    correo: revision?.reserva?.cliente_correo,
                    nombre: revision?.reserva?.cliente_nombre,
                    id_reserva: pago.id_reserva,
                    monto: pago.monto,
                    monto_reembolsado: resultado.reembolsado,
                    estado: estadoNotificacion
                });
            } catch (error) {
                console.error('No se pudo enviar la notificación de reembolso:', error);
            }
            res.status(201).json({ success: true, message: 'Reembolso registrado. La devolución debe ejecutarse por el canal externo.', data: resultado });
        } catch (error: any) {
            console.error('Error al registrar reembolso:', error);
            res.status(500).json({ error: error.message || 'No se pudo registrar el reembolso.' });
        }
    },

    reintentarPago: async (req: Request, res: Response) => {
        try {
            const { id_reserva } = req.params;
            const { id_usuario } = (req as any).usuario;

            const reserva = await ReservaModel.obtenerPorId(Number(id_reserva));
            if (!reserva || Number(reserva.id_cliente) !== Number(id_usuario)) {
                return res.status(403).json({ error: 'No autorizado' });
            }
            if (reserva.estado === 'cancelada') {
                return res.status(409).json({ error: 'No se puede reintentar el pago de una reserva cancelada.' });
            }

            const pagoExistente = await PagoModel.obtenerPorReserva(Number(id_reserva));
            if (pagoExistente && pagoExistente.estado !== 'rechazado') {
                return res.status(400).json({ error: 'Esta reserva no tiene un pago rechazado' });
            }

            await ReservaModel.actualizarEstado(Number(id_reserva), 'pendiente');

            res.json({
                success: true,
                message: 'Puedes volver a intentar el pago desde tu reserva.'
            });

        } catch (error: any) {
            console.error('Error en reintentarPago:', error);
            res.status(500).json({ error: 'Error al reintentar el pago' });
        }
    }
};
