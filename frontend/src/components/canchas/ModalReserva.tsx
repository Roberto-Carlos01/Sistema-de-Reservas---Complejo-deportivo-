import { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import FieldError from '../FieldError';
import type { Cancha } from './cancha.types';

interface ModalReservaProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    cancha: Cancha | null;
    esPresencial?: boolean;
}

type MetodoPago = 'presencial' | 'tarjeta' | 'qr';

const ModalReserva = ({ isOpen, onClose, onSave, cancha = null, esPresencial = false }: ModalReservaProps) => {
    const { usuario } = useAuth();
    const requiereCliente = Boolean(
        esPresencial ||
        (usuario && (usuario.rol === 'Admin' || usuario.rol === 'Administrador' || usuario.rol === 'Empleado' || usuario.rol === 'empleado'))
    );

    const [paso, setPaso] = useState<'reserva' | 'pago'>('reserva');
    const [formData, setFormData] = useState({
        fecha_reserva: '',
        hora_inicio: '',
        hora_fin: '',
        id_cancha: cancha?.id_cancha || '',
        id_cliente: '',
        observaciones: ''
    });
    
    const [pagoData, setPagoData] = useState({
        metodo_pago: 'presencial' as MetodoPago,
        comprobante: null as File | null,
        nro_comprobante: ''
    });
    const [vistaPreviaComprobante, setVistaPreviaComprobante] = useState('');
    
    const [canchas, setCanchas] = useState<Cancha[]>([]);
    const [clientes, setClientes] = useState<any[]>([]);
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const [monto, setMonto] = useState(0);
    const [idReservaCreada, setIdReservaCreada] = useState<number | null>(null);
    const [successMsg, setSuccessMsg] = useState('');
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const fetchData = async () => {
            try {
                if (!cancha) {
                    const res = await api.get('/canchas');
                    setCanchas(res.data.data || []);
                }
                if (requiereCliente) {
                    const res = await api.get('/usuarios');
                    const usuarios = res.data?.data || res.data || [];
                    const clientesFiltrados = (Array.isArray(usuarios) ? usuarios : []).filter((usuarioActual) => {
                        const rol = String(usuarioActual.rol || '').trim().toLowerCase();
                        return rol === 'cliente' || rol === 'cliente';
                    });
                    setClientes(clientesFiltrados);
                }
            } catch (err) {
                console.error('Error al cargar datos', err);
            }
        };
        fetchData();
    }, [isOpen, cancha, requiereCliente]);

    useEffect(() => {
        if (cancha) {
            setFormData(prev => ({ ...prev, id_cancha: cancha.id_cancha }));
        }
    }, [cancha]);

    useEffect(() => {
        if (isOpen) {
            setPaso('reserva');
            setFormData({
                fecha_reserva: '',
                hora_inicio: '',
                hora_fin: '',
                id_cancha: cancha?.id_cancha || '',
                id_cliente: '',
                observaciones: ''
            });
            setPagoData({ metodo_pago: 'presencial', comprobante: null, nro_comprobante: '' });
            setErrores({});
            setError('');
            setMonto(0);
            setIdReservaCreada(null);
            setSuccessMsg('');
        }
    }, [isOpen]);

    const calcularMonto = () => {
        if (!formData.id_cancha || !formData.hora_inicio || !formData.hora_fin) {
            setMonto(0);
            return;
        }
        
        const canchaSeleccionada = cancha?.id_cancha === Number(formData.id_cancha) 
            ? cancha 
            : canchas.find(c => c.id_cancha === Number(formData.id_cancha));
        
        if (!canchaSeleccionada || !canchaSeleccionada.precio_hora) {
            setMonto(0);
            return;
        }
        
        const [hi, mi] = formData.hora_inicio.split(':').map(Number);
        const [hf, mf] = formData.hora_fin.split(':').map(Number);
        const horas = (hf * 60 + mf - (hi * 60 + mi)) / 60;
        
        if (horas > 0) {
            setMonto(horas * Number(canchaSeleccionada.precio_hora));
        } else {
            setMonto(0);
        }
    };

    useEffect(() => {
        calcularMonto();
    }, [formData.hora_inicio, formData.hora_fin, formData.id_cancha, cancha, canchas]);

    useEffect(() => {
        if (!pagoData.comprobante) {
            setVistaPreviaComprobante('');
            return;
        }
        const url = URL.createObjectURL(pagoData.comprobante);
        setVistaPreviaComprobante(url);
        return () => URL.revokeObjectURL(url);
    }, [pagoData.comprobante]);

    if (!isOpen) return null;

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errores[name]) setErrores(prev => ({ ...prev, [name]: '' }));
    };

    const validarReserva = () => {
        const nuevosErrores: Record<string, string> = {};
        if (!formData.fecha_reserva) nuevosErrores.fecha_reserva = 'La fecha es obligatoria';
        if (!formData.hora_inicio) nuevosErrores.hora_inicio = 'La hora de inicio es obligatoria';
        if (!formData.hora_fin) nuevosErrores.hora_fin = 'La hora de fin es obligatoria';
        if (!formData.id_cancha) nuevosErrores.id_cancha = 'Debe seleccionar una cancha';
        if (requiereCliente && !formData.id_cliente) nuevosErrores.id_cliente = 'Debe seleccionar un cliente';
        
        if (formData.hora_inicio && formData.hora_fin && formData.hora_inicio >= formData.hora_fin) {
            nuevosErrores.hora_fin = 'La hora de fin debe ser mayor a la de inicio';
        }
        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    const handleCrearReserva = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!validarReserva()) return;

        setCargando(true);
        try {
            const payload: any = {
                fecha_reserva: formData.fecha_reserva,
                hora_inicio: formData.hora_inicio,
                hora_fin: formData.hora_fin,
                id_cancha: Number(formData.id_cancha),
                observaciones: formData.observaciones || undefined
            };
            
            if (requiereCliente) {
                const idCliente = Number(formData.id_cliente);
                if (!Number.isInteger(idCliente) || idCliente <= 0) {
                    setError('Selecciona un cliente válido antes de continuar.');
                    setCargando(false);
                    return;
                }
                payload.id_cliente = idCliente;
            }
            
            const res = await api.post('/reservas', payload);
            const idReserva = res.data?.data?.id_reserva || res.data?.id_reserva;
            setIdReservaCreada(idReserva);
            if (!esPresencial) {
                onSave();
                onClose();
                return;
            }
            setPaso('pago');
        } catch (err: any) {
            console.error('Error al crear reserva:', err.response?.data);
            setError(err.response?.data?.message || 'Error al crear la reserva');
        } finally {
            setCargando(false);
        }
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
            if (!validTypes.includes(file.type)) {
                setErrores(prev => ({ ...prev, comprobante: 'Solo se permiten imágenes (JPG, PNG, WEBP) o PDF' }));
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setErrores(prev => ({ ...prev, comprobante: 'El archivo no debe superar 5MB' }));
                return;
            }
            setPagoData(prev => ({ ...prev, comprobante: file }));
            if (errores.comprobante) setErrores(prev => ({ ...prev, comprobante: '' }));
        }
    };

    const handleEnviarPago = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        const esVirtual = ['tarjeta', 'qr'].includes(pagoData.metodo_pago);
        
        if (esVirtual && !pagoData.comprobante) {
            setErrores({ comprobante: 'Para pagos virtuales es obligatorio subir el comprobante' });
            return;
        }
        if (esVirtual && !pagoData.nro_comprobante.trim()) {
            setErrores({ nro_comprobante: 'Ingresa el número de operación que aparece en el comprobante' });
            return;
        }

        setCargando(true);
        try {
            if (esVirtual) {
                const formDataPago = new FormData();
                formDataPago.append('id_reserva', String(idReservaCreada));
                formDataPago.append('metodo_pago', pagoData.metodo_pago);
                formDataPago.append('nro_comprobante', pagoData.nro_comprobante.trim());
                if (pagoData.comprobante) {
                    formDataPago.append('comprobante', pagoData.comprobante);
                }

                await api.post('/pagos/procesar-con-comprobante', formDataPago, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setSuccessMsg('¡Comprobante enviado! Tu reserva será verificada pronto.');
            } else {
                await api.post('/pagos/procesar', {
                    id_reserva: idReservaCreada,
                    metodo_pago: 'presencial'
                });
                setSuccessMsg('¡Reserva confirmada! Pago presencial registrado.');
            }
            onSave();
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err: any) {
            console.error('Error al procesar pago:', err.response?.data);
            setError(err.response?.data?.error || err.response?.data?.message || 'Error al procesar el pago');
        } finally {
            setCargando(false);
        }
    };

    const metodosPago: { value: MetodoPago; label: string }[] = [
        { value: 'presencial', label: 'Físico' },
        { value: 'qr', label: 'QR' },
        { value: 'tarjeta', label: 'Tarjeta' },
    ];

    const esVirtual = ['tarjeta', 'qr'].includes(pagoData.metodo_pago);

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${paso === 'pago' ? 'bg-black/60' : 'bg-black/60 backdrop-blur-sm'}`} onMouseDown={(event) => paso === 'pago' && event.target === event.currentTarget && onClose()}>
            <div className={`max-h-[92vh] w-full overflow-y-auto border border-claro-borde bg-claro-tarjeta text-claro-texto shadow-2xl dark:border-oscuro-borde dark:bg-oscuro-tarjeta dark:text-oscuro-texto ${paso === 'pago' ? 'max-w-2xl rounded-lg' : 'max-w-2xl rounded-2xl'}`}>
                
                <header className={paso === 'pago' ? 'flex items-start justify-between gap-4 border-b border-claro-borde p-5 dark:border-oscuro-borde' : 'flex items-center justify-between border-b border-claro-borde px-6 py-4 dark:border-oscuro-borde'}>
                    <div>
                        <h2 id={paso === 'pago' ? 'pago-titulo' : undefined} className={paso === 'pago' ? 'text-xl font-bold text-claro-texto dark:text-oscuro-texto' : 'text-xl font-semibold text-claro-texto dark:text-oscuro-texto'}>
                            {paso === 'reserva'
                                ? (cancha ? `Reservar ${cancha.nombre}` : 'Nueva Reserva')
                                : 'Registrar pago'}
                        </h2>
                        {paso === 'pago' ? (
                            <p className="mt-1 text-sm text-claro-texto2 dark:text-oscuro-texto2">
                                {cancha?.nombre || canchas.find(item => item.id_cancha === Number(formData.id_cancha))?.nombre || 'Cancha'} · {formData.fecha_reserva ? new Date(`${formData.fecha_reserva}T12:00:00`).toLocaleDateString('es-BO') : 'Fecha'} · {formData.hora_inicio.slice(0, 5)}–{formData.hora_fin.slice(0, 5)}
                            </p>
                        ) : null}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Cerrar" className={paso === 'pago' ? 'rounded-md border border-claro-borde px-3 py-1 text-xl leading-none dark:border-oscuro-borde' : 'text-claro-texto2 hover:text-claro-texto dark:text-oscuro-texto2 dark:hover:text-oscuro-texto'}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                {successMsg ? (
                    <div className="p-8 text-center">
                        <div className="text-5xl mb-4">✅</div>
                        <p className="text-lg font-medium text-green-600 dark:text-green-400">{successMsg}</p>
                    </div>
                ) : paso === 'reserva' ? (
                    <form onSubmit={handleCrearReserva} className="p-6 space-y-4">
                        
                        {requiereCliente && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Cliente *</label>
                                <select name="id_cliente" value={formData.id_cliente} onChange={handleChange}
                                    className="w-full px-3 py-2.5 border rounded-xl bg-claro-fondo dark:bg-oscuro-fondo">
                                    <option value="">Seleccione un cliente</option>
                                    {clientes.map(c => {
                                        const idCliente = c.id_cliente ?? c.id_usuario ?? c.id;
                                        return <option key={idCliente} value={String(idCliente)}>
                                            {c.nombre} {c.paterno || c.apellido_paterno || c.apellidoPaterno || ''} - {c.correo}
                                        </option>;
                                    })}
                                </select>
                                {clientes.length === 0 && <p className="mt-1 text-xs text-red-600">No se pudieron cargar clientes disponibles.</p>}
                                {errores.id_cliente && <FieldError error={errores.id_cliente} touched={true} />}
                            </div>
                        )}

                        {!cancha && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Cancha *</label>
                                <select name="id_cancha" value={formData.id_cancha} onChange={handleChange}
                                    className="w-full px-3 py-2.5 border rounded-xl bg-claro-fondo dark:bg-oscuro-fondo">
                                    <option value="">Seleccione una cancha</option>
                                    {canchas.map(c => (
                                        <option key={c.id_cancha} value={c.id_cancha}>
                                            {c.nombre} - {c.disciplina} (Bs. {c.precio_hora}/h)
                                        </option>
                                    ))}
                                </select>
                                {errores.id_cancha && <FieldError error={errores.id_cancha} touched={true} />}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-1">Fecha *</label>
                            <input type="date" name="fecha_reserva" value={formData.fecha_reserva} onChange={handleChange}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-3 py-2.5 border rounded-xl bg-claro-fondo dark:bg-oscuro-fondo" />
                            {errores.fecha_reserva && <FieldError error={errores.fecha_reserva} touched={true} />}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Hora Inicio *</label>
                                <input type="time" name="hora_inicio" value={formData.hora_inicio} onChange={handleChange}
                                    className="w-full px-3 py-2.5 border rounded-xl bg-claro-fondo dark:bg-oscuro-fondo" />
                                {errores.hora_inicio && <FieldError error={errores.hora_inicio} touched={true} />}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Hora Fin *</label>
                                <input type="time" name="hora_fin" value={formData.hora_fin} onChange={handleChange}
                                    className="w-full px-3 py-2.5 border rounded-xl bg-claro-fondo dark:bg-oscuro-fondo" />
                                {errores.hora_fin && <FieldError error={errores.hora_fin} touched={true} />}
                            </div>
                        </div>

                        {monto > 0 && (
                            <div className="bg-claro-primario/10 dark:bg-oscuro-primario/10 rounded-xl p-4">
                                <p className="text-sm text-claro-texto2">Monto estimado:</p>
                                <p className="text-2xl font-bold text-claro-primario">Bs. {monto.toFixed(2)}</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-1">Observaciones</label>
                            <textarea name="observaciones" value={formData.observaciones} onChange={handleChange}
                                rows={2} placeholder="Ej: Necesito pelotas, petos, etc."
                                className="w-full px-3 py-2.5 border rounded-xl bg-claro-fondo dark:bg-oscuro-fondo resize-none" />
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-claro-borde dark:border-oscuro-borde">
                            <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium rounded-lg hover:bg-claro-tinte">
                                Cancelar
                            </button>
                            <button type="submit" disabled={cargando}
                                className={`px-5 py-2 text-sm font-medium rounded-lg shadow-sm transition-all
                                    ${cargando ? 'bg-gray-400 cursor-not-allowed' : 'bg-claro-primario hover:bg-claro-hover text-white'}`}>
                                {cargando ? 'Procesando...' : 'Continuar al Pago'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleEnviarPago} className="space-y-5 p-5">
                        <fieldset disabled={cargando}>
                            <legend className="mb-3 text-sm font-semibold text-claro-texto dark:text-oscuro-texto">Método utilizado</legend>
                            <div className="grid grid-cols-3 gap-2">
                                {metodosPago.map((opcion) => <label key={opcion.value} className={`relative flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border p-3 text-center transition-colors focus-within:ring-2 focus-within:ring-claro-primario focus-within:ring-offset-2 dark:focus-within:ring-offset-oscuro-tarjeta ${pagoData.metodo_pago === opcion.value ? 'border-claro-primario bg-claro-primario/10 text-claro-primario dark:border-oscuro-primario dark:bg-oscuro-primario/15 dark:text-oscuro-primario' : 'border-claro-borde bg-claro-tarjeta text-claro-texto hover:bg-claro-tinte dark:border-oscuro-borde dark:bg-oscuro-tarjeta dark:text-oscuro-texto dark:hover:bg-oscuro-tinte'}`}>
                                    <input type="radio" name="metodo-pago-admin" value={opcion.value} checked={pagoData.metodo_pago === opcion.value} onChange={() => setPagoData(prev => ({ ...prev, metodo_pago: opcion.value }))} className="sr-only" />
                                    <span aria-hidden="true" className="text-2xl">{opcion.value === 'presencial' ? '▣' : opcion.value === 'qr' ? '▦' : '▤'}</span>
                                    <span className="text-sm font-semibold">{opcion.label}</span>
                                    {pagoData.metodo_pago === opcion.value && <span className="absolute right-2 top-2 text-xs font-bold" aria-label="Seleccionado">✓</span>}
                                </label>)}
                            </div>
                        </fieldset>

                        {esVirtual ? <>
                            <div className={`rounded-md border p-3 text-sm ${pagoData.metodo_pago === 'tarjeta' ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200' : 'border-claro-borde bg-claro-tarjeta text-claro-texto2 dark:border-oscuro-borde dark:bg-oscuro-tarjeta dark:text-oscuro-texto2'}`}>
                                {pagoData.metodo_pago === 'tarjeta'
                                    ? 'El pago con tarjeta se realiza fuera de la aplicación. No ingreses datos de tarjeta; adjunta el comprobante para revisión manual.'
                                    : 'Realiza el pago por el canal QR indicado por el complejo y adjunta el recibo. El personal verificará el abono manualmente.'}
                            </div>

                            <label className="block text-sm font-medium" htmlFor="operacion-pago-presencial">
                                Número de operación del recibo
                                <input id="operacion-pago-presencial" type="text" value={pagoData.nro_comprobante} onChange={(event) => {
                                    setPagoData(prev => ({ ...prev, nro_comprobante: event.target.value }));
                                    if (errores.nro_comprobante) setErrores(prev => ({ ...prev, nro_comprobante: '' }));
                                }} required maxLength={50} placeholder="Código que aparece en el comprobante" className="mt-1 w-full rounded-md border border-claro-borde bg-claro-fondo p-3 text-claro-texto placeholder:text-claro-texto2 dark:border-oscuro-borde dark:bg-oscuro-fondo dark:text-oscuro-texto dark:placeholder:text-oscuro-texto2" />
                                <span className="mt-1 block text-xs font-normal text-claro-texto2 dark:text-oscuro-texto2">Referencia interna: RES-{idReservaCreada}</span>
                                {errores.nro_comprobante && <FieldError error={errores.nro_comprobante} touched={true} />}
                            </label>

                            <label className="block text-sm font-semibold text-claro-texto dark:text-oscuro-texto" htmlFor="comprobante-pago-personal">
                                Comprobante de pago
                                <span className="mt-1 block text-xs font-normal text-claro-texto2 dark:text-oscuro-texto2">JPG, PNG, WEBP o PDF · máximo 5 MB</span>
                                <span className="mt-2 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-claro-borde bg-claro-fondo px-4 py-4 text-center hover:border-claro-primario dark:border-oscuro-borde dark:bg-oscuro-fondo dark:hover:border-oscuro-primario">
                                    <span aria-hidden="true" className="text-2xl text-claro-primario dark:text-oscuro-primario">↑</span>
                                    <span className="mt-1 text-sm font-medium text-claro-texto dark:text-oscuro-texto">{pagoData.comprobante?.name || 'Selecciona el archivo del recibo'}</span>
                                    <span className="mt-1 text-xs font-normal text-claro-texto2 dark:text-oscuro-texto2">{pagoData.comprobante ? `${(pagoData.comprobante.size / 1024 / 1024).toFixed(2)} MB` : 'Busca una imagen o PDF en tu dispositivo'}</span>
                                </span>
                                <input id="comprobante-pago-personal" ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required onChange={handleFileChange} className="sr-only" />
                                {errores.comprobante && <FieldError error={errores.comprobante} touched={true} />}
                            </label>
                            {pagoData.comprobante && <div className="rounded-md border border-claro-borde p-3 dark:border-oscuro-borde">
                                <p className="mb-2 text-xs font-semibold text-claro-texto2 dark:text-oscuro-texto2">Vista previa del comprobante</p>
                                {pagoData.comprobante.type.startsWith('image/')
                                    ? <img src={vistaPreviaComprobante} alt="Vista previa del comprobante seleccionado" className="max-h-64 w-full rounded object-contain" />
                                    : <a href={vistaPreviaComprobante} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-claro-primario underline dark:text-oscuro-primario">Abrir PDF seleccionado</a>}
                            </div>}
                        </> : <p className="rounded-md border border-claro-borde bg-claro-tarjeta p-3 text-sm text-claro-texto2 dark:border-oscuro-borde dark:bg-oscuro-tarjeta dark:text-oscuro-texto2">El personal registrará el pago en caja y confirmará la reserva.</p>}

                        <section className="overflow-hidden rounded-md border border-claro-borde bg-claro-fondo dark:border-oscuro-borde dark:bg-oscuro-fondo">
                            <div className="border-b border-claro-borde px-4 py-3 dark:border-oscuro-borde">
                                <h3 className="text-sm font-bold text-claro-texto dark:text-oscuro-texto">Detalle del importe</h3>
                                <p className="mt-1 text-xs text-claro-texto2 dark:text-oscuro-texto2">{cancha?.nombre || canchas.find(item => item.id_cancha === Number(formData.id_cancha))?.nombre || 'Cancha'} · {(() => {
                                    const [hi, mi] = formData.hora_inicio.split(':').map(Number);
                                    const [hf, mf] = formData.hora_fin.split(':').map(Number);
                                    return Math.max(0, (hf * 60 + mf - hi * 60 - mi) / 60);
                                })()} h</p>
                            </div>
                            <div className="px-4 py-4 text-sm text-claro-texto dark:text-oscuro-texto">
                                <div className="flex items-start justify-between gap-4"><span>Uso de cancha</span><span className="shrink-0 font-medium">Bs. {monto.toFixed(2)}</span></div>
                            </div>
                            <div className="flex items-center justify-between gap-4 border-t border-claro-borde bg-claro-primario/5 px-4 py-4 dark:border-oscuro-borde dark:bg-oscuro-primario/10">
                                <span className="font-bold text-claro-texto dark:text-oscuro-texto">Total a pagar</span>
                                <span className="text-2xl font-bold text-claro-primario dark:text-oscuro-primario">Bs. {monto.toFixed(2)}</span>
                            </div>
                            <p className="px-4 pb-3 text-xs text-claro-texto2 dark:text-oscuro-texto2">El servidor recalcula el total usando la tarifa vigente de la cancha.</p>
                        </section>

                        {error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
                        {successMsg && <p role="status" className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200">{successMsg}</p>}
                        <div className="flex flex-col-reverse justify-end gap-2 border-t border-claro-borde pt-4 dark:border-oscuro-borde sm:flex-row">
                            <button type="button" onClick={() => setPaso('reserva')} className="rounded-md border border-claro-borde px-4 py-2 text-sm font-semibold dark:border-oscuro-borde">Volver</button>
                            <button type="submit" disabled={cargando || (esVirtual && (!pagoData.comprobante || !pagoData.nro_comprobante.trim()))} className="rounded-md bg-claro-primario px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                                {cargando ? 'Procesando…' : esVirtual ? 'Enviar comprobante' : `Registrar pago · Bs. ${monto.toFixed(2)}`}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ModalReserva;
