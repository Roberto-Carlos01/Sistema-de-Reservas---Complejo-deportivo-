import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ToastMensaje from '../components/eventos/ToastMensaje';
import CanchasEventoModal, { ImagenCancha } from '../components/eventos/CanchasEventoModal';

const GestionEventos = () => {
    const { token } = useAuth();
    const [eventos, setEventos] = useState<any[]>([]);
    const [canchas, setCanchas] = useState<any[]>([]);
    const [serviciosCatalogo, setServiciosCatalogo] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error', texto: string } | null>(null);

    // Formulario de creacion / edicion
    const [mostrarModal, setMostrarModal] = useState(false);
    const [eventoEnEdicion, setEventoEnEdicion] = useState<number | null>(null);
    const [modoReprogramar, setModoReprogramar] = useState(false);
    const formVacio = {
        nombre_evento: '',
        descripcion: '',
        fecha_evento: '',
        hora_inicio: '',
        hora_fin: '',
        cupo_maximo: 0,
        tipo_evento: 'torneo'
    };
    const [formData, setFormData] = useState(formVacio);
    const [serviciosSeleccionados, setServiciosSeleccionados] = useState<{ id_servicio: number, costo_contratado: number }[]>([]);
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

    // Canchas elegidas para el evento (puede ser más de una)
    const [idsCanchas, setIdsCanchas] = useState<number[]>([]);
    const [canchasOcupadas, setCanchasOcupadas] = useState<number[]>([]);
    const [filtroDisciplina, setFiltroDisciplina] = useState<string>('todas');

    // Pestañas de la lista, modal "Ver canchas" y modal de cancelación
    const [tab, setTab] = useState<'proximos' | 'finalizados' | 'cancelados' | 'todos'>('proximos');
    const [eventoCanchasVer, setEventoCanchasVer] = useState<any | null>(null);
    const [eventoACancelar, setEventoACancelar] = useState<any | null>(null);
    const [motivoCancelacion, setMotivoCancelacion] = useState('');
    const [cancelando, setCancelando] = useState(false);

    // Modal "Ver inscritos"
    const [eventoInscritos, setEventoInscritos] = useState<any | null>(null);
    const [inscritos, setInscritos] = useState<any[]>([]);
    const [cargandoInscritos, setCargandoInscritos] = useState(false);

    useEffect(() => {
        cargarDatos();
    }, []);

    // Consulta qué canchas están ocupadas en la fecha/horario elegidos
    useEffect(() => {
        const { fecha_evento, hora_inicio, hora_fin } = formData;
        if (!mostrarModal || !fecha_evento || !hora_inicio || !hora_fin || hora_inicio >= hora_fin) {
            setCanchasOcupadas([]);
            return;
        }
        const t = setTimeout(async () => {
            try {
                const res = await axios.get(`${apiUrl}/eventos/canchas-ocupadas`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { fecha: fecha_evento, hora_inicio, hora_fin, excluir: eventoEnEdicion || undefined }
                });
                setCanchasOcupadas(res.data.data || []);
            } catch (error) {
                console.error('Error consultando disponibilidad:', error);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [mostrarModal, formData.fecha_evento, formData.hora_inicio, formData.hora_fin, eventoEnEdicion]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [evRes, canchasRes, servRes] = await Promise.all([
                axios.get(`${apiUrl}/eventos`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${apiUrl}/canchas`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${apiUrl}/eventos/servicios`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setEventos(evRes.data.data);
            setCanchas(canchasRes.data.data);
            setServiciosCatalogo(servRes.data.data);
        } catch (error) {
            console.error("Error cargando datos:", error);
            setMensaje({ tipo: 'error', texto: 'No se pudieron cargar los datos.' });
        } finally {
            setLoading(false);
        }
    };

    const handleGuardarEvento = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validar fecha y hora al crear o reprogramar un evento.
        // Al editar uno existente, el backend valida los cambios de fecha/hora.
        if (!eventoEnEdicion || modoReprogramar) {
            if (!formData.fecha_evento || !formData.hora_inicio) {
                setMensaje({
                    tipo: 'error',
                    texto: 'Debe indicar la fecha y la hora de inicio del evento.'
                });
                return;
            }

            const inicio = new Date(`${formData.fecha_evento}T${formData.hora_inicio}`);
            if (inicio <= new Date()) {
                setMensaje({
                    tipo: 'error',
                    texto: 'La fecha y hora de inicio deben ser posteriores al momento actual.'
                });
                return;
            }
        }

        if (idsCanchas.length === 0) {
            setMensaje({ tipo: 'error', texto: 'Seleccione al menos una cancha para el evento.' });
            return;
        }
        const conflicto = canchas.filter(c => idsCanchas.includes(c.id_cancha) && canchasOcupadas.includes(c.id_cancha));
        if (conflicto.length > 0) {
            setMensaje({ tipo: 'error', texto: `Estas canchas ya están ocupadas en ese horario: ${conflicto.map(c => c.nombre).join(', ')}. Quítelas o cambie el horario.` });
            return;
        }

        const payload = {
            ...formData,
            ids_canchas: idsCanchas,
            cupo_maximo: parseInt(formData.cupo_maximo.toString()),
            servicios: serviciosSeleccionados
        };
        try {
            if (modoReprogramar && eventoEnEdicion) {
                await axios.patch(`${apiUrl}/eventos/${eventoEnEdicion}/reprogramar`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMensaje({ tipo: 'exito', texto: 'Evento reprogramado exitosamente.' });
            } else if (eventoEnEdicion) {
                await axios.put(`${apiUrl}/eventos/${eventoEnEdicion}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMensaje({ tipo: 'exito', texto: 'Evento actualizado exitosamente.' });
            } else {
                await axios.post(`${apiUrl}/eventos`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMensaje({ tipo: 'exito', texto: 'Evento creado exitosamente.' });
            }
            cerrarModal();
            cargarDatos();
        } catch (error: any) {
            setMensaje({ tipo: 'error', texto: error.response?.data?.message || 'Error al guardar el evento' });
        }
    };

    const abrirModalCrear = () => {
        setEventoEnEdicion(null);
        setModoReprogramar(false);
        setFormData(formVacio);
        setIdsCanchas([]);
        setFiltroDisciplina('todas');
        setServiciosSeleccionados([]);
        setMostrarModal(true);
    };

    const abrirModalEditar = (evento: any) => {
        setEventoEnEdicion(evento.id_evento);
        setModoReprogramar(false);
        setFormData({
            nombre_evento: evento.nombre_evento || '',
            descripcion: evento.descripcion || '',
            fecha_evento: evento.fecha_evento ? evento.fecha_evento.substring(0, 10) : '',
            hora_inicio: (evento.hora_inicio || '').substring(0, 5),
            hora_fin: (evento.hora_fin || '').substring(0, 5),
            cupo_maximo: evento.cupo_maximo || 0,
            tipo_evento: evento.tipo_evento || 'torneo'
        });
        setIdsCanchas((evento.canchas_asignadas || []).map((c: any) => c.id_cancha));
        setFiltroDisciplina('todas');
        setServiciosSeleccionados(
            (evento.servicios_adicionales || []).map((s: any) => ({
                id_servicio: s.id_servicio,
                costo_contratado: parseFloat(s.costo_contratado)
            }))
        );
        setMostrarModal(true);
    };

    const abrirModalReprogramar = (evento: any) => {
        setEventoEnEdicion(evento.id_evento);
        setModoReprogramar(true);
        setFormData({
            nombre_evento: evento.nombre_evento || '',
            descripcion: evento.descripcion || '',
            fecha_evento: '',
            hora_inicio: '',
            hora_fin: '',
            cupo_maximo: evento.cupo_maximo || 0,
            tipo_evento: evento.tipo_evento || 'torneo'
        });
        setIdsCanchas((evento.canchas_asignadas || []).map((c: any) => c.id_cancha));
        setFiltroDisciplina('todas');
        setServiciosSeleccionados(
            (evento.servicios_adicionales || []).map((s: any) => ({
                id_servicio: s.id_servicio,
                costo_contratado: parseFloat(s.costo_contratado)
            }))
        );
        setMostrarModal(true);
    };

    const cerrarModal = () => {
        setMostrarModal(false);
        setEventoEnEdicion(null);
        setModoReprogramar(false);
        setFormData(formVacio);
        setIdsCanchas([]);
        setCanchasOcupadas([]);
        setServiciosSeleccionados([]);
    };

    const abrirCancelar = (evento: any) => {
        setMotivoCancelacion('');
        setEventoACancelar(evento);
    };

    const handleCancelarEvento = async () => {
        if (!eventoACancelar) return;
        const motivo = motivoCancelacion.trim();
        if (!motivo) {
            setMensaje({ tipo: 'error', texto: 'Debe escribir el motivo de la cancelación.' });
            return;
        }

        setCancelando(true);
        try {
            const res = await axios.patch(`${apiUrl}/eventos/${eventoACancelar.id_evento}/cancelar`, { motivo_cancelacion: motivo }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEventoACancelar(null);
            const afectados = res.data?.data?.afectados || [];
            const texto = afectados.length > 0
                ? `Evento cancelado. Clientes a notificar (${afectados.length}): ${afectados.map((a: any) => `${a.nombre} (${a.correo})`).join(', ')}`
                : 'Evento cancelado exitosamente. No había clientes inscritos.';
            setMensaje({ tipo: 'exito', texto });
            cargarDatos();
        } catch (error: any) {
            setMensaje({ tipo: 'error', texto: error.response?.data?.message || 'Error al cancelar evento' });
        } finally {
            setCancelando(false);
        }
    };

    // Estado que ve el administrador: un evento programado que ya terminó se muestra como "finalizado"
    const estadoVisual = (e: any) => e.estado === 'cancelado' ? 'cancelado' : e.finalizado ? 'finalizado' : 'programado';

    const conteo = {
        proximos: eventos.filter(e => estadoVisual(e) === 'programado').length,
        finalizados: eventos.filter(e => estadoVisual(e) === 'finalizado').length,
        cancelados: eventos.filter(e => estadoVisual(e) === 'cancelado').length,
        todos: eventos.length
    };

    const eventosFiltrados = (() => {
        if (tab === 'todos') return eventos;
        const lista = eventos.filter(e => estadoVisual(e) === (tab === 'proximos' ? 'programado' : tab === 'finalizados' ? 'finalizado' : 'cancelado'));
        // Próximos: del más cercano al más lejano
        return tab === 'proximos'
            ? [...lista].sort((a, b) => `${String(a.fecha_evento).substring(0, 10)}${a.hora_inicio}`.localeCompare(`${String(b.fecha_evento).substring(0, 10)}${b.hora_inicio}`))
            : lista;
    })();

    const toggleCancha = (id_cancha: number) => {
        setIdsCanchas(prev => prev.includes(id_cancha) ? prev.filter(id => id !== id_cancha) : [...prev, id_cancha]);
    };

    const seleccionarTodasLibres = () => {
        const libres = canchas
            .filter(c => c.estado?.toLowerCase() === 'disponible' && !canchasOcupadas.includes(c.id_cancha))
            .filter(c => filtroDisciplina === 'todas' || c.disciplina === filtroDisciplina)
            .map(c => c.id_cancha);
        setIdsCanchas(prev => Array.from(new Set([...prev, ...libres])));
    };

    const verInscritos = async (evento: any) => {
        setEventoInscritos(evento);
        setInscritos([]);
        setCargandoInscritos(true);
        try {
            const res = await axios.get(`${apiUrl}/eventos/${evento.id_evento}/inscritos`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInscritos(res.data.data || []);
        } catch (error: any) {
            setMensaje({ tipo: 'error', texto: error.response?.data?.message || 'No se pudo cargar la lista de inscritos.' });
            setEventoInscritos(null);
        } finally {
            setCargandoInscritos(false);
        }
    };

    const iconoDisciplina = (d?: string) => {
        const x = (d || '').toLowerCase();
        if (x.includes('futbol')) return '⚽';
        if (x.includes('basquet')) return '🏀';
        if (x.includes('voley')) return '🏐';
        if (x.includes('tenis')) return '🎾';
        if (x.includes('padel')) return '🏸';
        if (x.includes('futsal')) return '🥅';
        return '🏟️';
    };

    const disciplinas = Array.from(new Set(canchas.map(c => c.disciplina).filter(Boolean))) as string[];
    const canchasVisibles = canchas.filter(c => filtroDisciplina === 'todas' || c.disciplina === filtroDisciplina);
    const canchasElegidas = canchas.filter(c => idsCanchas.includes(c.id_cancha));
    const capacidadTotal = canchasElegidas.reduce((acc, c) => acc + (parseInt(c.capacidad) || 0), 0);

    const toggleServicio = (id_servicio: number, precio_referencia: number) => {
        const existe = serviciosSeleccionados.find(s => s.id_servicio === id_servicio);
        if (existe) {
            setServiciosSeleccionados(serviciosSeleccionados.filter(s => s.id_servicio !== id_servicio));
        } else {
            setServiciosSeleccionados([...serviciosSeleccionados, { id_servicio, costo_contratado: precio_referencia }]);
        }
    };

    const updateCostoServicio = (id_servicio: number, costo: number) => {
        setServiciosSeleccionados(serviciosSeleccionados.map(s => 
            s.id_servicio === id_servicio ? { ...s, costo_contratado: costo } : s
        ));
    };

    // Calculo en tiempo real del costo
    const calcularCostoTotalPreview = () => {
        let costoCancha = 0;
        const precioPorHora = canchas
            .filter(c => idsCanchas.includes(c.id_cancha))
            .reduce((acc, c) => acc + parseFloat(c.precio_hora), 0);
        let horas = 0;
        if (idsCanchas.length > 0 && formData.hora_inicio && formData.hora_fin) {
            const start = new Date(`1970-01-01T${formData.hora_inicio}Z`);
            const end = new Date(`1970-01-01T${formData.hora_fin}Z`);
            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            if (hours > 0) {
                horas = hours;
                costoCancha = hours * precioPorHora;
            }
        }
        const costoServicios = serviciosSeleccionados.reduce((acc, curr) => acc + parseFloat(curr.costo_contratado.toString()), 0);
        return { costoCancha, costoServicios, precioPorHora, horas, total: costoCancha + costoServicios };
    };

    const previewCostos = calcularCostoTotalPreview();

    // Fecha actual en formato YYYY-MM-DD según la hora local del navegador.
    // Evita cambios de día causados por la conversión a UTC con toISOString().
    const ahora = new Date();
    const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-claro-texto dark:text-oscuro-texto">Gestión de Eventos</h2>
                <button 
                    onClick={abrirModalCrear}
                    className="bg-claro-primario text-white px-4 py-2 rounded-xl font-medium hover:bg-opacity-90 dark:bg-oscuro-primario shadow-sm flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nuevo Evento
                </button>
            </div>

            <ToastMensaje mensaje={mensaje} onClose={() => setMensaje(null)} />

            <div className="flex flex-wrap gap-2">
                {([
                    ['proximos', 'Próximos'],
                    ['finalizados', 'Finalizados'],
                    ['cancelados', 'Cancelados'],
                    ['todos', 'Todos']
                ] as const).map(([clave, texto]) => (
                    <button
                        key={clave}
                        onClick={() => setTab(clave)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${tab === clave
                            ? 'bg-claro-primario text-white border-claro-primario dark:bg-oscuro-primario dark:border-oscuro-primario'
                            : 'border-claro-borde dark:border-oscuro-borde text-claro-texto2 dark:text-oscuro-texto2 hover:bg-claro-tinte dark:hover:bg-oscuro-tinte'}`}
                    >
                        {texto} <span className="opacity-80">({conteo[clave]})</span>
                    </button>
                ))}
            </div>
            {tab === 'proximos' && (
                <p className="text-xs text-claro-texto2 dark:text-oscuro-texto2 -mt-3">
                    Estos son los eventos que ven los clientes en la sección Eventos. Use las otras pestañas para ver el historial.
                </p>
            )}

            <div className="bg-claro-tarjeta dark:bg-oscuro-tarjeta rounded-2xl border border-claro-borde dark:border-oscuro-borde overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-claro-texto dark:text-oscuro-texto">
                        <thead className="bg-gray-50 dark:bg-oscuro-fondo border-b border-claro-borde dark:border-oscuro-borde text-claro-texto2 dark:text-oscuro-texto2">
                            <tr>
                                <th className="px-6 py-4 font-medium">Evento</th>
                                <th className="px-6 py-4 font-medium">Fecha y Hora</th>
                                <th className="px-6 py-4 font-medium">Canchas</th>
                                <th className="px-6 py-4 font-medium">Inscritos</th>
                                <th className="px-6 py-4 font-medium">Costo Total / Por persona</th>
                                <th className="px-6 py-4 font-medium">Estado</th>
                                <th className="px-6 py-4 font-medium">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-claro-borde dark:divide-oscuro-borde">
                            {loading ? (
                                <tr><td colSpan={7} className="px-6 py-8 text-center text-claro-texto2 dark:text-oscuro-texto2">Cargando eventos...</td></tr>
                            ) : eventosFiltrados.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-8 text-center text-claro-texto2 dark:text-oscuro-texto2">No hay eventos en esta categoría.</td></tr>
                            ) : (
                                eventosFiltrados.map(evento => (
                                    <tr key={evento.id_evento} className="hover:bg-gray-50 dark:hover:bg-oscuro-fondo transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold">{evento.nombre_evento}</div>
                                            <div className="text-xs text-claro-texto2 dark:text-oscuro-texto2">{evento.tipo_evento}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>{new Date(evento.fecha_evento).toLocaleDateString('es-ES', { timeZone: 'UTC' })}</div>
                                            <div className="text-xs text-claro-texto2 dark:text-oscuro-texto2">{evento.hora_inicio?.substring(0, 5)} - {evento.hora_fin?.substring(0, 5)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                                                {(evento.canchas_asignadas || []).map((c: any) => (
                                                    <span key={c.id_cancha} className="px-2 py-0.5 rounded-full text-xs bg-claro-tinte dark:bg-oscuro-tinte border border-claro-borde dark:border-oscuro-borde">
                                                        {iconoDisciplina(c.disciplina)} {c.nombre}
                                                    </span>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => setEventoCanchasVer(evento)}
                                                className="text-xs text-claro-primario dark:text-oscuro-primario font-medium hover:underline mt-1"
                                            >
                                                {(evento.canchas_asignadas || []).length} {(evento.canchas_asignadas || []).length === 1 ? 'cancha' : 'canchas'} · Ver fotos
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => verInscritos(evento)}
                                                className="text-claro-primario dark:text-oscuro-primario font-medium hover:underline"
                                                title="Ver clientes inscritos"
                                            >
                                                {evento.inscritos} / {evento.cupo_maximo} · Ver
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium">Bs. {Number(evento.costo_total || 0).toFixed(2)}</div>
                                            <div className="text-xs text-claro-texto2 dark:text-oscuro-texto2">Bs. {Number(evento.costo_por_persona || 0).toFixed(2)} por persona</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border
                                                ${estadoVisual(evento) === 'programado' ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' :
                                                  estadoVisual(evento) === 'cancelado' ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
                                                  'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                                                }`}>
                                                {estadoVisual(evento)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {estadoVisual(evento) === 'programado' && (
                                                <div className="flex items-center gap-3">
                                                    <button 
                                                        onClick={() => abrirModalEditar(evento)}
                                                        className="text-claro-primario hover:text-opacity-80 dark:text-oscuro-primario font-medium text-sm transition-colors"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button 
                                                        onClick={() => abrirCancelar(evento)}
                                                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium text-sm transition-colors"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            )}
                                            {estadoVisual(evento) === 'finalizado' && (
                                                <span className="text-xs text-claro-texto2 dark:text-oscuro-texto2">Sin acciones</span>
                                            )}
                                            {estadoVisual(evento) === 'cancelado' && (
                                                <button 
                                                    onClick={() => abrirModalReprogramar(evento)}
                                                    className="text-claro-primario hover:text-opacity-80 dark:text-oscuro-primario font-medium text-sm transition-colors"
                                                >
                                                    Reprogramar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Creación */}
            {mostrarModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-claro-tarjeta dark:bg-oscuro-tarjeta rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-claro-borde dark:border-oscuro-borde">
                        <div className="p-6 border-b border-claro-borde dark:border-oscuro-borde flex justify-between items-center sticky top-0 bg-claro-tarjeta dark:bg-oscuro-tarjeta z-10">
                            <h3 className="text-xl font-bold text-claro-texto dark:text-oscuro-texto">{modoReprogramar ? 'Reprogramar Evento' : eventoEnEdicion ? 'Editar Evento' : 'Registrar Nuevo Evento'}</h3>
                            <button onClick={cerrarModal} className="text-claro-texto2 hover:text-claro-texto dark:text-oscuro-texto2 dark:hover:text-white">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleGuardarEvento} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-claro-texto dark:text-oscuro-texto border-b pb-2 border-claro-borde dark:border-oscuro-borde">Datos Principales</h4>
                                        <div>
                                            <label className="block text-sm font-medium text-claro-texto dark:text-oscuro-texto mb-1">Nombre del Evento</label>
                                            <input required type="text" className="w-full px-3 py-2 rounded-lg border border-claro-borde dark:border-oscuro-borde bg-claro-fondo dark:bg-oscuro-fondo" value={formData.nombre_evento} onChange={e => setFormData({...formData, nombre_evento: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-claro-texto dark:text-oscuro-texto mb-1">Tipo de Evento</label>
                                            <select required className="w-full px-3 py-2 rounded-lg border border-claro-borde dark:border-oscuro-borde bg-claro-fondo dark:bg-oscuro-fondo" value={formData.tipo_evento} onChange={e => setFormData({...formData, tipo_evento: e.target.value})}>
                                                <option value="torneo">Torneo</option>
                                                <option value="exhibicion">Exhibición</option>
                                                <option value="recreativo">Recreativo</option>
                                                <option value="social">Actividad Social</option>
                                                <option value="otro">Otro</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-claro-texto dark:text-oscuro-texto mb-1">Fecha</label>
                                                <input required type="date" min={hoy} className="w-full px-3 py-2 rounded-lg border border-claro-borde dark:border-oscuro-borde bg-claro-fondo dark:bg-oscuro-fondo" value={formData.fecha_evento} onChange={e => setFormData({...formData, fecha_evento: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-claro-texto dark:text-oscuro-texto mb-1">Aforo Máximo</label>
                                                <input required type="number" min="1" className="w-full px-3 py-2 rounded-lg border border-claro-borde dark:border-oscuro-borde bg-claro-fondo dark:bg-oscuro-fondo" value={formData.cupo_maximo} onChange={e => setFormData({...formData, cupo_maximo: e.target.value === '' ? 0 : parseInt(e.target.value)})} />
                                                {capacidadTotal > 0 && Number(formData.cupo_maximo) > capacidadTotal && (
                                                    <p className="text-xs mt-1 text-amber-600 dark:text-amber-400">
                                                        El aforo supera la capacidad de las canchas elegidas ({capacidadTotal} personas).
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-claro-texto dark:text-oscuro-texto mb-1">Hora Inicio</label>
                                                <input required type="time" className="w-full px-3 py-2 rounded-lg border border-claro-borde dark:border-oscuro-borde bg-claro-fondo dark:bg-oscuro-fondo" value={formData.hora_inicio} onChange={e => setFormData({...formData, hora_inicio: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-claro-texto dark:text-oscuro-texto mb-1">Hora Fin</label>
                                                <input required type="time" className="w-full px-3 py-2 rounded-lg border border-claro-borde dark:border-oscuro-borde bg-claro-fondo dark:bg-oscuro-fondo" value={formData.hora_fin} onChange={e => setFormData({...formData, hora_fin: e.target.value})} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-claro-texto dark:text-oscuro-texto border-b pb-2 border-claro-borde dark:border-oscuro-borde">Servicios Adicionales</h4>
                                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                            {serviciosCatalogo.map(serv => {
                                                const sel = serviciosSeleccionados.find(s => s.id_servicio === serv.id_servicio);
                                                return (
                                                    <div key={serv.id_servicio} className="flex items-center justify-between p-3 border border-claro-borde dark:border-oscuro-borde rounded-xl bg-claro-fondo dark:bg-oscuro-fondo">
                                                        <div className="flex items-center gap-3">
                                                            <input type="checkbox" className="w-4 h-4 text-claro-primario rounded" checked={!!sel} onChange={() => toggleServicio(serv.id_servicio, parseFloat(serv.precio_referencia))} />
                                                            <span className="text-sm font-medium text-claro-texto dark:text-oscuro-texto">{serv.nombre}</span>
                                                        </div>
                                                        {sel && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-claro-texto2 dark:text-oscuro-texto2">Bs.</span>
                                                                <input type="number" className="w-20 px-2 py-1 text-sm rounded border border-claro-borde dark:border-oscuro-borde bg-white dark:bg-oscuro-tarjeta" value={sel.costo_contratado} onChange={(e) => updateCostoServicio(serv.id_servicio, e.target.value === '' ? 0 : parseFloat(e.target.value))} min="0" step="0.5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="mt-6 bg-claro-tinte dark:bg-oscuro-tinte p-4 rounded-xl border border-claro-borde dark:border-oscuro-borde">
                                            <h4 className="font-bold text-claro-texto dark:text-oscuro-texto mb-3">Resumen de Costos</h4>
                                            <div className="flex justify-between text-sm mb-1 text-claro-texto2 dark:text-oscuro-texto2">
                                                <span>Costo de Canchas ({idsCanchas.length}):</span>
                                                <span>Bs. {previewCostos.costoCancha.toFixed(2)}</span>
                                            </div>
                                            {idsCanchas.length > 0 && (
                                                <div className="text-xs mb-2 text-claro-texto2 dark:text-oscuro-texto2">
                                                    {previewCostos.horas > 0
                                                        ? `${previewCostos.horas} h × Bs. ${previewCostos.precioPorHora.toFixed(2)}/hr (suma de las canchas)`
                                                        : `Bs. ${previewCostos.precioPorHora.toFixed(2)} por hora entre las canchas elegidas. Indique hora de inicio y fin para calcular el total.`}
                                                </div>
                                            )}
                                            <div className="flex justify-between text-sm mb-3 text-claro-texto2 dark:text-oscuro-texto2">
                                                <span>Servicios Adicionales:</span>
                                                <span>Bs. {previewCostos.costoServicios.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between font-bold text-lg text-claro-primario dark:text-oscuro-primario border-t border-claro-borde dark:border-oscuro-borde pt-2">
                                                <span>Total a Cobrar:</span>
                                                <span>Bs. {previewCostos.total.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>


                                {/* Selector de canchas (una o varias) */}
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2 border-claro-borde dark:border-oscuro-borde">
                                        <h4 className="font-semibold text-claro-texto dark:text-oscuro-texto">
                                            Canchas del evento <span className="text-claro-texto2 dark:text-oscuro-texto2 font-normal">({idsCanchas.length} seleccionada{idsCanchas.length === 1 ? '' : 's'}{capacidadTotal > 0 ? ` · capacidad total ${capacidadTotal} pers.` : ''})</span>
                                        </h4>
                                        <div className="flex gap-3 text-sm">
                                            <button type="button" onClick={seleccionarTodasLibres} className="text-claro-primario dark:text-oscuro-primario font-medium hover:underline">Seleccionar libres</button>
                                            <button type="button" onClick={() => setIdsCanchas([])} className="text-claro-texto2 dark:text-oscuro-texto2 hover:underline">Limpiar</button>
                                        </div>
                                    </div>

                                    {(!formData.fecha_evento || !formData.hora_inicio || !formData.hora_fin) && (
                                        <p className="text-xs text-claro-texto2 dark:text-oscuro-texto2">Elija la fecha y el horario para ver qué canchas están libres u ocupadas.</p>
                                    )}

                                    <div className="flex flex-wrap gap-2">
                                        {['todas', ...disciplinas].map(d => (
                                            <button
                                                key={d}
                                                type="button"
                                                onClick={() => setFiltroDisciplina(d)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filtroDisciplina === d
                                                    ? 'bg-claro-primario text-white border-claro-primario dark:bg-oscuro-primario dark:border-oscuro-primario'
                                                    : 'border-claro-borde dark:border-oscuro-borde text-claro-texto2 dark:text-oscuro-texto2 hover:bg-claro-tinte dark:hover:bg-oscuro-tinte'}`}
                                            >
                                                {d === 'todas' ? 'Todas' : `${iconoDisciplina(d)} ${d}`}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                                        {canchasVisibles.map(c => {
                                            const seleccionada = idsCanchas.includes(c.id_cancha);
                                            const ocupada = canchasOcupadas.includes(c.id_cancha);
                                            const mantenimiento = c.estado?.toLowerCase() !== 'disponible';
                                            const bloqueada = (ocupada || mantenimiento) && !seleccionada;
                                            return (
                                                <button
                                                    key={c.id_cancha}
                                                    type="button"
                                                    disabled={bloqueada}
                                                    onClick={() => toggleCancha(c.id_cancha)}
                                                    className={`text-left p-3 rounded-xl border-2 transition-all
                                                        ${seleccionada && ocupada ? 'border-red-500 bg-red-50 dark:bg-red-950/40'
                                                            : seleccionada ? 'border-claro-primario dark:border-oscuro-primario bg-claro-tinte dark:bg-oscuro-tinte'
                                                            : bloqueada ? 'border-claro-borde dark:border-oscuro-borde opacity-50 cursor-not-allowed'
                                                            : 'border-claro-borde dark:border-oscuro-borde hover:border-claro-primario dark:hover:border-oscuro-primario'}
                                                        bg-claro-fondo dark:bg-oscuro-fondo`}
                                                >
                                                    <div className="relative -mx-3 -mt-3 mb-2 h-24 overflow-hidden rounded-t-[10px]">
                                                        <ImagenCancha cancha={c} className="w-full h-full" />
                                                    </div>
                                                    <div className="flex items-start justify-between gap-2">
                                                        <span className="text-xl">{iconoDisciplina(c.disciplina)}</span>
                                                        <span className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold ${seleccionada ? 'bg-claro-primario border-claro-primario text-white dark:bg-oscuro-primario dark:border-oscuro-primario' : 'border-claro-borde dark:border-oscuro-borde'}`}>
                                                            {seleccionada ? '✓' : ''}
                                                        </span>
                                                    </div>
                                                    <div className="font-semibold text-sm text-claro-texto dark:text-oscuro-texto mt-1">{c.nombre}</div>
                                                    <div className="text-xs text-claro-texto2 dark:text-oscuro-texto2">{c.disciplina}{c.ubicacion ? ` · ${c.ubicacion}` : ''}</div>
                                                    <div className="text-xs text-claro-texto2 dark:text-oscuro-texto2">
                                                        Bs. {c.precio_hora}/hr{c.capacidad ? ` · ${c.capacidad} pers.` : ''}
                                                    </div>
                                                    {ocupada && <div className="mt-1 text-xs font-bold text-red-600 dark:text-red-400">Ocupada en este horario</div>}
                                                    {!ocupada && mantenimiento && <div className="mt-1 text-xs font-bold text-amber-600 dark:text-amber-400">En mantenimiento</div>}
                                                    {!ocupada && !mantenimiento && formData.fecha_evento && formData.hora_inicio && formData.hora_fin && (
                                                        <div className="mt-1 text-xs font-bold text-green-600 dark:text-green-400">Libre</div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-claro-borde dark:border-oscuro-borde">
                                    <button type="button" onClick={cerrarModal} className="px-5 py-2.5 rounded-xl font-medium text-claro-texto2 hover:bg-gray-100 dark:text-oscuro-texto2 dark:hover:bg-oscuro-fondo transition-colors">Cancelar</button>
                                    <button type="submit" className="px-5 py-2.5 rounded-xl font-bold bg-claro-primario text-white hover:bg-opacity-90 dark:bg-oscuro-primario shadow-md transition-all">{modoReprogramar ? 'Reprogramar Evento' : eventoEnEdicion ? 'Guardar Cambios' : 'Guardar Evento'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: clientes inscritos */}
            {eventoInscritos && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-claro-tarjeta dark:bg-oscuro-tarjeta rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-claro-borde dark:border-oscuro-borde">
                        <div className="p-6 border-b border-claro-borde dark:border-oscuro-borde flex justify-between items-start gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-claro-texto dark:text-oscuro-texto">Clientes inscritos</h3>
                                <p className="text-sm text-claro-texto2 dark:text-oscuro-texto2">
                                    {eventoInscritos.nombre_evento} · {inscritos.filter(i => i.estado === 'confirmada').length} confirmados de {eventoInscritos.cupo_maximo} cupos
                                </p>
                            </div>
                            <button onClick={() => setEventoInscritos(null)} className="text-claro-texto2 hover:text-claro-texto dark:text-oscuro-texto2 dark:hover:text-white">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="overflow-auto">
                            <table className="w-full text-left text-sm text-claro-texto dark:text-oscuro-texto">
                                <thead className="bg-gray-50 dark:bg-oscuro-fondo border-b border-claro-borde dark:border-oscuro-borde text-claro-texto2 dark:text-oscuro-texto2">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">#</th>
                                        <th className="px-4 py-3 font-medium">Cliente</th>
                                        <th className="px-4 py-3 font-medium">Correo</th>
                                        <th className="px-4 py-3 font-medium">Teléfono</th>
                                        <th className="px-4 py-3 font-medium">CI/NIT</th>
                                        <th className="px-4 py-3 font-medium">Inscripción</th>
                                        <th className="px-4 py-3 font-medium">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-claro-borde dark:divide-oscuro-borde">
                                    {cargandoInscritos ? (
                                        <tr><td colSpan={7} className="px-4 py-8 text-center text-claro-texto2 dark:text-oscuro-texto2">Cargando inscritos...</td></tr>
                                    ) : inscritos.length === 0 ? (
                                        <tr><td colSpan={7} className="px-4 py-8 text-center text-claro-texto2 dark:text-oscuro-texto2">Aún no hay clientes inscritos en este evento.</td></tr>
                                    ) : inscritos.map((i, idx) => (
                                        <tr key={i.id_inscripcion}>
                                            <td className="px-4 py-3">{idx + 1}</td>
                                            <td className="px-4 py-3 font-medium">{[i.nombre, i.apellido_paterno, i.apellido_materno].filter(Boolean).join(' ')}</td>
                                            <td className="px-4 py-3">{i.correo}</td>
                                            <td className="px-4 py-3">{i.telefono || '—'}</td>
                                            <td className="px-4 py-3">{i.ci_nit || '—'}</td>
                                            <td className="px-4 py-3">{new Date(i.fecha_inscripcion).toLocaleString('es-ES')}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                                                    i.estado === 'confirmada' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                                    : i.estado === 'cancelada_por_evento' ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                                                    : 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`}>
                                                    {i.estado === 'cancelada_por_evento' ? 'evento cancelado' : i.estado}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: canchas del evento con fotos */}
            <CanchasEventoModal evento={eventoCanchasVer} onClose={() => setEventoCanchasVer(null)} />

            {/* Modal: cancelar evento (reemplaza al prompt del navegador) */}
            {eventoACancelar && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-claro-tarjeta dark:bg-oscuro-tarjeta rounded-2xl w-full max-w-md shadow-2xl border border-claro-borde dark:border-oscuro-borde p-6 space-y-4">
                        <h3 className="text-xl font-bold text-claro-texto dark:text-oscuro-texto">Cancelar evento</h3>
                        <p className="text-sm text-claro-texto2 dark:text-oscuro-texto2">
                            Se cancelará <span className="font-semibold text-claro-texto dark:text-oscuro-texto">{eventoACancelar.nombre_evento}</span>.
                            {Number(eventoACancelar.inscritos) > 0
                                ? <> Hay <span className="font-semibold text-red-600 dark:text-red-400">{eventoACancelar.inscritos} cliente(s) inscrito(s)</span> que quedarán sin cupo.</>
                                : ' No hay clientes inscritos.'}
                        </p>
                        <div>
                            <label className="block text-sm font-medium text-claro-texto dark:text-oscuro-texto mb-1">Motivo de la cancelación</label>
                            <textarea
                                rows={3}
                                autoFocus
                                className="w-full px-3 py-2 rounded-lg border border-claro-borde dark:border-oscuro-borde bg-claro-fondo dark:bg-oscuro-fondo text-claro-texto dark:text-oscuro-texto"
                                placeholder="Ej: Clima adverso, cancha en mantenimiento..."
                                value={motivoCancelacion}
                                onChange={e => setMotivoCancelacion(e.target.value)}
                            />
                            <p className="text-xs text-claro-texto2 dark:text-oscuro-texto2 mt-1">Los clientes inscritos verán este motivo en "Mis inscripciones".</p>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setEventoACancelar(null)} disabled={cancelando} className="px-4 py-2 rounded-xl font-medium text-claro-texto2 hover:bg-gray-100 dark:text-oscuro-texto2 dark:hover:bg-oscuro-fondo">Volver</button>
                            <button onClick={handleCancelarEvento} disabled={cancelando} className="px-4 py-2 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
                                {cancelando ? 'Cancelando...' : 'Cancelar evento'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionEventos;