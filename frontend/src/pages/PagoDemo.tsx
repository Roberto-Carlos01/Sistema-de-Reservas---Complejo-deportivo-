import { useEffect, useMemo, useState } from 'react';
import { crearPago, obtenerPagosReserva, reintentarPago, type PagoDetalle } from '../services/pago.api';

interface ReservaPago {
    id_reserva: number;
    cancha_nombre: string;
    fecha_reserva: string;
    hora_inicio: string;
    hora_fin: string;
    precio_hora: number | string;
    detallesIniciales?: PagoDetalle[];
}

interface PagoDemoProps {
    reserva: ReservaPago;
    onClose: () => void;
    onComplete: () => void;
}

type MetodoPago = 'presencial' | 'qr' | 'tarjeta';

const horasReserva = (inicio: string, fin: string) => {
    const [hi, mi] = inicio.slice(0, 5).split(':').map(Number);
    const [hf, mf] = fin.slice(0, 5).split(':').map(Number);
    return Math.max(0, (hf * 60 + mf - hi * 60 - mi) / 60);
};

const PagoDemo = ({ reserva, onClose, onComplete }: PagoDemoProps) => {
    const [metodo, setMetodo] = useState<MetodoPago>('qr');
    const [referenciaOperacion, setReferenciaOperacion] = useState('');
    const [comprobante, setComprobante] = useState<File | null>(null);
    const [vistaPreviaComprobante, setVistaPreviaComprobante] = useState('');
    const [historial, setHistorial] = useState<any[]>([]);
    const [cargandoHistorial, setCargandoHistorial] = useState(true);
    const [cargando, setCargando] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    const precioReserva = useMemo(
        () => Number(reserva.precio_hora) * horasReserva(reserva.hora_inicio, reserva.hora_fin),
        [reserva.precio_hora, reserva.hora_inicio, reserva.hora_fin]
    );
    const detalles = reserva.detallesIniciales || [];
    const subtotalAdicionales = detalles.reduce((suma, detalle) => suma + Number(detalle.subtotal), 0);
    const total = Math.round((precioReserva + subtotalAdicionales + Number.EPSILON) * 100) / 100;
    const pagoActual = historial[0];
    const pagoPendiente = ['pendiente', 'pendiente_verificacion'].includes(pagoActual?.estado);
    const pagoPagado = pagoActual?.estado === 'pagado';
    const requiereComprobante = metodo !== 'presencial';

    const cargarHistorial = async () => {
        setCargandoHistorial(true);
        try {
            setHistorial(await obtenerPagosReserva(reserva.id_reserva));
        } catch {
            setHistorial([]);
        } finally {
            setCargandoHistorial(false);
        }
    };

    useEffect(() => { cargarHistorial(); }, [reserva.id_reserva]);

    useEffect(() => {
        if (!comprobante) {
            setVistaPreviaComprobante('');
            return;
        }
        const url = URL.createObjectURL(comprobante);
        setVistaPreviaComprobante(url);
        return () => URL.revokeObjectURL(url);
    }, [comprobante]);

    const enviarPago = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setMensaje('');
        if (requiereComprobante && !comprobante) {
            setError('Adjunta el comprobante de pago para enviarlo a revisión.');
            return;
        }
        if (requiereComprobante && !referenciaOperacion.trim()) {
            setError('Ingresa el número de operación que aparece en el comprobante.');
            return;
        }

        setCargando(true);
        try {
            if (pagoActual?.estado === 'rechazado') await reintentarPago(reserva.id_reserva);
            const respuesta = await crearPago({
                id_reserva: reserva.id_reserva,
                monto: total,
                metodo_pago: metodo,
                referencia_pasarela: `RES-${reserva.id_reserva}`,
                nro_comprobante: referenciaOperacion.trim(),
                comprobante: comprobante || undefined,
                detalles
            });
            setMensaje(metodo === 'presencial'
                ? 'Pago presencial registrado y reserva confirmada.'
                : 'Comprobante recibido. La reserva queda pendiente hasta la revisión del personal.');
            setComprobante(null);
            setReferenciaOperacion('');
            await cargarHistorial();
            onComplete();
            if (!respuesta?.success) setError('El servidor no confirmó el registro del pago.');
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'No se pudo registrar el pago.');
        } finally {
            setCargando(false);
        }
    };

    const metodos: { valor: MetodoPago; nombre: string }[] = [
        { valor: 'presencial', nombre: 'Físico' },
        { valor: 'qr', nombre: 'QR' },
        { valor: 'tarjeta', nombre: 'Tarjeta' }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <section role="dialog" aria-modal="true" aria-labelledby="pago-titulo" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-claro-borde bg-claro-tarjeta text-claro-texto shadow-2xl dark:border-oscuro-borde dark:bg-oscuro-tarjeta dark:text-oscuro-texto">
                <header className="border-b border-claro-borde p-5 dark:border-oscuro-borde">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 id="pago-titulo" className="text-xl font-bold">Registrar pago</h2>
                            <p className="mt-1 text-sm text-claro-texto2 dark:text-oscuro-texto2">{reserva.cancha_nombre} · {new Date(`${String(reserva.fecha_reserva).slice(0, 10)}T12:00:00`).toLocaleDateString('es-BO')} · {reserva.hora_inicio.slice(0, 5)}–{reserva.hora_fin.slice(0, 5)}</p>
                        </div>
                        <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-md border border-claro-borde px-3 py-1 text-xl leading-none dark:border-oscuro-borde">×</button>
                    </div>
                </header>

                <form onSubmit={enviarPago} className="space-y-5 p-5">
                    {pagoPagado && <p role="status" className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200">Esta reserva ya tiene un pago aprobado.</p>}
                    {pagoPendiente && <p role="status" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Ya hay un pago pendiente de verificación. No lo vuelvas a enviar.</p>}
                    {pagoActual?.estado === 'rechazado' && pagoActual.motivo_rechazo && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">Motivo del rechazo: {pagoActual.motivo_rechazo}. Puedes corregirlo y enviar otro intento.</p>}

                    <fieldset disabled={pagoPagado || pagoPendiente || cargandoHistorial}>
                        <legend className="mb-3 text-sm font-semibold text-claro-texto dark:text-oscuro-texto">Método utilizado</legend>
                        <div className="grid grid-cols-3 gap-2">
                            {metodos.map((opcion) => <label key={opcion.valor} className={`relative flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border p-3 text-center transition-colors focus-within:ring-2 focus-within:ring-claro-primario focus-within:ring-offset-2 dark:focus-within:ring-offset-oscuro-tarjeta ${metodo === opcion.valor ? 'border-claro-primario bg-claro-primario/10 text-claro-primario dark:border-oscuro-primario dark:bg-oscuro-primario/15 dark:text-oscuro-primario' : 'border-claro-borde bg-claro-tarjeta text-claro-texto hover:bg-claro-tinte dark:border-oscuro-borde dark:bg-oscuro-tarjeta dark:text-oscuro-texto dark:hover:bg-oscuro-tinte'}`}>
                                <input type="radio" name="metodo-pago" value={opcion.valor} checked={metodo === opcion.valor} onChange={() => setMetodo(opcion.valor)} className="sr-only" />
                                <span aria-hidden="true" className="text-2xl">{opcion.valor === 'presencial' ? '▣' : opcion.valor === 'qr' ? '▦' : '▤'}</span>
                                <span className="text-sm font-semibold">{opcion.nombre}</span>
                                {metodo === opcion.valor && <span className="absolute right-2 top-2 text-xs font-bold" aria-label="Seleccionado">✓</span>}
                            </label>)}
                        </div>
                    </fieldset>

                    {requiereComprobante && <>
                        <label className="block text-sm font-medium" htmlFor="referencia-operacion">
                            Número de operación del recibo
                            <input id="referencia-operacion" value={referenciaOperacion} onChange={(event) => setReferenciaOperacion(event.target.value)} required maxLength={50} disabled={pagoPagado || pagoPendiente || cargandoHistorial} className="mt-1 w-full rounded-md border border-claro-borde bg-claro-fondo p-3 text-claro-texto placeholder:text-claro-texto2 dark:border-oscuro-borde dark:bg-oscuro-fondo dark:text-oscuro-texto dark:placeholder:text-oscuro-texto2" placeholder="Código que aparece en el comprobante" />
                            <span className="mt-1 block text-xs font-normal text-claro-texto2 dark:text-oscuro-texto2">Referencia interna de reserva: RES-{reserva.id_reserva}</span>
                        </label>
                        <label className="block text-sm font-semibold text-claro-texto dark:text-oscuro-texto" htmlFor="comprobante-pago">
                            Comprobante de pago
                            <span className="mt-1 block text-xs font-normal text-claro-texto2 dark:text-oscuro-texto2">JPG, PNG, WEBP o PDF · máximo 5 MB</span>
                            <span className="mt-2 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-claro-borde bg-claro-fondo px-4 py-4 text-center hover:border-claro-primario dark:border-oscuro-borde dark:bg-oscuro-fondo dark:hover:border-oscuro-primario">
                                <span aria-hidden="true" className="text-2xl text-claro-primario dark:text-oscuro-primario">↑</span>
                                <span className="mt-1 text-sm font-medium text-claro-texto dark:text-oscuro-texto">{comprobante ? comprobante.name : 'Selecciona el archivo del recibo'}</span>
                                <span className="mt-1 text-xs font-normal text-claro-texto2 dark:text-oscuro-texto2">{comprobante ? `${(comprobante.size / 1024 / 1024).toFixed(2)} MB` : 'Busca una imagen o PDF en tu dispositivo'}</span>
                            </span>
                            <input id="comprobante-pago" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required disabled={pagoPagado || pagoPendiente || cargandoHistorial} onChange={(event) => {
                                const archivo = event.target.files?.[0] || null;
                                setError('');
                                if (archivo && archivo.size > 5 * 1024 * 1024) {
                                    setComprobante(null);
                                    setError('El archivo no debe superar 5 MB.');
                                    event.target.value = '';
                                    return;
                                }
                                if (archivo && !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(archivo.type)) {
                                    setComprobante(null);
                                    setError('Solo se aceptan imágenes JPG, PNG, WEBP o PDF.');
                                    event.target.value = '';
                                    return;
                                }
                                setComprobante(archivo);
                            }} className="sr-only" />
                        </label>
                        {comprobante && <div className="rounded-md border border-claro-borde p-3 dark:border-oscuro-borde">
                            <p className="mb-2 text-xs font-semibold text-claro-texto2 dark:text-oscuro-texto2">Vista previa del comprobante</p>
                            {comprobante.type.startsWith('image/')
                                ? <img src={vistaPreviaComprobante} alt="Vista previa del comprobante seleccionado" className="max-h-64 w-full rounded object-contain" />
                                : <a href={vistaPreviaComprobante} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-claro-primario underline dark:text-oscuro-primario">Abrir PDF seleccionado</a>}
                        </div>}
                        {metodo === 'tarjeta'
                            ? <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">El pago con tarjeta se realiza fuera de la aplicación. No ingreses los datos de tu tarjeta aquí; adjunta el comprobante para revisión manual.</p>
                            : <p className="rounded-md border border-claro-borde bg-claro-tarjeta p-3 text-sm text-claro-texto2 dark:border-oscuro-borde dark:bg-oscuro-tarjeta dark:text-oscuro-texto2">Realiza el pago desde el canal externo correspondiente y adjunta el recibo emitido por el banco. El personal confirmará el abono manualmente.</p>}
                    </>}
                    {!requiereComprobante && <p className="rounded-md border border-claro-borde bg-claro-tarjeta p-3 text-sm text-claro-texto2 dark:border-oscuro-borde dark:bg-oscuro-tarjeta dark:text-oscuro-texto2">El personal registrará el pago presencial y confirmará la reserva.</p>}

                    <section className="overflow-hidden rounded-md border border-claro-borde bg-claro-fondo dark:border-oscuro-borde dark:bg-oscuro-fondo">
                        <div className="border-b border-claro-borde px-4 py-3 dark:border-oscuro-borde">
                            <h3 className="text-sm font-bold text-claro-texto dark:text-oscuro-texto">Detalle del importe</h3>
                            <p className="mt-1 text-xs text-claro-texto2 dark:text-oscuro-texto2">{reserva.cancha_nombre} · {horasReserva(reserva.hora_inicio, reserva.hora_fin)} h</p>
                        </div>
                        <div className="space-y-3 px-4 py-4 text-sm text-claro-texto dark:text-oscuro-texto">
                            <div className="flex items-start justify-between gap-4"><span>Uso de cancha</span><span className="shrink-0 font-medium">Bs. {precioReserva.toFixed(2)}</span></div>
                            {detalles.map((detalle) => <div key={detalle.nombre} className="flex items-start justify-between gap-4"><span>{detalle.cantidad} × {detalle.nombre}</span><span className="shrink-0 font-medium">Bs. {Number(detalle.subtotal).toFixed(2)}</span></div>)}
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t border-claro-borde bg-claro-primario/5 px-4 py-4 dark:border-oscuro-borde dark:bg-oscuro-primario/10">
                            <span className="font-bold text-claro-texto dark:text-oscuro-texto">Total a pagar</span>
                            <span className="text-2xl font-bold text-claro-primario dark:text-oscuro-primario">Bs. {total.toFixed(2)}</span>
                        </div>
                        <p className="px-4 pb-3 text-xs text-claro-texto2 dark:text-oscuro-texto2">El servidor recalcula el importe con la tarifa y los adicionales permitidos.</p>
                    </section>

                    {error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
                    {mensaje && <p role="status" className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200">{mensaje}</p>}
                    <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
                        <button type="button" onClick={onClose} className="rounded-md border border-claro-borde px-4 py-2 text-sm font-semibold dark:border-oscuro-borde">Cerrar</button>
                        <button type="submit" disabled={cargando || cargandoHistorial || pagoPendiente || pagoPagado} className="rounded-md bg-claro-primario px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{cargando ? 'Enviando…' : pagoPendiente ? 'Pendiente de revisión' : pagoPagado ? 'Pago aprobado' : metodo === 'presencial' ? `Registrar pago · Bs. ${total.toFixed(2)}` : `Enviar comprobante · Bs. ${total.toFixed(2)}`}</button>
                    </div>
                </form>

                <section className="border-t border-claro-borde p-5 dark:border-oscuro-borde">
                    <h3 className="font-semibold">Historial de intentos</h3>
                    {cargandoHistorial ? <p className="mt-2 text-sm text-claro-texto2 dark:text-oscuro-texto2">Cargando historial…</p>
                        : historial.length === 0 ? <p className="mt-2 text-sm text-claro-texto2 dark:text-oscuro-texto2">Todavía no hay intentos de pago.</p>
                            : <div className="mt-2 divide-y divide-claro-borde dark:divide-oscuro-borde">{historial.map((pago) => <div key={pago.id_pago} className="flex flex-wrap justify-between gap-2 py-2 text-sm text-claro-texto dark:text-oscuro-texto"><span>#{pago.id_pago} · {pago.metodo_pago} · Bs. {Number(pago.monto).toFixed(2)}</span><span className={pago.estado === 'pagado' ? 'text-green-700 dark:text-green-300' : pago.estado === 'rechazado' ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}>{String(pago.estado).replace(/_/g, ' ')}</span>{pago.motivo_rechazo && <p className="w-full text-xs text-red-700 dark:text-red-300">Motivo: {pago.motivo_rechazo}</p>}</div>)}</div>}
                </section>
            </section>
        </div>
    );
};

export default PagoDemo;