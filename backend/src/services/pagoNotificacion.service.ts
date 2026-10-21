import nodemailer from 'nodemailer';

interface AvisoPago {
    correo?: string | null;
    nombre?: string | null;
    id_reserva: number;
    monto: number | string;
    estado: 'pagado' | 'rechazado' | 'reembolsado' | 'reembolso_parcial';
    motivo?: string | null;
    monto_reembolsado?: number | string;
}

export const notificarCambioPago = async (aviso: AvisoPago) => {
    if (!aviso.correo || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.info('Notificación de pago omitida: destinatario o SMTP no configurado.');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    const mensajes = {
        pagado: {
            asunto: `Pago aprobado · Reserva RES-${aviso.id_reserva}`,
            texto: `Hola ${aviso.nombre || 'cliente'}, tu pago de Bs. ${Number(aviso.monto).toFixed(2)} fue aprobado. La reserva RES-${aviso.id_reserva} está confirmada.`
        },
        rechazado: {
            asunto: `Revisión de pago · Reserva RES-${aviso.id_reserva}`,
            texto: `Hola ${aviso.nombre || 'cliente'}, no pudimos validar el pago de la reserva RES-${aviso.id_reserva}. Motivo: ${aviso.motivo || 'Contacta al complejo para más información.'} Puedes corregirlo desde Mis Reservas.`
        },
        reembolsado: {
            asunto: `Reembolso registrado · Reserva RES-${aviso.id_reserva}`,
            texto: `Se registró un reembolso total de Bs. ${Number(aviso.monto_reembolsado || aviso.monto).toFixed(2)} para la reserva RES-${aviso.id_reserva}. La devolución se procesa fuera de esta aplicación.`
        },
        reembolso_parcial: {
            asunto: `Reembolso parcial registrado · Reserva RES-${aviso.id_reserva}`,
            texto: `Se registró un reembolso parcial de Bs. ${Number(aviso.monto_reembolsado || 0).toFixed(2)} para la reserva RES-${aviso.id_reserva}. La devolución se procesa fuera de esta aplicación.`
        }
    }[aviso.estado];

    await transporter.sendMail({
        from: `Complejo Deportivo <${process.env.EMAIL_USER}>`,
        to: aviso.correo,
        subject: mensajes.asunto,
        text: mensajes.texto
    });
};
