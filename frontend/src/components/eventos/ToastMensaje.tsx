import { useEffect } from 'react';

export interface MensajeToast {
    tipo: 'exito' | 'error';
    texto: string;
}

interface Props {
    mensaje: MensajeToast | null;
    onClose: () => void;
}

/**
 * Aviso flotante que se dibuja POR ENCIMA de todo (incluidos los modales).
 * - Error: se queda hasta que el usuario lo cierre.
 * - Éxito: se cierra solo a los 6 segundos.
 */
const ToastMensaje = ({ mensaje, onClose }: Props) => {
    useEffect(() => {
        if (mensaje?.tipo === 'exito') {
            const t = setTimeout(onClose, 6000);
            return () => clearTimeout(t);
        }
    }, [mensaje]);

    if (!mensaje) return null;
    const esError = mensaje.tipo === 'error';

    return (
        <div className="fixed inset-x-0 top-0 z-[9999] flex justify-center p-4 pointer-events-none">
            <div
                role="alert"
                className={`pointer-events-auto w-full max-w-lg rounded-2xl border-2 shadow-2xl p-4 flex items-start gap-3
                    ${esError
                        ? 'bg-red-50 border-red-400 text-red-800 dark:bg-red-950 dark:border-red-500 dark:text-red-200'
                        : 'bg-green-50 border-green-400 text-green-800 dark:bg-green-950 dark:border-green-500 dark:text-green-200'}`}
            >
                <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {esError
                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />}
                </svg>
                <div className="flex-1 text-sm font-medium break-words">
                    <p className="font-bold mb-0.5">{esError ? 'No se pudo completar la acción' : 'Listo'}</p>
                    {mensaje.texto}
                </div>
                <button onClick={onClose} aria-label="Cerrar" className="text-xl leading-none font-bold opacity-70 hover:opacity-100">&times;</button>
            </div>
        </div>
    );
};

export default ToastMensaje;