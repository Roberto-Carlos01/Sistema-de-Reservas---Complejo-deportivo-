import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PagoDemo from './PagoDemo';
import { obtenerAdicionalesReserva } from '../utils/reservaExtras';
import { useAuth } from '../context/AuthContext';
import { descargarComprobantePago } from '../utils/comprobantePago';
import ModalCancelarReserva from '../components/canchas/ModalCancelarReserva';

const MisReservas = () => {
    const [reservas, setReservas] = useState<any[]>([]);
    const [pagosPorReserva, setPagosPorReserva] = useState<Record<number, any>>({});
    const [loading, setLoading] = useState(true);
    const [reservaPago, setReservaPago] = useState<any | null>(null);
    
    // Estados para el modal de cancelación
    const [isCancelarModalOpen, setIsCancelarModalOpen] = useState(false);
    const [reservaACancelar, setReservaACancelar] = useState<any>(null);
    const [cancelando, setCancelando] = useState(false);
    const { usuario } = useAuth();
    
    const navigate = useNavigate();

    const cargarReservas = async () => {
        try {
            const res = await api.get('/reservas/mis-reservas');
            setReservas(res.data.data || []);
            try {
                const respuestaPagos = await api.get('/pagos/historial');
                const pagosRecientes: Record<number, any> = {};
                for (const pago of respuestaPagos.data?.data || []) {
                    if (!pagosRecientes[pago.id_reserva]) pagosRecientes[pago.id_reserva] = pago;
                }
                setPagosPorReserva(pagosRecientes);
            } catch {
                setPagosPorReserva({});
            }
        } catch (error) {
            console.error('Error al cargar reservas', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargarReservas(); }, []);

    // Abre el modal de cancelación (reemplaza al prompt feo)
    const handleAbrirCancelar = (reserva: any) => {
        setReservaACancelar(reserva);
        setIsCancelarModalOpen(true);
    };

    // Confirma la cancelación con el motivo
    const handleConfirmarCancelar = async (motivo: string) => {
        if (!reservaACancelar) return;
        
        setCancelando(true);
        try {
            await api.put(`/reservas/${reservaACancelar.id_reserva}/cancelar`, { motivo });
            setIsCancelarModalOpen(false);
            setReservaACancelar(null);
            cargarReservas();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al cancelar la reserva');
        } finally {
            setCancelando(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando reservas...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-claro-texto dark:text-oscuro-texto">Mis Reservas</h1>
                <button onClick={() => navigate('/canchas')}
                    className="px-4 py-2 bg-claro-primario text-white rounded-lg hover:bg-claro-hover">
                    + Nueva Reserva
                </button>
            </div>

            {reservas.length === 0 ? (
                <div className="p-8 text-center text-claro-texto2 border rounded-xl">
                    No tenés reservas todavía. ¡Hacé tu primera reserva!
                </div>
            ) : (
                <div className="overflow-x-auto border rounded-xl border-claro-borde dark:border-oscuro-borde">
                    <table className="w-full text-left">
                        <thead className="bg-claro-tinte dark:bg-oscuro-tinte text-claro-texto dark:text-oscuro-texto">
                            <tr>
                                <th className="p-3">Cancha</th>
                                <th className="p-3">Fecha</th>
                                <th className="p-3">Horario</th>
                                <th className="p-3">Estado</th>
                                <th className="p-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-claro-texto dark:text-oscuro-texto">
    {reservas.map((r) => {
        const pago = pagosPorReserva[r.id_reserva];
        const pagoPendiente = ['pendiente', 'pendiente_verificacion'].includes(pago?.estado);
        const etiquetaEstado = pago?.estado === 'pagado' ? 'Pagado'
            : pago?.estado === 'pendiente_verificacion' ? 'Pendiente de verificación'
                : pago?.estado === 'rechazado' ? 'Pago rechazado'
                    : pago?.estado === 'reembolsado' ? 'Pago reembolsado'
                        : pago?.estado === 'reembolso_parcial' ? 'Reembolso parcial'
                    : r.estado === 'pendiente_pago' ? 'Pendiente de pago' : r.estado;
        const clasePago = pago?.estado === 'pagado' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
            : pagoPendiente ? 'bg-yellow-100 text-yellow-800 dark:bg-amber-950/40 dark:text-amber-300'
                : ['reembolsado', 'reembolso_parcial'].includes(pago?.estado) ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                : pago?.estado === 'rechazado' || r.estado === 'cancelada' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                    : r.estado === 'confirmada' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-amber-950/40 dark:text-amber-300';
        return (
        <tr key={r.id_reserva} className="border-t border-claro-borde dark:border-oscuro-borde">
            <td className="p-3" data-label="Cancha">{r.cancha_nombre}</td>
            <td className="p-3" data-label="Fecha">{new Date(r.fecha_reserva).toLocaleDateString()}</td>
            <td className="p-3" data-label="Horario">{r.hora_inicio} - {r.hora_fin}</td>
            <td className="p-3" data-label="Estado">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${clasePago}`}>
                    {etiquetaEstado}
                </span>
                {pago?.estado === 'rechazado' && pago.motivo_rechazo && <span className="mt-1 block max-w-xs text-xs text-red-700 dark:text-red-300">Motivo: {pago.motivo_rechazo}</span>}
                {Number(pago?.monto_reembolsado || 0) > 0 && <span className="mt-1 block text-xs text-blue-700 dark:text-blue-300">Reembolsado: Bs. {Number(pago.monto_reembolsado).toFixed(2)}</span>}
            </td>
            <td className="p-3" data-label="Acciones">
                <div className="flex gap-3 flex-wrap">
                    {/* ✅ BOTÓN DE PAGAR - Se mantiene tal cual lo puso el grupo de pagos */}
                    {r.estado !== 'cancelada' && pago?.estado !== 'pagado' && (
                        <button
                            type="button"
                            disabled={pagoPendiente}
                            onClick={() => setReservaPago({ ...r, detallesIniciales: obtenerAdicionalesReserva(r.id_reserva) })}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {pagoPendiente ? 'En verificación' : pago?.estado === 'rechazado' ? 'Corregir pago' : 'Pagar reserva'}
                        </button>
                    )}

                    {pago?.estado === 'pagado' && (
                        <button
                            type="button"
                            onClick={() => descargarComprobantePago(r, pago, usuario)}
                            className="px-3 py-1.5 rounded-lg border border-claro-borde text-claro-texto text-sm font-medium transition-colors hover:bg-claro-tinte dark:border-oscuro-borde dark:text-oscuro-texto dark:hover:bg-oscuro-tinte"
                        >
                            Descargar comprobante
                        </button>
                    )}

                    {/* ✅ Botón CANCELAR - Ahora abre el modal bonito */}
                    {r.estado !== 'cancelada' && r.estado !== 'pagada' && (
                        <button
                            onClick={() => handleAbrirCancelar(r)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                        >
                            ✕ Cancelar
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );})}
</tbody>
                    </table>
                </div>
            )}

            {/* Modal de pago (del grupo de pagos) - NO TOCAR */}
            {reservaPago && (
                <PagoDemo
                    reserva={reservaPago}
                    onClose={() => setReservaPago(null)}
                    onComplete={cargarReservas}
                />
            )}

            {/* ✅ Modal de cancelación bonito (NUEVO) */}
            <ModalCancelarReserva
                isOpen={isCancelarModalOpen}
                onClose={() => {
                    setIsCancelarModalOpen(false);
                    setReservaACancelar(null);
                }}
                onConfirm={handleConfirmarCancelar}
                reserva={reservaACancelar}
                cargando={cancelando}
            />
        </div>
    );
};

export default MisReservas;