import { useState, ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import IconCanchas from '../assets/icon_canchas.svg?react';
import FieldError from '../components/FieldError';
import { esCorreoValido, claseInput } from '../utils/validaciones';

// =====================================================
// TIPOS
// =====================================================
interface FormData {
    correo: string;
    contraseña: string;
}

interface Errores {
    [key: string]: string | undefined;
}

interface Touched {
    [key: string]: boolean;
}

type CampoLogin = 'correo' | 'contraseña';

// =====================================================
// COMPONENTE
// =====================================================
const Login = () => {
    const [formData, setFormData] = useState<FormData>({
        correo: '',
        contraseña: ''
    });
    const [mostrarContraseña, setMostrarContraseña] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [errores, setErrores] = useState<Errores>({});
    const [touched, setTouched] = useState<Touched>({});
    const [cargando, setCargando] = useState<boolean>(false);

    const navigate = useNavigate();
    const { login } = useAuth();

    const validarCampoLogin = (name: string, value: string): string => {
        switch (name) {
            case 'correo':
                if (!value || !value.trim()) return 'El correo es obligatorio.';
                if (!esCorreoValido(value)) return 'Ingresá un correo válido.';
                if (value.length > 150) return 'Correo demasiado largo.';
                return '';
            case 'contraseña':
                if (!value) return 'La contraseña es obligatoria.';
                if (value.length < 6) return 'Mínimo 6 caracteres.';
                if (value.length > 100) return 'Máximo 100 caracteres.';
                return '';
            default:
                return '';
        }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const { name, value } = e.target;
        const nuevosDatos = { ...formData, [name]: value };
        setFormData(nuevosDatos);
        setTouched((prev) => ({ ...prev, [name]: true }));

        const errorCampo = validarCampoLogin(name, value);
        setErrores((prev) => ({ ...prev, [name]: errorCampo }));

        if (error) setError('');
    };

    const handleBlur = (e: ChangeEvent<HTMLInputElement>): void => {
        const { name, value } = e.target;
        setTouched((prev) => ({ ...prev, [name]: true }));
        const errorCampo = validarCampoLogin(name, value);
        setErrores((prev) => ({ ...prev, [name]: errorCampo }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setError('');

        const erroresEncontrados: Errores = {};
        (Object.keys(formData) as CampoLogin[]).forEach((campo) => {
            const err = validarCampoLogin(campo, formData[campo]);
            if (err) erroresEncontrados[campo] = err;
        });

        if (Object.keys(erroresEncontrados).length > 0) {
            setErrores(erroresEncontrados);
            setTouched({ correo: true, contraseña: true });
            return;
        }

        setCargando(true);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
            const respuesta = await axios.post(`${apiUrl}/auth/login`, {
                correo: formData.correo.toLowerCase().trim(),
                contraseña: formData.contraseña
            });

            login(respuesta.data.token);
            navigate('/dashboard');

        } catch (err: any) {
            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else {
                setError('Error al conectar con el servidor.');
            }
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="flex h-screen w-full bg-claro-fondo dark:bg-oscuro-fondo transition-colors duration-300 overflow-hidden">
            
            {/* Columna Izquierda: Imagen */}
            <div 
                className="hidden md:flex md:w-1/2 lg:w-7/12 relative bg-cover bg-center h-full"
                style={{ 
                    backgroundImage: "url('/images/auth-complex.jpg')" 
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-claro-primario/90 dark:to-oscuro-fondo transition-colors duration-300"></div>
                
                <div className="relative z-10 p-10 lg:p-16 flex flex-col justify-between w-full h-full">
                    <div>
                        <Link to="/" className="inline-block transition-transform hover:scale-105" title="Ir al inicio">
                            <IconCanchas className="w-10 h-10" />
                        </Link>
                    </div>
                    <div className="mb-8">
                        <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight drop-shadow-md">
                            Reservá tu cancha en menos de un minuto.
                        </h1>
                        <p className="text-gray-200 text-lg max-w-md drop-shadow-sm font-medium">
                            Horarios en tiempo real, confirmación inmediata y tu historial siempre a mano.
                        </p>
                    </div>
                </div>
            </div>

            {/* Columna Derecha: Formulario */}
            <div className="w-full md:w-1/2 lg:w-5/12 h-full flex flex-col items-center p-6 sm:p-8 lg:p-12 overflow-y-auto">
                <div className="w-full max-w-md bg-claro-tarjeta dark:bg-oscuro-tarjeta p-8 sm:p-10 rounded-2xl shadow-xl border border-claro-borde dark:border-oscuro-borde my-auto">
                    
                    <div className="flex items-center justify-between mb-4">
                        <Link 
                            to="/" 
                            className="inline-flex items-center gap-2 text-sm font-semibold text-claro-texto2 hover:text-claro-primario dark:text-oscuro-texto2 dark:hover:text-oscuro-primario transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Volver al inicio
                        </Link>
                        <ThemeToggle />
                    </div>

                    <h2 className="text-2xl font-bold text-claro-texto dark:text-oscuro-texto mb-2">
                        Iniciar sesión
                    </h2>

                    <p className="text-claro-texto2 dark:text-oscuro-texto2 mb-8">
                        Ingresá con tu cuenta para reservar.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-1" noValidate>
                        
                        {/* CORREO */}
                        <div>
                            <label className="block text-sm font-medium text-claro-texto2 dark:text-oscuro-texto2 mb-1">
                                Correo electrónico
                            </label>
                            <input 
                                type="email" 
                                name="correo"
                                value={formData.correo}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="nombre@correo.com"
                                maxLength={150}
                                className={claseInput(errores.correo, touched.correo)}
                            />
                            <FieldError error={errores.correo} touched={touched.correo} />
                        </div>

                        {/* CONTRASEÑA */}
                        <div>
                            <label className="block text-sm font-medium text-claro-texto2 dark:text-oscuro-texto2 mb-1">
                                Contraseña
                            </label>
                            <div className="relative">
                                <input 
                                    type={mostrarContraseña ? "text" : "password"}
                                    name="contraseña"
                                    value={formData.contraseña}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="••••••••"
                                    maxLength={100}
                                    className={claseInput(errores.contraseña, touched.contraseña)}
                                />
                                <button 
                                    type="button"
                                    onClick={() => setMostrarContraseña(!mostrarContraseña)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-claro-texto2 hover:text-claro-primario dark:text-oscuro-texto2 dark:hover:text-oscuro-primario font-medium"
                                >
                                    {mostrarContraseña ? 'Ocultar' : 'Mostrar'}
                                </button>
                            </div>
                            <FieldError error={errores.contraseña} touched={touched.contraseña} />
                        </div>

                        {error && (
                            <p className="text-red-500 text-sm font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800">
                                {error}
                            </p>
                        )}

                        <div className="flex items-center justify-between text-sm pt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded border-claro-borde text-claro-primario focus:ring-claro-primario dark:bg-oscuro-fondo dark:border-oscuro-borde" />
                                <span className="text-claro-texto2 dark:text-oscuro-texto2">Recordarme</span>
                            </label>
                            <Link 
                                to="/solicitar-recuperacion" 
                                className="text-claro-primario dark:text-oscuro-primario hover:underline font-medium"
                            >
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>

                        <button 
                            type="submit" 
                            disabled={cargando}
                            className={`w-full py-3 mt-4 rounded-xl font-medium text-white shadow-md transition-all
                                ${cargando 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-claro-primario hover:bg-claro-hover dark:bg-oscuro-primario dark:text-oscuro-fondo dark:hover:bg-oscuro-hover hover:-translate-y-0.5'
                                }`}
                        >
                            {cargando ? 'Iniciando sesión...' : 'Iniciar sesión'}
                        </button>

                    </form>

                    <p className="text-center text-sm text-claro-texto2 dark:text-oscuro-texto2 mt-8">
                        ¿Todavía no tenés cuenta?{' '}
                        <Link to="/registro" className="text-claro-primario dark:text-oscuro-primario font-bold hover:underline">
                            Creá una gratis
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;