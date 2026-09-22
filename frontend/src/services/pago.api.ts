import api from './api';

export interface PagoDetalle {
    nombre: string;
    tipo: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
}

export interface CrearPagoInput {
    id_reserva: number;
    monto: number;
    metodo_pago: 'tarjeta' | 'qr' | 'transferencia';
    numero_tarjeta?: string;
    referencia_pasarela?: string;
    detalles: PagoDetalle[];
}

export const crearPago = async (data: CrearPagoInput) => {
    const metodoPago = data.metodo_pago === 'tarjeta'
        ? 'tarjeta_debito'
        : data.metodo_pago;
    const response = await api.post('/pagos/procesar', {
        id_reserva: data.id_reserva,
        metodo_pago: metodoPago,
        referencia_pasarela: data.referencia_pasarela,
        modo_demo: true
    });
    return response.data;
};

export const obtenerPagosReserva = async (idReserva: number) => {
    const response = await api.get(`/pagos/reserva/${idReserva}`);
    return response.data.data || [];
};
