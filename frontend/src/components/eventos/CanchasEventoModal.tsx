import { useState, useEffect } from 'react';
import { getCanchaImageUrl, getDisciplinaDefaultImage } from '../canchas/cancha.api';

/**
 * Imagen de una cancha: usa la foto subida en Gestión de Canchas (imagen_url)
 * y, si no tiene o falla, una imagen por defecto según la disciplina.
 */
export const ImagenCancha = ({ cancha, className = '' }: { cancha: any; className?: string }) => {
    const porDefecto = getDisciplinaDefaultImage(cancha?.disciplina ?? null);
    const [src, setSrc] = useState<string>(getCanchaImageUrl(cancha?.imagen_url) || porDefecto);

    useEffect(() => {
        setSrc(getCanchaImageUrl(cancha?.imagen_url) || porDefecto);
    }, [cancha?.imagen_url, cancha?.disciplina]);

    return (
        <img
            src={src}
            alt={cancha?.nombre || 'Cancha'}
            loading="lazy"
            className={`object-cover ${className}`}
            onError={() => setSrc(porDefecto)}
        />
    );
};

interface Props {
    evento: any;
    onClose: () => void;
}

/**
 * Ventana que muestra, con foto, todas las canchas donde se realizará un evento.
 */
const CanchasEventoModal = ({ evento, onClose }: Props) => {
    if (!evento) return null;
    const canchas: any[] = evento.canchas_asignadas || [];

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-claro-tarjeta dark:bg-oscuro-tarjeta rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-claro-borde dark:border-oscuro-borde"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-5 border-b border-claro-borde dark:border-oscuro-borde flex justify-between items-start gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-claro-texto dark:text-oscuro-texto">Canchas del evento</h3>
                        <p className="text-sm text-claro-texto2 dark:text-oscuro-texto2">
                            {evento.nombre_evento} · {canchas.length} {canchas.length === 1 ? 'cancha' : 'canchas'}
                        </p>
                    </div>
                    <button onClick={onClose} aria-label="Cerrar" className="text-claro-texto2 hover:text-claro-texto dark:text-oscuro-texto2 dark:hover:text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {canchas.length === 0 && (
                        <p className="text-claro-texto2 dark:text-oscuro-texto2 col-span-full text-center py-8">Este evento no tiene canchas asignadas.</p>
                    )}
                    {canchas.map((c) => (
                        <div key={c.id_cancha} className="rounded-xl overflow-hidden border border-claro-borde dark:border-oscuro-borde bg-claro-fondo dark:bg-oscuro-fondo">
                            <ImagenCancha cancha={c} className="w-full h-48" />
                            <div className="p-4 space-y-1">
                                <div className="font-bold text-claro-texto dark:text-oscuro-texto">{c.nombre}</div>
                                <div className="text-sm text-claro-texto2 dark:text-oscuro-texto2">{c.disciplina}</div>
                                {c.ubicacion && <div className="text-sm text-claro-texto2 dark:text-oscuro-texto2">📍 {c.ubicacion}</div>}
                                {c.capacidad && <div className="text-sm text-claro-texto2 dark:text-oscuro-texto2">👥 Capacidad: {c.capacidad} personas</div>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CanchasEventoModal;