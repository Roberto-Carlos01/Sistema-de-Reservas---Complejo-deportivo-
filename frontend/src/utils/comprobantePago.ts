import jsPDF from 'jspdf';

interface ReservaComprobante {
    id_reserva: number;
    cancha_nombre?: string;
    cancha?: string;
    fecha_reserva: string;
    hora_inicio: string;
    hora_fin: string;
}

interface PagoComprobante {
    id_pago: number;
    monto: string | number;
    metodo_pago: string;
    estado: string;
    fecha_pago?: string;
    referencia_pasarela?: string | null;
    nro_comprobante?: string | null;
}

interface ClienteComprobante {
    nombre?: string;
    apellido_paterno?: string;
    apellido_materno?: string;
    correo?: string;
}

const formatearFecha = (valor: string | undefined, conHora = false) => {
    if (!valor) return 'No disponible';
    const soloFecha = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const fecha = soloFecha
        ? new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]))
        : new Date(valor);
    if (Number.isNaN(fecha.getTime())) return 'No disponible';
    return fecha.toLocaleString('es-BO', conHora
        ? { dateStyle: 'medium', timeStyle: 'short' }
        : { dateStyle: 'long' });
};

const formatearMetodo = (metodo: string) => {
    const valor = metodo.toLowerCase().replace(/_/g, ' ');
    if (['presencial', 'fisico', 'efectivo'].includes(valor)) return 'Fisico';
    if (valor.startsWith('tarjeta')) return 'Tarjeta';
    if (valor === 'qr') return 'QR';
    return valor.replace(/\b[a-z]/g, (letra) => letra.toUpperCase());
};

export const descargarComprobantePago = (
    reserva: ReservaComprobante,
    pago: PagoComprobante,
    cliente: ClienteComprobante | null
) => {
    if (pago.estado !== 'pagado') return;

    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const anchoPagina = pdf.internal.pageSize.getWidth();
    const altoPagina = pdf.internal.pageSize.getHeight();
    const margen = 16;
    const ancho = anchoPagina - margen * 2;
    const nombreCliente = [cliente?.nombre, cliente?.apellido_paterno, cliente?.apellido_materno].filter(Boolean).join(' ') || 'Cliente';

    pdf.setFillColor(23, 63, 48);
    pdf.rect(0, 0, anchoPagina, 48, 'F');
    pdf.setFillColor(25, 150, 125);
    pdf.rect(0, 46, anchoPagina, 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('COMPLEJO DEPORTIVO', margen, 15);
    pdf.setFontSize(20);
    pdf.text('Comprobante de pago', margen, 27);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(221, 237, 230);
    pdf.text('Registro interno de pago verificado', margen, 36);

    pdf.setFillColor(225, 247, 235);
    pdf.roundedRect(anchoPagina - margen - 38, 14, 38, 10, 5, 5, 'F');
    pdf.setTextColor(24, 105, 68);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('APROBADO', anchoPagina - margen - 19, 20.5, { align: 'center' });

    pdf.setTextColor(103, 119, 111);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('TOTAL PAGADO', margen, 62);
    pdf.setTextColor(23, 63, 48);
    pdf.setFontSize(25);
    pdf.text(`Bs. ${Number(pago.monto).toFixed(2)}`, margen, 73);

    const codigoX = anchoPagina - margen - 53;
    pdf.setFillColor(244, 247, 245);
    pdf.roundedRect(codigoX, 56, 53, 23, 2, 2, 'F');
    pdf.setTextColor(103, 119, 111);
    pdf.setFontSize(7);
    pdf.text('N.º COMPROBANTE', codigoX + 4, 64);
    pdf.setTextColor(35, 57, 47);
    pdf.setFontSize(11);
    pdf.text(`PAG-${pago.id_pago}`, codigoX + 4, 73);

    let y = 94;
    pdf.setDrawColor(218, 226, 221);
    pdf.line(margen, y, anchoPagina - margen, y);
    y += 10;

    const encabezadoSeccion = (titulo: string) => {
        pdf.setTextColor(23, 63, 48);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text(titulo, margen, y);
        y += 7;
    };

    const fila = (etiqueta: string, valor: string, indice: number) => {
        const altoFila = 12;
        if (indice % 2 === 0) {
            pdf.setFillColor(247, 249, 248);
            pdf.roundedRect(margen, y - 4, ancho, altoFila, 1.5, 1.5, 'F');
        }
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(105, 117, 111);
        pdf.text(etiqueta, margen + 4, y + 2);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(37, 50, 43);
        const lineas = pdf.splitTextToSize(valor || 'No registrado', ancho - 70);
        pdf.text(lineas, margen + 66, y + 2);
        y += Math.max(altoFila, lineas.length * 4.5);
    };

    encabezadoSeccion('Datos del cliente');
    fila('Nombre', nombreCliente, 0);
    fila('Correo electronico', cliente?.correo || 'No registrado', 1);
    y += 5;

    encabezadoSeccion('Detalle de la reserva');
    fila('Codigo de reserva', `RES-${reserva.id_reserva}`, 0);
    fila('Cancha', reserva.cancha_nombre || reserva.cancha || 'Cancha', 1);
    fila('Fecha', formatearFecha(reserva.fecha_reserva), 2);
    fila('Horario', `${String(reserva.hora_inicio).slice(0, 5)} - ${String(reserva.hora_fin).slice(0, 5)}`, 3);
    y += 5;

    encabezadoSeccion('Datos del pago');
    fila('Metodo utilizado', formatearMetodo(pago.metodo_pago), 0);
    fila('Numero de operacion', pago.nro_comprobante || 'No indicado', 1);
    fila('Referencia interna', pago.referencia_pasarela || `RES-${reserva.id_reserva}`, 2);
    fila('Fecha de aprobacion', formatearFecha(pago.fecha_pago, true), 3);

    const pieY = altoPagina - 34;
    pdf.setDrawColor(218, 226, 221);
    pdf.line(margen, pieY, anchoPagina - margen, pieY);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(95, 109, 101);
    pdf.text(
        pdf.splitTextToSize('Este documento acredita el registro de un pago aprobado en el sistema. No es factura fiscal ni sustituye el recibo emitido por el banco o proveedor de pago.', ancho),
        margen,
        pieY + 6
    );
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(23, 63, 48);
    pdf.text('COMPLEJO DEPORTIVO · GESTION DE RESERVAS', margen, altoPagina - 12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(103, 119, 111);
    pdf.text(`PAG-${pago.id_pago}`, anchoPagina - margen, altoPagina - 12, { align: 'right' });

    pdf.save(`comprobante-PAG-${pago.id_pago}-RES-${reserva.id_reserva}.pdf`);
};
