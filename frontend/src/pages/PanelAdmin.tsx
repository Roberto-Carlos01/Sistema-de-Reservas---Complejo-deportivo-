import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ModalUsuario from '../components/ModalUsuario';

// =====================================================
// TIPOS
// =====================================================
interface Usuario {
    id?: number;
    id_usuario?: number;
    _id?: string | number;
    nombre?: string;
    apellidos?: string;
    correo?: string;
    rol?: string;
    estado?: string;
    estado_cuenta?: string;
    [key: string]: unknown;
}

interface ImpactoUsuario {
    reservas: number;
    pagos: number;
    inscripciones: number;
    eventos: number;
    canchasAdministradas: number;
    canchasControladas: number;
    supervisiones: number;
    total: number;
}

type TipoNotificacion = 'exito' | 'error' | 'info';

interface Notificacion {
    tipo: TipoNotificacion;
    mensaje: string;
}

// Helper: obtiene el ID real sin importar cómo lo llame el backend
const obtenerId = (user: Usuario): number | string | undefined => {
    return user.id ?? user.id_usuario ?? user._id;
};

// Helper: obtiene el estado normalizado
const obtenerEstado = (user: Usuario): string => {
    return (user.estado || user.estado_cuenta || '').toString().trim();
};

// Helper: ¿el estado es "activo"? (case-insensitive)
const esActivo = (user: Usuario): boolean => {
    const est = obtenerEstado(user).toLowerCase();
    return est === 'activo' || est === 'active' || est === 'habilitado';
};

// =====================================================
// COMPONENTE
// =====================================================
const PanelAdmin = () => {
    const navigate = useNavigate();
    const { token } = useAuth();

    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [eliminandoId, setEliminandoId] = useState<number | string | null>(null);
    const [errorAccion, setErrorAccion] = useState<string>('');
    const [usuarioBaja, setUsuarioBaja] = useState<Usuario | null>(null);
    const [impactoBaja, setImpactoBaja] = useState<ImpactoUsuario | null>(null);
    const [errorBaja, setErrorBaja] = useState<string>('');
    const [procesandoBaja, setProcesandoBaja] = useState<boolean>(false);

    // Notificación emergente (toast)
    const [notificacion, setNotificacion] = useState<Notificacion | null>(null);

    const [modalAbierto, setModalAbierto] = useState<boolean>(false);
    const [usuarioIdEditar, setUsuarioIdEditar] = useState<number | null>(null);

    const [busqueda, setBusqueda] = useState<string>('');
    const [filtroRol, setFiltroRol] = useState<string>('todos');
    const [filtroEstado, setFiltroEstado] = useState<string>('todos');

    const [paginaActual, setPaginaActual] = useState<number>(1);
    const [porPagina, setPorPagina] = useState<number>(10);

    const mostrarNotificacion = useCallback(
        (tipo: TipoNotificacion, mensaje: string): void => {
            setNotificacion({ tipo, mensaje });
        },
        []
    );

    // Auto-dismiss de la notificación
    useEffect(() => {
        if (!notificacion) return;
        const timer = setTimeout(() => setNotificacion(null), 3000);
        return () => clearTimeout(timer);
    }, [notificacion]);

    const fetchUsuarios = useCallback(async (): Promise<void> => {
        try {
            setCargando(true);
            const respuesta = await api.get<Usuario[]>('/usuarios');
            setUsuarios(respuesta.data);
            setError('');
        } catch (err: any) {
            console.error('Error al cargar usuarios:', err.response?.data || err.message);
            setError('Error al cargar los usuarios. Verifica tu conexión al servidor.');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        if (token) fetchUsuarios();
    }, [token, fetchUsuarios]);

    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda, filtroRol, filtroEstado, porPagina]);

    const abrirModalNuevo = (): void => {
        setUsuarioIdEditar(null);
        setModalAbierto(true);
    };

    const abrirModalEditar = (usuario: Usuario): void => {
        const id = obtenerId(usuario);
        if (id === undefined || id === null) {
            setErrorAccion('No se pudo identificar el usuario a editar.');
            return;
        }
        setErrorAccion('');
        setUsuarioIdEditar(Number(id));
        setModalAbierto(true);
    };

    const handleGuardarUsuario = (): void => {
        const fueEdicion = usuarioIdEditar !== null;
        fetchUsuarios();
        mostrarNotificacion(
            'exito',
            fueEdicion ? 'Usuario actualizado con éxito' : 'Usuario creado con éxito'
        );
    };

    // =====================================================
    // ELIMINAR USUARIO
    // =====================================================
    const cerrarModalBaja = (): void => {
        if (procesandoBaja) return;
        setUsuarioBaja(null);
        setImpactoBaja(null);
        setErrorBaja('');
    };

    const mensajeErrorBaja = (err: any): string => {
        const status = err.response?.status;
        const mensajeBackend =
            err.response?.data?.error ||
            err.response?.data?.message ||
            err.message ||
            'Error desconocido';

        if (status === 401 || status === 403) {
            return 'No tienes permisos para gestionar usuarios o tu sesión expiró. Vuelve a iniciar sesión.';
        }
        if (status === 404) {
            return 'El usuario no existe o ya fue eliminado.';
        }
        return `No se pudo completar la operación: ${mensajeBackend}`;
    };

    const ejecutarBaja = async (accion: 'desactivar' | 'eliminar'): Promise<void> => {
        const id = usuarioBaja ? obtenerId(usuarioBaja) : undefined;
        if (id === undefined || id === null || id === '') {
            setErrorBaja('No se pudo identificar el usuario.');
            return;
        }

        setProcesandoBaja(true);
        setEliminandoId(id);
        setErrorBaja('');

        try {
            if (accion === 'desactivar') {
                await api.put(`/usuarios/estado/${id}`, { estado: 'inactivo' });
                mostrarNotificacion('exito', 'Usuario desactivado con éxito');
            } else {
                await api.delete(`/usuarios/${id}`);
                mostrarNotificacion('exito', 'Usuario eliminado con éxito');
            }

            setUsuarioBaja(null);
            setImpactoBaja(null);
            await fetchUsuarios();
        } catch (err: any) {
            console.error('Error al gestionar la baja del usuario:', err.response?.data || err.message);
            setErrorBaja(mensajeErrorBaja(err));
        } finally {
            setProcesandoBaja(false);
            setEliminandoId(null);
        }
    };

    const handleEliminar = async (user: Usuario): Promise<void> => {
        const id = obtenerId(user);

        if (id === undefined || id === null || id === '') {
            setErrorAccion('No se pudo identificar el usuario a eliminar (ID inválido).');
            return;
        }

        setEliminandoId(id);

        try {
            // Consultamos el impacto siempre
            const respuesta = await api.get<{ impacto: ImpactoUsuario }>(
                `/usuarios/${id}/impacto`
            );
            const impacto = respuesta.data.impacto;

            // Siempre abrimos el modal de decisión, sin importar si tiene 0 registros
            setUsuarioBaja(user);
            setImpactoBaja(impacto);
            setErrorBaja('');
        } catch (err: any) {
            console.error('Error al preparar la baja del usuario:', err.response?.data || err.message);

            // Cualquier fallo → abrimos modal con el error
            setUsuarioBaja(user);
            setImpactoBaja(null);
            setErrorBaja(mensajeErrorBaja(err));
        } finally {
            setEliminandoId(null);
        }
    };

    // =====================================================
    // LISTAS ÚNICAS PARA LOS FILTROS
    // =====================================================
    const rolesDisponibles = useMemo(() => {
        const set = new Set<string>();
        usuarios.forEach((u) => {
            if (u.rol) set.add(String(u.rol));
        });
        return Array.from(set).sort();
    }, [usuarios]);

    const estadosDisponibles = useMemo(() => {
        const set = new Set<string>();
        usuarios.forEach((u) => {
            const est = obtenerEstado(u);
            if (est) set.add(est);
        });
        return Array.from(set).sort();
    }, [usuarios]);

    // =====================================================
    // FILTRADO + BÚSQUEDA
    // =====================================================
    const usuariosFiltrados = useMemo(() => {
        const term = busqueda.trim().toLowerCase();

        return usuarios.filter((u) => {
            if (term) {
                const nombre = (u.nombre || '').toLowerCase();
                const apellidos = (u.apellidos || '').toLowerCase();
                const correo = (u.correo || '').toLowerCase();
                const coincide =
                    nombre.includes(term) ||
                    apellidos.includes(term) ||
                    correo.includes(term);
                if (!coincide) return false;
            }

            if (filtroRol !== 'todos' && String(u.rol) !== filtroRol) {
                return false;
            }

            if (
                filtroEstado !== 'todos' &&
                obtenerEstado(u).toLowerCase() !== filtroEstado.toLowerCase()
            ) {
                return false;
            }

            return true;
        });
    }, [usuarios, busqueda, filtroRol, filtroEstado]);

    // =====================================================
    // PAGINACIÓN
    // =====================================================
    const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / porPagina));

    useEffect(() => {
        if (paginaActual > totalPaginas) setPaginaActual(totalPaginas);
    }, [paginaActual, totalPaginas]);

    const usuariosPaginados = useMemo(() => {
        const inicio = (paginaActual - 1) * porPagina;
        return usuariosFiltrados.slice(inicio, inicio + porPagina);
    }, [usuariosFiltrados, paginaActual, porPagina]);

    const indiceInicio =
        usuariosFiltrados.length === 0 ? 0 : (paginaActual - 1) * porPagina + 1;
    const indiceFin = Math.min(paginaActual * porPagina, usuariosFiltrados.length);

    const numerosPagina = useMemo(() => {
        const paginas: (number | '...')[] = [];
        const maxVisible = 5;

        if (totalPaginas <= maxVisible + 2) {
            for (let i = 1; i <= totalPaginas; i++) paginas.push(i);
        } else {
            paginas.push(1);
            let inicio = Math.max(2, paginaActual - 1);
            let fin = Math.min(totalPaginas - 1, paginaActual + 1);

            if (paginaActual <= 3) {
                inicio = 2;
                fin = 4;
            }
            if (paginaActual >= totalPaginas - 2) {
                inicio = totalPaginas - 3;
                fin = totalPaginas - 1;
            }

            if (inicio > 2) paginas.push('...');
            for (let i = inicio; i <= fin; i++) paginas.push(i);
            if (fin < totalPaginas - 1) paginas.push('...');
            paginas.push(totalPaginas);
        }

        return paginas;
    }, [totalPaginas, paginaActual]);

    const limpiarFiltros = () => {
        setBusqueda('');
        setFiltroRol('todos');
        setFiltroEstado('todos');
        setPaginaActual(1);
    };

    const hayFiltrosActivos =
        busqueda.trim() !== '' || filtroRol !== 'todos' || filtroEstado !== 'todos';

    const filtrosActivos = [
        busqueda.trim() !== '',
        filtroRol !== 'todos',
        filtroEstado !== 'todos',
    ].filter(Boolean).length;

    // Cálculos para tarjetas
    const totalUsuarios = usuarios.length;
    const usuariosActivos = usuarios.filter((u) => esActivo(u)).length;
    const usuariosSuspendidos = usuarios.filter((u) => {
        const est = obtenerEstado(u).toLowerCase();
        return est === 'inactivo' || est === 'suspendido' || est === 'bloqueado';
    }).length;
    const usuariosAdmin = usuarios.filter((u) => {
        const rol = (u.rol || '').toLowerCase();
        return rol === 'admin' || rol === 'administrador';
    }).length;

    return (
        <div className="space-y-6">
            {/* ============================================ */}
            {/* NOTIFICACIÓN EMERGENTE (TOAST) — arriba izq. */}
            {/* ============================================ */}
            {notificacion && (
                <>
                    <style>{`
                        @keyframes toastSlideInLeft {
                            from { opacity: 0; transform: translateX(-24px); }
                            to   { opacity: 1; transform: translateX(0); }
                        }
                    `}</style>
                    <div
                        role="status"
                        aria-live="polite"
                        className="fixed top-4 left-4 z-[200] pointer-events-none"
                        style={{ animation: 'toastSlideInLeft 0.3s ease-out' }}
                    >
                        <div
                            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm min-w-[260px] max-w-sm ${
                                notificacion.tipo === 'exito'
                                    ? 'bg-green-50/95 border-green-200 text-green-800 dark:bg-green-950/80 dark:border-green-800 dark:text-green-300'
                                    : notificacion.tipo === 'error'
                                      ? 'bg-red-50/95 border-red-200 text-red-800 dark:bg-red-950/80 dark:border-red-800 dark:text-red-300'
                                      : 'bg-blue-50/95 border-blue-200 text-blue-800 dark:bg-blue-950/80 dark:border-blue-800 dark:text-blue-300'
                            }`}
                        >
                            <span className="shrink-0 mt-0.5">
                                {notificacion.tipo === 'exito' ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                ) : notificacion.tipo === 'error' ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                            </span>
                            <span className="text-sm font-medium flex-1">
                                {notificacion.mensaje}
                            </span>
                            <button
                                type="button"
                                onClick={() => setNotificacion(null)}
                                className="text-xs opacity-60 hover:opacity-100 transition-opacity"
                                aria-label="Cerrar notificación"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </>
            )}

            {errorAccion && (
                <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                >
                    <div className="flex items-center justify-between gap-3">
                        <span>{errorAccion}</span>
                        <button
                            type="button"
                            onClick={() => setErrorAccion('')}
                            className="font-semibold hover:underline"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
            {/* Cabecera */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-claro-texto dark:text-oscuro-texto">
                        Usuarios
                    </h1>
                    <p className="text-claro-texto2 dark:text-oscuro-texto2 text-sm mt-1">
                        Resumen general de las cuentas registradas.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={() => navigate('/reportes?tab=usuarios')}
                        className="px-5 py-2.5 rounded-xl bg-[#245743] text-white font-medium hover:bg-[#173F30] transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        📊 Reporte de usuarios
                    </button>
                    <button
                        onClick={abrirModalNuevo}
                        className="px-5 py-2.5 bg-claro-primario hover:bg-claro-hover dark:bg-oscuro-primario dark:text-oscuro-fondo dark:hover:bg-oscuro-hover text-white font-medium rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        Nuevo usuario
                    </button>
                </div>
            </div>

            {/* Tarjetas de Estadísticas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-claro-tarjeta dark:bg-oscuro-tarjeta p-5 rounded-2xl border border-claro-borde dark:border-oscuro-borde shadow-sm transition-colors">
                    <p className="text-sm font-medium text-claro-texto2 dark:text-oscuro-texto2">
                        Total registrados
                    </p>
                    <h3 className="text-3xl font-bold text-claro-texto dark:text-oscuro-texto mt-2">
                        {totalUsuarios}
                    </h3>
                </div>
                <div className="bg-claro-tarjeta dark:bg-oscuro-tarjeta p-5 rounded-2xl border border-claro-borde dark:border-oscuro-borde shadow-sm transition-colors">
                    <p className="text-sm font-medium text-claro-texto2 dark:text-oscuro-texto2">
                        Activos
                    </p>
                    <h3 className="text-3xl font-bold text-claro-texto dark:text-oscuro-texto mt-2">
                        {usuariosActivos}
                    </h3>
                </div>
                <div className="bg-claro-tarjeta dark:bg-oscuro-tarjeta p-5 rounded-2xl border border-claro-borde dark:border-oscuro-borde shadow-sm transition-colors">
                    <p className="text-sm font-medium text-claro-texto2 dark:text-oscuro-texto2">
                        Roles de Admin
                    </p>
                    <h3 className="text-3xl font-bold text-claro-texto dark:text-oscuro-texto mt-2">
                        {usuariosAdmin}
                    </h3>
                </div>
                <div className="bg-claro-tarjeta dark:bg-oscuro-tarjeta p-5 rounded-2xl border border-claro-borde dark:border-oscuro-borde shadow-sm transition-colors">
                    <p className="text-sm font-medium text-claro-texto2 dark:text-oscuro-texto2">
                        Suspendidos
                    </p>
                    <h3 className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                        {usuariosSuspendidos}
                    </h3>
                </div>
            </div>

            {/* Contenedor principal */}
            <div className="bg-claro-tarjeta dark:bg-oscuro-tarjeta border border-claro-borde dark:border-oscuro-borde rounded-2xl shadow-sm overflow-hidden transition-colors">
                <div className="px-6 py-4 border-b border-claro-borde dark:border-oscuro-borde bg-claro-fondo/50 dark:bg-oscuro-fondo/50">
                    <h2 className="font-semibold text-claro-texto dark:text-oscuro-texto">
                        Administrar usuarios
                    </h2>
                </div>

                {/* BARRA DE BÚSQUEDA Y FILTROS */}
                <div className="px-4 sm:px-6 py-4 border-b border-claro-borde dark:border-oscuro-borde bg-claro-tarjeta dark:bg-oscuro-tarjeta">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                        {/* Buscador */}
                        <div className="relative lg:col-span-5 min-w-0">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-claro-texto2 dark:text-oscuro-texto2 pointer-events-none">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
                                    />
                                </svg>
                            </span>
                            <input
                                type="text"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Buscar por nombre, apellidos o correo..."
                                className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-claro-borde dark:border-oscuro-borde bg-claro-fondo dark:bg-oscuro-fondo text-claro-texto dark:text-oscuro-texto placeholder-claro-texto2 dark:placeholder-oscuro-texto2 focus:outline-none focus:ring-2 focus:ring-claro-primario/40 dark:focus:ring-oscuro-primario/40 transition-colors"
                            />
                        </div>

                        {/* Filtro Rol */}
                        <div className="lg:col-span-2 min-w-0">
                            <label className="block text-xs font-medium text-claro-texto2 dark:text-oscuro-texto2 mb-1.5">
                                Rol
                            </label>
                            <select
                                value={filtroRol}
                                onChange={(e) => setFiltroRol(e.target.value)}
                                className="w-full px-3 py-2.5 text-sm rounded-xl border border-claro-borde dark:border-oscuro-borde bg-claro-fondo dark:bg-oscuro-fondo text-claro-texto dark:text-oscuro-texto focus:outline-none focus:ring-2 focus:ring-claro-primario/40 dark:focus:ring-oscuro-primario/40 transition-colors"
                            >
                                <option value="todos">Todos</option>
                                {rolesDisponibles.map((rol) => (
                                    <option key={rol} value={rol}>
                                        {rol}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Filtro Estado */}
                        <div className="lg:col-span-2 min-w-0">
                            <label className="block text-xs font-medium text-claro-texto2 dark:text-oscuro-texto2 mb-1.5">
                                Estado
                            </label>
                            <select
                                value={filtroEstado}
                                onChange={(e) => setFiltroEstado(e.target.value)}
                                className="w-full px-3 py-2.5 text-sm rounded-xl border border-claro-borde dark:border-oscuro-borde bg-claro-fondo dark:bg-oscuro-fondo text-claro-texto dark:text-oscuro-texto focus:outline-none focus:ring-2 focus:ring-claro-primario/40 dark:focus:ring-oscuro-primario/40 transition-colors"
                            >
                                <option value="todos">Todos</option>
                                {estadosDisponibles.map((est) => (
                                    <option key={est} value={est}>
                                        {est}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Por página */}
                        <div className="lg:col-span-1 min-w-0">
                            <label className="block text-xs font-medium text-claro-texto2 dark:text-oscuro-texto2 mb-1.5">
                                Mostrar
                            </label>
                            <select
                                value={porPagina}
                                onChange={(e) => setPorPagina(Number(e.target.value))}
                                className="w-full px-3 py-2.5 text-sm rounded-xl border border-claro-borde dark:border-oscuro-borde bg-claro-fondo dark:bg-oscuro-fondo text-claro-texto dark:text-oscuro-texto focus:outline-none focus:ring-2 focus:ring-claro-primario/40 dark:focus:ring-oscuro-primario/40 transition-colors"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>

                        {/* Botón Limpiar filtros */}
                        <div className="lg:col-span-2 min-w-0">
                            <label className="hidden lg:block text-xs font-medium text-transparent mb-1.5 select-none">
                                &nbsp;
                            </label>
                            <button
                                onClick={limpiarFiltros}
                                disabled={!hayFiltrosActivos}
                                className={`w-full px-3 py-2.5 text-sm font-medium rounded-xl border transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2
                                    ${
                                        hayFiltrosActivos
                                            ? 'bg-claro-fondo dark:bg-oscuro-fondo border-claro-borde dark:border-oscuro-borde text-claro-texto2 dark:text-oscuro-texto2 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800 cursor-pointer'
                                            : 'bg-claro-fondo/40 dark:bg-oscuro-fondo/40 border-claro-borde/40 dark:border-oscuro-borde/40 text-claro-texto2/40 dark:text-oscuro-texto2/40 cursor-not-allowed'
                                    }`}
                            >
                                Limpiar filtros
                                {filtrosActivos > 0 && (
                                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-claro-primario dark:bg-oscuro-primario text-white text-[10px] font-bold">
                                        {filtrosActivos}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Contador de resultados */}
                    <div className="mt-3 text-xs text-claro-texto2 dark:text-oscuro-texto2">
                        Mostrando{' '}
                        <span className="font-semibold text-claro-texto dark:text-oscuro-texto">
                            {indiceInicio}-{indiceFin}
                        </span>{' '}
                        de{' '}
                        <span className="font-semibold text-claro-texto dark:text-oscuro-texto">
                            {usuariosFiltrados.length}
                        </span>{' '}
                        usuarios
                        {hayFiltrosActivos && (
                            <span className="ml-1">(filtrados de {totalUsuarios} en total)</span>
                        )}
                    </div>
                </div>

                {/* Estado de carga/error */}
                {cargando ? (
                    <div className="px-6 py-8 text-center text-claro-texto2 dark:text-oscuro-texto2">
                        Cargando usuarios...
                    </div>
                ) : error ? (
                    <div className="px-6 py-8 text-center text-red-500 font-medium">{error}</div>
                ) : usuariosFiltrados.length === 0 ? (
                    <div className="px-6 py-8 text-center text-claro-texto2 dark:text-oscuro-texto2">
                        {hayFiltrosActivos
                            ? 'No se encontraron usuarios que coincidan con los filtros.'
                            : 'No hay usuarios registrados.'}
                    </div>
                ) : (
                    <>
                        {/* ============================================ */}
                        {/* VISTA DESKTOP: TABLA COMPACTA                  */}
                        {/* ============================================ */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-xs font-semibold text-claro-texto2 dark:text-oscuro-texto2 border-b border-claro-borde dark:border-oscuro-borde">
                                        <th className="px-3 py-3 w-12 text-center">#</th>
                                        <th className="px-3 py-3 w-[24%]">USUARIO</th>
                                        <th className="px-3 py-3 w-[26%]">CORREO ELECTRÓNICO</th>
                                        <th className="px-3 py-3 w-[12%]">ROL</th>
                                        <th className="px-3 py-3 w-[12%]">ESTADO</th>
                                        <th className="px-3 py-3 w-[14%] text-right">ACCIONES</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-claro-borde dark:divide-oscuro-borde">
                                    {usuariosPaginados.map((user, idx) => {
                                        const id = obtenerId(user);
                                        const estaEliminando = eliminandoId === id;
                                        const numeroFila = (paginaActual - 1) * porPagina + idx + 1;
                                        const nombreCompleto =
                                            `${user.nombre || ''} ${user.apellidos || ''}`.trim();
                                        const iniciales =
                                            (user.nombre?.charAt(0) || '') +
                                            (user.apellidos?.charAt(0) || '');
                                        const activo = esActivo(user);

                                        return (
                                            <tr
                                                key={id ?? `user-${numeroFila}`}
                                                className="hover:bg-claro-fondo dark:hover:bg-oscuro-fondo/50 transition-colors"
                                            >
                                                <td className="px-3 py-4 text-center text-sm font-medium text-claro-texto2 dark:text-oscuro-texto2">
                                                    {numeroFila}
                                                </td>

                                                {/* USUARIO */}
                                                <td className="px-3 py-4 min-w-0">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-8 h-8 shrink-0 rounded-full bg-claro-tinte dark:bg-oscuro-tinte text-claro-primario dark:text-oscuro-primario flex items-center justify-center font-bold text-xs">
                                                            {iniciales}
                                                        </div>
                                                        <span
                                                            className="font-medium text-claro-texto dark:text-oscuro-texto truncate text-sm"
                                                            title={nombreCompleto}
                                                        >
                                                            {nombreCompleto}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* CORREO */}
                                                <td className="px-3 py-4 text-sm text-claro-texto2 dark:text-oscuro-texto2 min-w-0">
                                                    <span className="block truncate" title={user.correo}>
                                                        {user.correo}
                                                    </span>
                                                </td>

                                                {/* ROL */}
                                                <td className="px-3 py-4 text-sm text-claro-texto2 dark:text-oscuro-texto2 min-w-0">
                                                    <span className="block truncate" title={user.rol}>
                                                        {user.rol}
                                                    </span>
                                                </td>

                                                {/* ESTADO */}
                                                <td className="px-3 py-4">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap ${
                                                            activo
                                                                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                                                                : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`w-1.5 h-1.5 rounded-full ${
                                                                activo ? 'bg-green-500' : 'bg-red-500'
                                                            }`}
                                                        />
                                                        {obtenerEstado(user)}
                                                    </span>
                                                </td>

                                                {/* ACCIONES */}
                                                <td className="px-3 py-4">
                                                    <div className="flex flex-col items-stretch gap-1.5 w-24 ml-auto">
                                                        <button
                                                            onClick={() => abrirModalEditar(user)}
                                                            className="w-full px-2 py-1 text-xs font-medium text-claro-texto2 dark:text-oscuro-texto2 bg-white dark:bg-oscuro-fondo border border-claro-borde dark:border-oscuro-borde rounded-lg hover:text-claro-primario dark:hover:text-oscuro-primario transition-colors whitespace-nowrap"
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            onClick={() => handleEliminar(user)}
                                                            disabled={estaEliminando}
                                                            className="w-full px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-white dark:bg-oscuro-fondo border border-claro-borde dark:border-oscuro-borde rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                                        >
                                                            {estaEliminando ? 'Borrando…' : 'Eliminar'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* ============================================ */}
                        {/* VISTA MÓVIL: CARDS                             */}
                        {/* ============================================ */}
                        <div className="md:hidden divide-y divide-claro-borde dark:divide-oscuro-borde">
                            {usuariosPaginados.map((user, idx) => {
                                const id = obtenerId(user);
                                const estaEliminando = eliminandoId === id;
                                const numeroFila = (paginaActual - 1) * porPagina + idx + 1;
                                const nombreCompleto =
                                    `${user.nombre || ''} ${user.apellidos || ''}`.trim();
                                const iniciales =
                                    (user.nombre?.charAt(0) || '') +
                                    (user.apellidos?.charAt(0) || '');
                                const activo = esActivo(user);

                                return (
                                    <div key={id ?? `user-m-${numeroFila}`} className="p-4 space-y-4">
                                        <div className="flex items-start gap-3">
                                            <span className="w-7 h-7 shrink-0 rounded-full bg-claro-fondo dark:bg-oscuro-fondo border border-claro-borde dark:border-oscuro-borde flex items-center justify-center text-xs font-semibold text-claro-texto2 dark:text-oscuro-texto2">
                                                {numeroFila}
                                            </span>
                                            <div className="w-10 h-10 rounded-full bg-claro-tinte dark:bg-oscuro-tinte text-claro-primario dark:text-oscuro-primario flex items-center justify-center font-bold text-sm shrink-0">
                                                {iniciales}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3
                                                    className="font-semibold text-claro-texto dark:text-oscuro-texto truncate"
                                                    title={nombreCompleto}
                                                >
                                                    {nombreCompleto}
                                                </h3>
                                                <p
                                                    className="text-xs text-claro-texto2 dark:text-oscuro-texto2 truncate"
                                                    title={user.correo}
                                                >
                                                    {user.correo}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div className="min-w-0">
                                                <p className="text-claro-texto2 dark:text-oscuro-texto2 uppercase tracking-wide mb-1">
                                                    Rol
                                                </p>
                                                <p
                                                    className="font-medium text-claro-texto dark:text-oscuro-texto truncate"
                                                    title={user.rol}
                                                >
                                                    {user.rol}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-claro-texto2 dark:text-oscuro-texto2 uppercase tracking-wide mb-1">
                                                    Estado
                                                </p>
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                                                        activo
                                                            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                                                            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                                    }`}
                                                >
                                                    <span
                                                        className={`w-1.5 h-1.5 rounded-full ${
                                                            activo ? 'bg-green-500' : 'bg-red-500'
                                                        }`}
                                                    />
                                                    {obtenerEstado(user)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => abrirModalEditar(user)}
                                                className="flex-1 py-2 text-sm font-medium text-claro-texto2 dark:text-oscuro-texto2 bg-claro-fondo dark:bg-oscuro-fondo border border-claro-borde dark:border-oscuro-borde rounded-lg hover:text-claro-primario dark:hover:text-oscuro-primario transition-colors"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleEliminar(user)}
                                                disabled={estaEliminando}
                                                className="flex-1 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-claro-fondo dark:bg-oscuro-fondo border border-claro-borde dark:border-oscuro-borde rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {estaEliminando ? 'Eliminando...' : 'Eliminar'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* PAGINACIÓN NUMERADA */}
                        {totalPaginas > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-claro-borde dark:border-oscuro-borde bg-claro-fondo/50 dark:bg-oscuro-fondo/50">
                                <div className="text-xs text-claro-texto2 dark:text-oscuro-texto2">
                                    Página{' '}
                                    <span className="font-semibold text-claro-texto dark:text-oscuro-texto">
                                        {paginaActual}
                                    </span>{' '}
                                    de{' '}
                                    <span className="font-semibold text-claro-texto dark:text-oscuro-texto">
                                        {totalPaginas}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1 flex-wrap justify-center">
                                    <button
                                        onClick={() => setPaginaActual(1)}
                                        disabled={paginaActual === 1}
                                        className="px-2.5 py-1.5 text-sm rounded-lg border border-claro-borde dark:border-oscuro-borde bg-claro-tarjeta dark:bg-oscuro-tarjeta text-claro-texto2 dark:text-oscuro-texto2 hover:text-claro-primario dark:hover:text-oscuro-primario disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        title="Primera página"
                                    >
                                        «
                                    </button>
                                    <button
                                        onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                                        disabled={paginaActual === 1}
                                        className="px-2.5 py-1.5 text-sm rounded-lg border border-claro-borde dark:border-oscuro-borde bg-claro-tarjeta dark:bg-oscuro-tarjeta text-claro-texto2 dark:text-oscuro-texto2 hover:text-claro-primario dark:hover:text-oscuro-primario disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        title="Anterior"
                                    >
                                        ‹
                                    </button>

                                    {numerosPagina.map((n, i) =>
                                        n === '...' ? (
                                            <span
                                                key={`ellipsis-${i}`}
                                                className="px-2 text-claro-texto2 dark:text-oscuro-texto2"
                                            >
                                                …
                                            </span>
                                        ) : (
                                            <button
                                                key={n}
                                                onClick={() => setPaginaActual(n)}
                                                className={`min-w-[36px] px-2.5 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                                                    paginaActual === n
                                                        ? 'bg-claro-primario dark:bg-oscuro-primario text-white border-claro-primario dark:border-oscuro-primario shadow-sm'
                                                        : 'bg-claro-tarjeta dark:bg-oscuro-tarjeta border-claro-borde dark:border-oscuro-borde text-claro-texto2 dark:text-oscuro-texto2 hover:text-claro-primario dark:hover:text-oscuro-primario'
                                                }`}
                                            >
                                                {n}
                                            </button>
                                        )
                                    )}

                                    <button
                                        onClick={() =>
                                            setPaginaActual((p) => Math.min(totalPaginas, p + 1))
                                        }
                                        disabled={paginaActual === totalPaginas}
                                        className="px-2.5 py-1.5 text-sm rounded-lg border border-claro-borde dark:border-oscuro-borde bg-claro-tarjeta dark:bg-oscuro-tarjeta text-claro-texto2 dark:text-oscuro-texto2 hover:text-claro-primario dark:hover:text-oscuro-primario disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        title="Siguiente"
                                    >
                                        ›
                                    </button>
                                    <button
                                        onClick={() => setPaginaActual(totalPaginas)}
                                        disabled={paginaActual === totalPaginas}
                                        className="px-2.5 py-1.5 text-sm rounded-lg border border-claro-borde dark:border-oscuro-borde bg-claro-tarjeta dark:bg-oscuro-tarjeta text-claro-texto2 dark:text-oscuro-texto2 hover:text-claro-primario dark:hover:text-oscuro-primario disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        title="Última página"
                                    >
                                        »
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal */}
            <ModalUsuario
                isOpen={modalAbierto}
                onClose={() => setModalAbierto(false)}
                onSave={handleGuardarUsuario}
                usuarioId={usuarioIdEditar}
            />

            {usuarioBaja && (impactoBaja || errorBaja) && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) cerrarModalBaja();
                    }}
                >
                    <section
                        className="w-full max-w-lg rounded-2xl border border-claro-borde bg-claro-tarjeta p-6 shadow-2xl dark:border-oscuro-borde dark:bg-oscuro-tarjeta"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="titulo-baja-usuario"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2
                                    id="titulo-baja-usuario"
                                    className="text-xl font-bold text-claro-texto dark:text-oscuro-texto"
                                >
                                    Gestionar baja de usuario
                                </h2>
                                <p className="mt-1 text-sm text-claro-texto2 dark:text-oscuro-texto2">
                                    {`${usuarioBaja.nombre || ''} ${usuarioBaja.apellidos || ''}`.trim()}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={cerrarModalBaja}
                                disabled={procesandoBaja}
                                className="rounded-lg p-2 text-claro-texto2 hover:bg-claro-fondo disabled:opacity-50 dark:text-oscuro-texto2 dark:hover:bg-oscuro-fondo"
                                aria-label="Cerrar"
                            >
                                ×
                            </button>
                        </div>

                        {errorBaja ? (
                            <div
                                role="alert"
                                className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                            >
                                {errorBaja}
                            </div>
                        ) : impactoBaja && impactoBaja.total > 0 ? (
                            <>
                                <p className="mt-5 text-sm text-claro-texto dark:text-oscuro-texto">
                                    Este usuario tiene registros asociados en el sistema:
                                </p>
                                <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                    {[
                                        ['Reservas', impactoBaja.reservas],
                                        ['Pagos', impactoBaja.pagos],
                                        ['Inscripciones', impactoBaja.inscripciones],
                                        ['Eventos', impactoBaja.eventos],
                                        ['Canchas administradas', impactoBaja.canchasAdministradas],
                                        ['Canchas controladas', impactoBaja.canchasControladas],
                                        ['Supervisiones', impactoBaja.supervisiones],
                                    ]
                                        .filter(([, cantidad]) => Number(cantidad) > 0)
                                        .map(([etiqueta, cantidad]) => (
                                            <li
                                                key={String(etiqueta)}
                                                className="rounded-lg bg-claro-fondo px-3 py-2 text-claro-texto dark:bg-oscuro-fondo dark:text-oscuro-texto"
                                            >
                                                {etiqueta}: <strong>{cantidad}</strong>
                                            </li>
                                        ))}
                                </ul>
                            </>
                        ) : (
                            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                                <p className="font-semibold text-base mb-1 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    ¿Estás seguro que deseas eliminar esta cuenta?
                                </p>
                                <p className="mt-2 opacity-90">
                                    No se encontraron registros asociados. La cuenta se marcará como <strong>eliminada</strong> y el usuario perderá acceso al sistema de forma permanente.
                                </p>
                            </div>
                        )}

                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={cerrarModalBaja}
                                disabled={procesandoBaja}
                                className="rounded-xl border border-claro-borde px-4 py-2.5 text-sm font-medium text-claro-texto hover:bg-claro-fondo disabled:opacity-50 dark:border-oscuro-borde dark:text-oscuro-texto dark:hover:bg-oscuro-fondo"
                            >
                                Cancelar
                            </button>
                            {impactoBaja && (
                                <>
                                    {impactoBaja.total > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => ejecutarBaja('desactivar')}
                                            disabled={procesandoBaja}
                                            className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                                        >
                                            {procesandoBaja ? 'Procesando...' : 'Desactivar'}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => ejecutarBaja('eliminar')}
                                        disabled={procesandoBaja}
                                        className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                    >
                                        {procesandoBaja
                                            ? 'Procesando...'
                                            : errorBaja
                                              ? 'Reintentar eliminación'
                                              : impactoBaja.total === 0
                                                ? 'Sí, eliminar cuenta'
                                                : 'Eliminar'}
                                    </button>
                                </>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
};

export default PanelAdmin;