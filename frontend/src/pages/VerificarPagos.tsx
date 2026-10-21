import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { API_ORIGIN } from '../services/api';

interface PagoPendiente {
    id_pago: number;
    id_reserva: number;
    monto: string;
    metodo_pago: string;
    estado: string;
    fecha_pago: string;
    comprobante_url: string | null;
    referencia_pasarela: string | null;
    nro_comprobante: string | null;
    motivo_rechazo?: string | null;
    nombre: string;
    apellido_paterno: string;
    correo: string;
    cancha_nombre: string;
    fecha_reserva: string;
    hora_inicio: string;
    hora_fin: string;
    id_cliente?: number | null;
    canal_reserva?: string;
    observaciones?: string | null;
    detalle_adicionales?: Array<{ nombre: string; cantidad?: number; subtotal?: number }> | string;
    monto_reembolsado?: number | string;
}

const VerificarPagos = () => {
    const { usuario, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [pagos, setPagos] = useState<PagoPendiente[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [pagoSeleccionado, setPagoSeleccionado] = useState<PagoPendiente | null>(null);
    const [pagoARechazar, setPagoARechazar] = useState<PagoPendiente | null>(null);
    const [motivoRechazo, setMotivoRechazo] = useState('');
    const [procesandoId, setProcesandoId] = useState<number | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [metodoFiltro, setMetodoFiltro] = useState('todos');
    const [estadoFiltro, setEstadoFiltro] = useState('todos');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [revisionAbierta, setRevisionAbierta] = useState(false);
    const [revisionCargando, setRevisionCargando] = useState(false);
    const [revisionDetalle, setRevisionDetalle] = useState<any>(null);
    const [pagoAReembolsar, setPagoAReembolsar] = useState<PagoPendiente | null>(null);
    const [montoReembolso, setMontoReembolso] = useState('');
    const [motivoReembolso, setMotivoReembolso] = useState('');
    const [referenciaReembolso, setReferenciaReembolso] = useState('');
    const [guardandoReembolso, setGuardandoReembolso] = useState(false);
    const [conciliacion, setConciliacion] = useState<{ movimientos: any[]; ingresos: number; reembolsos: number; neto: number }>({ movimientos: [], ingresos: 0, reembolsos: 0, neto: 0 });
    const rolActual = usuario?.rol?.trim().toLowerCase();
    const isAdmin = rolActual === 'admin' || rolActual === 'administrador';
    const esEmpleadoActual = rolActual === 'empleado';

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        if (!isAdmin && !esEmpleadoActual) {
            navigate('/dashboard');
            return;
        }

        cargarPagosPendientes();
    }, [isAuthenticated, usuario, navigate]);

    useEffect(() => {
        if (!isAuthenticated || (!isAdmin && !esEmpleadoActual)) return;
        api.get('/pagos/conciliacion', { params: { desde: fechaDesde || undefined, hasta: fechaHasta || undefined } })
            .then((response) => setConciliacion(response.data?.data || { movimientos: [], ingresos: 0, reembolsos: 0, neto: 0 }))
            .catch((err) => setError(err.response?.data?.error || 'No se pudo cargar la conciliación.'));
    }, [isAuthenticated, isAdmin, esEmpleadoActual, fechaDesde, fechaHasta]);

    const cargarPagosPendientes = async () => {
        setCargando(true);
        try {
            const res = await api.get('/pagos/todos');
            setPagos(res.data?.data || res.data || []);
        } catch (err: any) {
            console.error('Error al cargar pagos:', err);
            setError('Error al cargar los pagos pendientes');
        } finally {
            setCargando(false);
        }
    };

    const handleVerificar = async (id_pago: number, estado: 'pagado' | 'rechazado', motivo?: string) => {
        setProcesandoId(id_pago);
        try {
            await api.patch(`/pagos/verificar/${id_pago}`, { estado, motivo_rechazo: motivo });
            setMensaje(estado === 'pagado' ? 'Pago aprobado y reserva confirmada' : 'Pago rechazado');
            setPagos(prev => prev.filter(p => p.id_pago !== id_pago));
            setPagoARechazar(null);
            setMotivoRechazo('');
            setTimeout(() => setMensaje(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al verificar el pago');
            setTimeout(() => setError(''), 3000);
        } finally {
            setProcesandoId(null);
        }
    };

    const verComprobante = (pago: PagoPendiente) => {
        setPagoSeleccionado(pago);
        setModalOpen(true);
    };

    const getMetodoLabel = (metodo: string) => {
        const labels: Record<string, string> = {
            presencial: 'Físico',
            efectivo: 'Físico',
            fisico: 'Físico',
            tarjeta: 'Tarjeta',
            tarjeta_debito: 'Tarjeta',
            tarjeta_credito: 'Tarjeta',
            qr: 'QR',
            transferencia: 'Transferencia (legado)'
        };
        return labels[metodo] || metodo;
    };

    const normalizarMetodo = (metodo: string) => {
        if (['presencial', 'efectivo', 'fisico'].includes(metodo)) return 'fisico';
        if (['tarjeta', 'tarjeta_debito', 'tarjeta_credito'].includes(metodo)) return 'tarjeta';
        return metodo;
    };

    const normalizarEstado = (estado: string) => {
        if (['pendiente', 'pendiente_verificacion'].includes(estado)) return 'pendiente';
        if (['pagado', 'rechazado', 'reembolsado', 'reembolso_parcial'].includes(estado)) return estado;
        if (['sin_reembolso', 'reembolso_pendiente', 'reembolso_rechazado'].includes(estado)) return 'reembolsado';
        return 'legado';
    };

    const abrirRevision = async (pago: PagoPendiente) => {
        setRevisionAbierta(true);
        setRevisionCargando(true);
        setRevisionDetalle(null);
        try {
            const response = await api.get(`/pagos/reserva/${pago.id_reserva}/revision`);
            setRevisionDetalle(response.data?.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'No se pudo cargar el detalle de la reserva.');
            setRevisionAbierta(false);
        } finally {
            setRevisionCargando(false);
        }
    };

    const montoReembolsable = (pago: PagoPendiente) => Math.max(0, Number(pago.monto) - Number(pago.monto_reembolsado || 0));

    const registrarReembolso = async () => {
        if (!pagoAReembolsar) return;
        setGuardandoReembolso(true);
        try {
            await api.post(`/pagos/reembolso/${pagoAReembolsar.id_pago}`, {
                monto: Number(montoReembolso),
                motivo: motivoReembolso.trim(),
                referencia_externa: referenciaReembolso.trim() || undefined
            });
            setMensaje('Reembolso registrado. Recuerda ejecutar la devolución por el canal externo.');
            setPagoAReembolsar(null);
            setMotivoReembolso('');
            setReferenciaReembolso('');
            setTimeout(() => setMensaje(''), 5000);
            await cargarPagosPendientes();
        } catch (err: any) {
            setError(err.response?.data?.error || 'No se pudo registrar el reembolso.');
        } finally {
            setGuardandoReembolso(false);
        }
    };

    const pagosFiltrados = pagos.filter((pago) => {
        const termino = busqueda.trim().toLocaleLowerCase('es');
        const cumpleBusqueda = !termino || [
            pago.nombre,
            pago.apellido_paterno,
            pago.correo,
            pago.cancha_nombre,
            String(pago.id_reserva),
            pago.referencia_pasarela || '',
            pago.nro_comprobante || ''
        ].some((valor) => valor.toLocaleLowerCase('es').includes(termino));
        const cumpleMetodo = metodoFiltro === 'todos' || normalizarMetodo(pago.metodo_pago) === metodoFiltro;
        const cumpleEstado = estadoFiltro === 'todos' || normalizarEstado(pago.estado) === estadoFiltro;
        const fechaPago = (pago.fecha_pago || pago.fecha_reserva || '').slice(0, 10);
        const cumpleDesde = !fechaDesde || fechaPago >= fechaDesde;
        const cumpleHasta = !fechaHasta || fechaPago <= fechaHasta;
        return cumpleBusqueda && cumpleMetodo && cumpleEstado && cumpleDesde && cumpleHasta;
    });

    const exportarConciliacion = () => {
        const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const filas = [
            ['Fecha movimiento', 'Tipo', 'Pago', 'Reserva', 'Cliente', 'Cancha', 'Método', 'Referencia', 'Estado', 'Monto Bs', 'Motivo'],
            ...conciliacion.movimientos.map((movimiento) => [
                movimiento.fecha_movimiento, movimiento.tipo_movimiento, movimiento.id_pago,
                `RES-${movimiento.id_reserva}`, movimiento.cliente, movimiento.cancha,
                getMetodoLabel(movimiento.metodo_pago), movimiento.referencia, movimiento.estado,
                Number(movimiento.monto).toFixed(2), movimiento.motivo
            ])
        ];
        const csv = `\uFEFF${filas.map((fila) => fila.map(quote).join(',')).join('\r\n')}`;
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `conciliacion-pagos-${fechaDesde || 'inicio'}-${fechaHasta || 'hoy'}.csv`;
        enlace.click();
        URL.revokeObjectURL(url);
    };

    const totalPagado = pagos.filter((pago) => ['pagado', 'reembolso_parcial', 'reembolsado'].includes(pago.estado))
        .reduce((total, pago) => total + Number(pago.monto || 0), 0);
    const pendientes = pagos.filter((pago) => normalizarEstado(pago.estado) === 'pendiente').length;
    const aprobados = pagos.filter((pago) => ['pagado', 'reembolso_parcial', 'reembolsado'].includes(pago.estado)).length;
    const rechazados = pagos.filter((pago) => pago.estado === 'rechazado').length;

    const limpiarFiltros = () => {
        setBusqueda('');
        setMetodoFiltro('todos');
        setEstadoFiltro('todos');
        setFechaDesde('');
        setFechaHasta('');
    };

    if (cargando) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-claro-primario border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-claro-texto2">Cargando pagos pendientes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-claro-fondo dark:bg-oscuro-fondo p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-claro-texto dark:text-oscuro-texto mb-2">
                        Pagos y comprobantes
                    </h1>
                    <p className="text-claro-texto2 dark:text-oscuro-texto2">
                        {isAdmin ? 'Historial de pagos y revisión de comprobantes' : 'Revisa comprobantes pendientes de los clientes'}
                    </p>
                </div>

                {mensaje && (
                    <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 font-medium text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
                        {mensaje}
                    </div>
                )}

                {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                        {error}
                    </div>
                )}

                <section className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-claro-borde bg-claro-tarjeta p-4 dark:border-oscuro-borde dark:bg-oscuro-tarjeta sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_145px_145px_155px_155px_auto]" aria-label="Filtros de pagos">
                    <label className="text-sm font-medium text-claro-texto dark:text-oscuro-texto">
                        Buscar cliente, cancha u operación
                        <input
                            type="search"
                            value={busqueda}
                            onChange={(event) => setBusqueda(event.target.value)}
                            placeholder="Nombre, correo, RES o número de operación"
                            className="mt-1 block w-full rounded-md border border-claro-borde bg-claro-fondo px-3 py-2 text-sm text-claro-texto placeholder:text-claro-texto2 dark:border-oscuro-borde dark:bg-oscuro-fondo dark:text-oscuro-texto dark:placeholder:text-oscuro-texto2"
                        />
                    </label>
                    <label className="text-sm font-medium text-claro-texto dark:text-oscuro-texto">
                        Método de pago
                        <select value={metodoFiltro} onChange={(event) => setMetodoFiltro(event.target.value)} className="mt-1 block w-full rounded-md border border-claro-borde bg-claro-fondo px-3 py-2 text-sm text-claro-texto dark:border-oscuro-borde dark:bg-oscuro-fondo dark:text-oscuro-texto dark:[color-scheme:dark]">
                            <option value="todos">Todos los métodos</option>
                            <option value="fisico">Físico</option>
                            <option value="tarjeta">Tarjeta</option>
                            <option value="qr">QR</option>
                        </select>
                    </label>
                    <label className="text-sm font-medium text-claro-texto dark:text-oscuro-texto">
                        Estado
                        <select value={estadoFiltro} onChange={(event) => setEstadoFiltro(event.target.value)} className="mt-1 block w-full rounded-md border border-claro-borde bg-claro-fondo px-3 py-2 text-sm text-claro-texto dark:border-oscuro-borde dark:bg-oscuro-fondo dark:text-oscuro-texto dark:[color-scheme:dark]">
                            <option value="todos">Todos</option>
                            <option value="pendiente">Pendiente</option>
                            <option value="pagado">Aprobado</option>
                            <option value="rechazado">Rechazado</option>
                            <option value="reembolsado">Reembolso</option>
                            <option value="reembolso_parcial">Reembolso parcial</option>
                        </select>
                    </label>
                    <label className="text-sm font-medium text-claro-texto dark:text-oscuro-texto">
                        Desde
                        <input type="date" value={fechaDesde} onChange={(event) => setFechaDesde(event.target.value)} className="mt-1 block w-full rounded-md border border-claro-borde bg-claro-fondo px-3 py-2 text-sm text-claro-texto dark:border-oscuro-borde dark:bg-oscuro-fondo dark:text-oscuro-texto dark:[color-scheme:dark]" />
                    </label>
                    <label className="text-sm font-medium text-claro-texto dark:text-oscuro-texto">
                        Hasta
                        <input type="date" value={fechaHasta} onChange={(event) => setFechaHasta(event.target.value)} className="mt-1 block w-full rounded-md border border-claro-borde bg-claro-fondo px-3 py-2 text-sm text-claro-texto dark:border-oscuro-borde dark:bg-oscuro-fondo dark:text-oscuro-texto dark:[color-scheme:dark]" />
                    </label>
                    <div className="flex items-end justify-between gap-3 xl:flex-col xl:items-stretch xl:justify-end">
                        <span className="pb-2 text-xs text-claro-texto2 dark:text-oscuro-texto2">{pagosFiltrados.length} de {pagos.length} pagos</span>
                        <button type="button" onClick={limpiarFiltros} className="rounded-md border border-claro-borde px-3 py-2 text-sm font-medium text-claro-texto hover:bg-claro-tinte dark:border-oscuro-borde dark:text-oscuro-texto dark:hover:bg-oscuro-tinte">Limpiar filtros</button>
                    </div>
                </section>

                <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen de pagos existentes">
                    <div className="border-l-2 border-claro-primario bg-claro-tarjeta px-4 py-3 dark:border-oscuro-primario dark:bg-oscuro-tarjeta"><p className="text-xs text-claro-texto2 dark:text-oscuro-texto2">Historial existente</p><p className="mt-1 text-xl font-bold text-claro-texto dark:text-oscuro-texto">{pagos.length}</p></div>
                    <div className="border-l-2 border-amber-500 bg-claro-tarjeta px-4 py-3 dark:bg-oscuro-tarjeta"><p className="text-xs text-claro-texto2 dark:text-oscuro-texto2">Pendientes</p><p className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-300">{pendientes}</p></div>
                    <div className="border-l-2 border-green-600 bg-claro-tarjeta px-4 py-3 dark:bg-oscuro-tarjeta"><p className="text-xs text-claro-texto2 dark:text-oscuro-texto2">Aprobados</p><p className="mt-1 text-xl font-bold text-green-700 dark:text-green-300">{aprobados}</p><p className="text-xs text-claro-texto2 dark:text-oscuro-texto2">Bs. {totalPagado.toFixed(2)}</p></div>
                    <div className="border-l-2 border-red-600 bg-claro-tarjeta px-4 py-3 dark:bg-oscuro-tarjeta"><p className="text-xs text-claro-texto2 dark:text-oscuro-texto2">Rechazados</p><p className="mt-1 text-xl font-bold text-red-700 dark:text-red-300">{rechazados}</p></div>
                </section>
                <details className="mb-5 border-y border-claro-borde dark:border-oscuro-borde">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 py-3 text-sm font-semibold text-claro-texto dark:text-oscuro-texto">
                        <span>Herramientas de conciliación</span>
                        <span className="text-xs font-normal text-claro-texto2 dark:text-oscuro-texto2">Neto: Bs. {Number(conciliacion.neto).toFixed(2)} · {conciliacion.movimientos.length} movimientos</span>
                    </summary>
                    <div className="grid gap-3 border-t border-claro-borde py-3 dark:border-oscuro-borde sm:grid-cols-4 sm:items-center">
                        <div><p className="text-xs text-claro-texto2 dark:text-oscuro-texto2">Ingresos</p><p className="font-semibold text-claro-texto dark:text-oscuro-texto">Bs. {Number(conciliacion.ingresos).toFixed(2)}</p></div>
                        <div><p className="text-xs text-claro-texto2 dark:text-oscuro-texto2">Reembolsos</p><p className="font-semibold text-amber-700 dark:text-amber-300">Bs. {Number(conciliacion.reembolsos).toFixed(2)}</p></div>
                        <div><p className="text-xs text-claro-texto2 dark:text-oscuro-texto2">Neto</p><p className="font-semibold text-green-700 dark:text-green-300">Bs. {Number(conciliacion.neto).toFixed(2)}</p></div>
                        <button type="button" onClick={exportarConciliacion} disabled={!conciliacion.movimientos.length} className="rounded-md border border-claro-borde px-3 py-2 text-sm font-semibold text-claro-texto hover:bg-claro-tinte disabled:cursor-not-allowed disabled:opacity-50 dark:border-oscuro-borde dark:text-oscuro-texto dark:hover:bg-oscuro-tinte">Exportar CSV</button>
                    </div>
                </details>

                {pagos.length === 0 ? (
                    <div className="text-center py-16">
                        <span className="text-6xl mb-4 block">✅</span>
                        <h3 className="text-xl font-semibold text-claro-texto dark:text-oscuro-texto mb-2">
                            No hay pagos registrados
                        </h3>
                        <p className="text-claro-texto2 dark:text-oscuro-texto2">Los pagos registrados aparecerán aquí.</p>
                    </div>
                ) : pagosFiltrados.length === 0 ? (
                    <div className="border-y border-claro-borde py-12 text-center dark:border-oscuro-borde">
                        <h3 className="text-lg font-semibold text-claro-texto dark:text-oscuro-texto">No hay pagos que coincidan con esos filtros</h3>
                        <p className="mt-1 text-sm text-claro-texto2 dark:text-oscuro-texto2">Cambia el método, rango de fechas o búsqueda.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {pagosFiltrados.map((pago) => (
                            <div key={pago.id_pago} className="bg-claro-tarjeta dark:bg-oscuro-tarjeta rounded-xl shadow-md border border-claro-borde dark:border-oscuro-borde overflow-hidden">
                                <div className="p-6">
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-lg font-bold text-claro-texto dark:text-oscuro-texto">
                                                    {pago.nombre} {pago.apellido_paterno}
                                                </span>
                                                <span className="rounded-full bg-claro-primario/10 px-3 py-1 text-sm text-claro-primario dark:bg-oscuro-primario/15 dark:text-oscuro-primario">
                                                    {getMetodoLabel(pago.metodo_pago)}
                                                </span>
                                            </div>
                                            <p className="mb-3 text-sm text-claro-texto2 dark:text-oscuro-texto2">{pago.correo}</p>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <p className="text-claro-texto2 dark:text-oscuro-texto2">Cancha</p>
                                                    <p className="font-medium text-claro-texto dark:text-oscuro-texto">{pago.cancha_nombre}</p>
                                                </div>
                                                <div>
                                                    <p className="text-claro-texto2 dark:text-oscuro-texto2">Fecha</p>
                                                    <p className="font-medium text-claro-texto dark:text-oscuro-texto">{new Date(`${String(pago.fecha_reserva).slice(0, 10)}T12:00:00`).toLocaleDateString('es-ES')}</p>
                                                </div>
                                                <div>
                                                    <p className="text-claro-texto2 dark:text-oscuro-texto2">Horario</p>
                                                    <p className="font-medium text-claro-texto dark:text-oscuro-texto">{pago.hora_inicio?.slice(0,5)} - {pago.hora_fin?.slice(0,5)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-claro-texto2 dark:text-oscuro-texto2">Monto</p>
                                                    <p className="text-lg font-bold text-claro-primario dark:text-oscuro-primario">Bs. {parseFloat(pago.monto).toFixed(2)}</p>
                                                </div>
                                            </div>

                                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-claro-texto2 dark:text-oscuro-texto2">
                                                <span>Reserva: {pago.referencia_pasarela || `RES-${pago.id_reserva}`}</span>
                                                <span>Operación: {pago.nro_comprobante || 'No registrada'}</span>
                                                <span className={['pagado', 'reembolso_parcial', 'reembolsado'].includes(normalizarEstado(pago.estado)) ? 'font-semibold text-green-700 dark:text-green-300' : normalizarEstado(pago.estado) === 'pendiente' ? 'font-semibold text-amber-700 dark:text-amber-300' : normalizarEstado(pago.estado) === 'rechazado' ? 'font-semibold text-red-700 dark:text-red-300' : 'font-semibold text-claro-texto2 dark:text-oscuro-texto2'}>
                                                    Estado: {normalizarEstado(pago.estado) === 'pagado' ? 'Aprobado' : normalizarEstado(pago.estado) === 'pendiente' ? 'Pendiente' : normalizarEstado(pago.estado) === 'rechazado' ? 'Rechazado' : normalizarEstado(pago.estado) === 'reembolso_parcial' ? 'Reembolso parcial' : normalizarEstado(pago.estado) === 'reembolsado' ? 'Reembolsado' : 'Histórico legado'}
                                                </span>
                                                {Number(pago.monto_reembolsado || 0) > 0 && <span>Reembolsado: Bs. {Number(pago.monto_reembolsado).toFixed(2)}</span>}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 lg:items-end">
                                            {pago.id_pago > 0 && <button type="button" onClick={() => abrirRevision(pago)} className="rounded-md border border-claro-borde px-3 py-2 text-sm font-medium text-claro-texto hover:bg-claro-tinte dark:border-oscuro-borde dark:text-oscuro-texto dark:hover:bg-oscuro-tinte">Ver reserva y auditoría</button>}
                                            {pago.comprobante_url && (
                                                <button
                                                    onClick={() => verComprobante(pago)}
                                                    className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                                >
                                                    Ver Comprobante
                                                </button>
                                            )}
                                            {pago.id_pago >= 0 && ['pendiente', 'pendiente_verificacion'].includes(pago.estado) && <div className="flex gap-2">
                                                <button
                                                    onClick={() => { setPagoARechazar(pago); setMotivoRechazo(''); }}
                                                    disabled={procesandoId === pago.id_pago}
                                                    className="px-4 py-2 text-sm font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                                                >
                                                    {procesandoId === pago.id_pago ? 'Guardando…' : 'Rechazar'}
                                                </button>
                                                <button
                                                    onClick={() => handleVerificar(pago.id_pago, 'pagado')}
                                                    disabled={procesandoId === pago.id_pago || (normalizarMetodo(pago.metodo_pago) !== 'fisico' && !pago.comprobante_url)}
                                                    className="px-4 py-2 text-sm font-medium rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50"
                                                >
                                                     {procesandoId === pago.id_pago ? 'Guardando…' : 'Aprobar'}
                                                </button>
                                            </div>}
                                            {pago.id_pago > 0 && ['pagado', 'reembolso_parcial'].includes(pago.estado) && montoReembolsable(pago) > 0 && <button type="button" onClick={() => { setPagoAReembolsar(pago); setMontoReembolso(montoReembolsable(pago).toFixed(2)); setMotivoReembolso(''); setReferenciaReembolso(''); }} className="rounded-md border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30">Registrar reembolso</button>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {modalOpen && pagoSeleccionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
                    <div className="bg-claro-tarjeta dark:bg-oscuro-tarjeta rounded-2xl shadow-xl overflow-hidden max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-claro-borde dark:border-oscuro-borde">
                            <h3 className="text-xl font-semibold text-claro-texto dark:text-oscuro-texto">
                                Comprobante de Pago
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="text-claro-texto2 hover:text-claro-texto dark:text-oscuro-texto2 dark:hover:text-oscuro-texto">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6">
                            {pagoSeleccionado.comprobante_url?.match(/\.(jpg|jpeg|png|webp|svg)$/i) ? (
                                <img 
                                    src={`${API_ORIGIN}${pagoSeleccionado.comprobante_url}`}
                                    alt="Comprobante" 
                                    className="w-full rounded-lg"
                                />
                            ) : (
                                <div className="text-center">
                                    <span className="text-5xl mb-4 block">📄</span>
                                    <p className="mb-4 text-claro-texto2 dark:text-oscuro-texto2">Este es un archivo PDF</p>
                                    <a 
                                        href={`${API_ORIGIN}${pagoSeleccionado.comprobante_url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-6 py-3 bg-claro-primario text-white rounded-lg hover:bg-claro-hover transition-colors inline-block"
                                    >
                                         Abrir PDF
                                    </a>
                                </div>
                            )}
                            <div className="mt-6 p-4 bg-claro-fondo dark:bg-oscuro-fondo rounded-lg">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-claro-texto2 dark:text-oscuro-texto2">Cliente</p>
                                        <p className="font-medium text-claro-texto dark:text-oscuro-texto">{pagoSeleccionado.nombre} {pagoSeleccionado.apellido_paterno}</p>
                                    </div>
                                    <div>
                                        <p className="text-claro-texto2 dark:text-oscuro-texto2">Monto</p>
                                        <p className="font-medium text-claro-primario dark:text-oscuro-primario">Bs. {parseFloat(pagoSeleccionado.monto).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-claro-texto2 dark:text-oscuro-texto2">Método</p>
                                        <p className="font-medium text-claro-texto dark:text-oscuro-texto">{getMetodoLabel(pagoSeleccionado.metodo_pago)}</p>
                                    </div>
                                    <div>
                                        <p className="text-claro-texto2 dark:text-oscuro-texto2">Fecha</p>
                                        <p className="font-medium text-claro-texto dark:text-oscuro-texto">{new Date(pagoSeleccionado.fecha_reserva).toLocaleDateString('es-ES')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {revisionAbierta && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && setRevisionAbierta(false)}>
                    <section role="dialog" aria-modal="true" aria-labelledby="revision-reserva-titulo" className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-claro-borde bg-claro-tarjeta text-claro-texto shadow-2xl dark:border-oscuro-borde dark:bg-oscuro-tarjeta dark:text-oscuro-texto">
                        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-claro-borde bg-claro-tarjeta p-5 dark:border-oscuro-borde dark:bg-oscuro-tarjeta">
                            <div>
                                <p className="text-xs font-semibold uppercase text-claro-primario dark:text-oscuro-primario">Revisión de pago</p>
                                <h2 id="revision-reserva-titulo" className="mt-1 text-xl font-bold">Reserva {revisionDetalle?.reserva?.id_reserva ? `RES-${revisionDetalle.reserva.id_reserva}` : ''}</h2>
                            </div>
                            <button type="button" aria-label="Cerrar detalle" onClick={() => setRevisionAbierta(false)} className="rounded-md border border-claro-borde px-3 py-1 text-xl leading-none dark:border-oscuro-borde">×</button>
                        </header>
                        {revisionCargando ? <p className="p-8 text-center text-sm text-claro-texto2 dark:text-oscuro-texto2">Cargando la reserva y sus movimientos…</p>
                            : !revisionDetalle ? <p className="p-8 text-center text-sm text-claro-texto2 dark:text-oscuro-texto2">No hay detalle disponible.</p>
                                : <div className="space-y-6 p-5">
                                    <section>
                                        <h3 className="mb-3 font-semibold">Reserva y cliente</h3>
                                        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                                            {[
                                                ['Cliente', revisionDetalle.reserva.cliente_nombre],
                                                ['Correo', revisionDetalle.reserva.cliente_correo || 'Sin correo · reserva anónima'],
                                                ['Teléfono', revisionDetalle.reserva.cliente_telefono || 'No indicado'],
                                                ['Cancha', `${revisionDetalle.reserva.cancha_nombre}${revisionDetalle.reserva.disciplina ? ` · ${revisionDetalle.reserva.disciplina}` : ''}`],
                                                ['Fecha', new Date(`${String(revisionDetalle.reserva.fecha_reserva).slice(0, 10)}T12:00:00`).toLocaleDateString('es-BO')],
                                                ['Horario', `${String(revisionDetalle.reserva.hora_inicio).slice(0, 5)} - ${String(revisionDetalle.reserva.hora_fin).slice(0, 5)}`],
                                                ['Estado de reserva', String(revisionDetalle.reserva.estado_reserva).replace(/_/g, ' ')],
                                                ['Canal', revisionDetalle.reserva.canal_reserva || 'No registrado'],
                                                ['Tarifa base', `Bs. ${Number(revisionDetalle.reserva.precio_hora).toFixed(2)} / h`]
                                            ].map(([label, value]) => <div key={label}><dt className="text-xs text-claro-texto2 dark:text-oscuro-texto2">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>)}
                                        </dl>
                                        <div className="mt-4 border-t border-claro-borde pt-3 dark:border-oscuro-borde">
                                            <p className="text-xs text-claro-texto2 dark:text-oscuro-texto2">Observaciones</p>
                                            <p className="mt-1 whitespace-pre-wrap text-sm">{revisionDetalle.reserva.observaciones || 'Sin observaciones registradas.'}</p>
                                        </div>
                                    </section>

                                    <section>
                                        <h3 className="mb-3 font-semibold">Pagos e intentos</h3>
                                        <div className="divide-y divide-claro-borde border-y border-claro-borde dark:divide-oscuro-borde dark:border-oscuro-borde">
                                            {revisionDetalle.pagos.map((pago: any) => {
                                                let adicionales = pago.detalle_adicionales || [];
                                                if (typeof adicionales === 'string') {
                                                    try { adicionales = JSON.parse(adicionales); } catch { adicionales = []; }
                                                }
                                                return <article key={pago.id_pago} className="py-4">
                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                        <div><p className="font-semibold">Pago #{pago.id_pago} · {getMetodoLabel(pago.metodo_pago)}</p><p className="mt-1 text-xs text-claro-texto2 dark:text-oscuro-texto2">{String(pago.estado).replace(/_/g, ' ')} · Operación {pago.nro_comprobante || 'no indicada'}</p></div>
                                                        <p className="text-lg font-bold text-claro-primario dark:text-oscuro-primario">Bs. {Number(pago.monto).toFixed(2)}</p>
                                                    </div>
                                                    {Array.isArray(adicionales) && adicionales.length > 0 && <div className="mt-3 rounded-md bg-claro-fondo p-3 text-sm dark:bg-oscuro-fondo"><p className="mb-1 text-xs font-semibold text-claro-texto2 dark:text-oscuro-texto2">Adicionales registrados</p>{adicionales.map((item: any, index: number) => <p key={`${pago.id_pago}-${index}`}>{item.cantidad || 1} × {item.nombre}: Bs. {Number(item.subtotal || 0).toFixed(2)}</p>)}</div>}
                                                    {Number(pago.monto_reembolsado || 0) > 0 && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">Reembolsado: Bs. {Number(pago.monto_reembolsado).toFixed(2)} · Saldo neto: Bs. {(Number(pago.monto) - Number(pago.monto_reembolsado)).toFixed(2)}</p>}
                                                    <ol className="mt-3 space-y-2 border-l border-claro-borde pl-4 dark:border-oscuro-borde">
                                                        {(pago.auditoria || []).map((evento: any) => <li key={evento.id_auditoria} className="relative text-xs"><span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-claro-primario dark:bg-oscuro-primario"/><span className="font-semibold">{String(evento.accion).replace(/_/g, ' ')}</span><span className="text-claro-texto2 dark:text-oscuro-texto2"> · {evento.responsable} · {new Date(evento.creado_en).toLocaleString('es-BO')}</span>{evento.motivo && <p className="mt-1 text-claro-texto2 dark:text-oscuro-texto2">{evento.motivo}</p>}</li>)}
                                                    </ol>
                                                </article>;
                                            })}
                                            {!revisionDetalle.pagos.length && <p className="py-4 text-sm text-claro-texto2 dark:text-oscuro-texto2">La reserva aún no tiene pagos registrados.</p>}
                                        </div>
                                    </section>
                                </div>}
                    </section>
                </div>
            )}

            {pagoAReembolsar && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
                    <section role="dialog" aria-modal="true" aria-labelledby="reembolso-titulo" className="w-full max-w-lg rounded-lg border border-claro-borde bg-claro-tarjeta p-5 text-claro-texto shadow-2xl dark:border-oscuro-borde dark:bg-oscuro-tarjeta dark:text-oscuro-texto">
                        <h2 id="reembolso-titulo" className="text-lg font-bold">Registrar reembolso</h2>
                        <p className="mt-1 text-sm text-claro-texto2 dark:text-oscuro-texto2">Pago #{pagoAReembolsar.id_pago} · Reserva RES-{pagoAReembolsar.id_reserva} · Máximo disponible Bs. {montoReembolsable(pagoAReembolsar).toFixed(2)}</p>
                        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">El sistema solo registra el reembolso. Ejecuta primero la devolución por el canal externo y guarda su referencia, si está disponible.</p>
                        <label className="mt-4 block text-sm font-medium">Monto (Bs.)<input type="number" min="0.01" max={montoReembolsable(pagoAReembolsar)} step="0.01" value={montoReembolso} onChange={(event) => setMontoReembolso(event.target.value)} className="mt-1 w-full rounded-md border border-claro-borde bg-claro-fondo p-2 dark:border-oscuro-borde dark:bg-oscuro-fondo" /></label>
                        <label className="mt-3 block text-sm font-medium">Motivo (5 a 500 caracteres)<textarea minLength={5} maxLength={500} rows={3} value={motivoReembolso} onChange={(event) => setMotivoReembolso(event.target.value)} className="mt-1 w-full rounded-md border border-claro-borde bg-claro-fondo p-2 dark:border-oscuro-borde dark:bg-oscuro-fondo" /></label>
                        <label className="mt-3 block text-sm font-medium">Referencia externa (opcional)<input maxLength={100} value={referenciaReembolso} onChange={(event) => setReferenciaReembolso(event.target.value)} className="mt-1 w-full rounded-md border border-claro-borde bg-claro-fondo p-2 dark:border-oscuro-borde dark:bg-oscuro-fondo" /></label>
                        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setPagoAReembolsar(null)} className="rounded-md border border-claro-borde px-3 py-2 text-sm dark:border-oscuro-borde">Cancelar</button><button type="button" onClick={registrarReembolso} disabled={guardandoReembolso || motivoReembolso.trim().length < 5 || Number(montoReembolso) <= 0 || Number(montoReembolso) > montoReembolsable(pagoAReembolsar)} className="rounded-md bg-claro-primario px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{guardandoReembolso ? 'Guardando…' : 'Registrar reembolso'}</button></div>
                    </section>
                </div>
            )}

            {pagoARechazar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <section role="dialog" aria-modal="true" aria-labelledby="rechazo-pago-titulo" className="w-full max-w-md rounded-lg border border-claro-borde bg-claro-tarjeta p-5 shadow-xl dark:border-oscuro-borde dark:bg-oscuro-tarjeta">
                        <h2 id="rechazo-pago-titulo" className="text-lg font-semibold">Rechazar comprobante</h2>
                        <p className="mt-1 text-sm text-claro-texto2 dark:text-oscuro-texto2">El motivo se mostrará al cliente para que pueda corregir el pago.</p>
                        <label htmlFor="motivo-rechazo-pago" className="mt-4 block text-sm font-medium">Motivo (5 a 500 caracteres)</label>
                        <textarea id="motivo-rechazo-pago" value={motivoRechazo} onChange={(event) => setMotivoRechazo(event.target.value)} minLength={5} maxLength={500} rows={4} className="mt-1 w-full rounded-md border border-claro-borde bg-transparent p-3 text-sm dark:border-oscuro-borde" />
                        <div className="mt-4 flex justify-end gap-2">
                            <button type="button" onClick={() => setPagoARechazar(null)} className="rounded-md border border-claro-borde px-3 py-2 text-sm dark:border-oscuro-borde">Cancelar</button>
                            <button type="button" disabled={motivoRechazo.trim().length < 5 || procesandoId === pagoARechazar.id_pago} onClick={() => handleVerificar(pagoARechazar.id_pago, 'rechazado', motivoRechazo.trim())} className="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Confirmar rechazo</button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
};

export default VerificarPagos;
