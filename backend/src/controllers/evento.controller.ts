import { Request, Response } from 'express';
import { EventoModel, Evento } from '../models/eventoModel';
import { InscripcionModel } from '../models/inscripcionModel';

// Acepta ids_canchas: [1,2,3] (nuevo) o id_cancha: 1 (formato antiguo)
const normalizarCanchas = (body: any): number[] => {
    const crudo: any[] = Array.isArray(body.ids_canchas)
        ? body.ids_canchas
        : (body.id_cancha ? [body.id_cancha] : []);
    const ids = crudo.map((n) => parseInt(n)).filter((n) => !isNaN(n));
    return Array.from(new Set(ids));
};

export class EventoController {
    static async obtenerServicios(req: Request, res: Response) {
        try {
            await EventoModel.inicializarServicios();
            const servicios = await EventoModel.obtenerServiciosActivos();
            res.json({ success: true, data: servicios });
        } catch (error) {
            console.error('Error al obtener servicios:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor.' });
        }
    }

    static async crearEvento(req: Request, res: Response) {
        try {
            const { nombre_evento, descripcion, fecha_evento, hora_inicio, hora_fin, cupo_maximo, tipo_evento, servicios } = req.body;
            const ids_canchas = normalizarCanchas(req.body);
            
            // @ts-ignore
            const id_administrador = (req as any).usuario?.id_usuario;
            
            if (!id_administrador) {
                return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
            }

            if (!nombre_evento || !fecha_evento || !hora_inicio || !hora_fin || ids_canchas.length === 0 || !cupo_maximo) {
                return res.status(400).json({ success: false, message: 'Faltan datos obligatorios. Recuerde seleccionar al menos una cancha.' });
            }

            if (hora_inicio >= hora_fin) {
                return res.status(400).json({ success: false, message: 'La hora de fin debe ser posterior a la hora de inicio.' });
            }

            const ocupadas = await EventoModel.obtenerCanchasNoDisponibles(ids_canchas, fecha_evento, hora_inicio, hora_fin);
            if (ocupadas.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: ocupadas.length === 1
                        ? `La cancha "${ocupadas[0]}" ya tiene una reserva o evento en ese horario.`
                        : `Estas canchas ya tienen una reserva o evento en ese horario: ${ocupadas.join(', ')}.`
                });
            }

            const nuevoEvento: Evento = {
                nombre_evento,
                descripcion,
                fecha_evento,
                hora_inicio,
                hora_fin,
                cupo_maximo,
                tipo_evento,
                id_administrador
            };

            const eventoCreado = await EventoModel.crearEvento(nuevoEvento, ids_canchas, servicios || []);

            res.status(201).json({ success: true, message: 'Evento creado exitosamente.', data: eventoCreado });
        } catch (error) {
            console.error('Error al crear evento:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor al crear evento.' });
        }
    }

    static async editarEvento(req: Request, res: Response) {
        try {
            const id_evento = parseInt(req.params.id);
            const { nombre_evento, descripcion, fecha_evento, hora_inicio, hora_fin, cupo_maximo, tipo_evento, servicios } = req.body;
            const ids_canchas = normalizarCanchas(req.body);

            if (!nombre_evento || !fecha_evento || !hora_inicio || !hora_fin || ids_canchas.length === 0 || !cupo_maximo) {
                return res.status(400).json({ success: false, message: 'Faltan datos obligatorios. Recuerde seleccionar al menos una cancha.' });
            }

            if (hora_inicio >= hora_fin) {
                return res.status(400).json({ success: false, message: 'La hora de fin debe ser posterior a la hora de inicio.' });
            }

            const ocupadas = await EventoModel.obtenerCanchasNoDisponibles(ids_canchas, fecha_evento, hora_inicio, hora_fin, id_evento);
            if (ocupadas.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: ocupadas.length === 1
                        ? `La cancha "${ocupadas[0]}" ya tiene una reserva o evento en ese horario.`
                        : `Estas canchas ya tienen una reserva o evento en ese horario: ${ocupadas.join(', ')}.`
                });
            }

            const eventoActualizado = await EventoModel.actualizarEvento(
                id_evento,
                { nombre_evento, descripcion, fecha_evento, hora_inicio, hora_fin, cupo_maximo, tipo_evento },
                ids_canchas,
                servicios || []
            );

            res.json({ success: true, message: 'Evento actualizado exitosamente.', data: eventoActualizado });
        } catch (error: any) {
            console.error('Error al editar evento:', error);
            res.status(400).json({ success: false, message: error.message || 'Error interno del servidor al editar evento.' });
        }
    }

    static async reprogramarEvento(req: Request, res: Response) {
        try {
            const id_evento = parseInt(req.params.id);
            const { nombre_evento, descripcion, fecha_evento, hora_inicio, hora_fin, cupo_maximo, tipo_evento, servicios } = req.body;
            const ids_canchas = normalizarCanchas(req.body);

            if (!nombre_evento || !fecha_evento || !hora_inicio || !hora_fin || ids_canchas.length === 0 || !cupo_maximo) {
                return res.status(400).json({ success: false, message: 'Faltan datos obligatorios. Recuerde seleccionar al menos una cancha.' });
            }

            if (hora_inicio >= hora_fin) {
                return res.status(400).json({ success: false, message: 'La hora de fin debe ser posterior a la hora de inicio.' });
            }

            const fechaHoraFin = new Date(`${fecha_evento}T${hora_fin}`);
            if (fechaHoraFin <= new Date()) {
                return res.status(400).json({ success: false, message: 'La nueva fecha y hora deben ser futuras.' });
            }

            const ocupadas = await EventoModel.obtenerCanchasNoDisponibles(ids_canchas, fecha_evento, hora_inicio, hora_fin, id_evento);
            if (ocupadas.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: ocupadas.length === 1
                        ? `La cancha "${ocupadas[0]}" ya tiene una reserva o evento en ese horario.`
                        : `Estas canchas ya tienen una reserva o evento en ese horario: ${ocupadas.join(', ')}.`
                });
            }

            const eventoReprogramado = await EventoModel.reprogramarEvento(
                id_evento,
                { nombre_evento, descripcion, fecha_evento, hora_inicio, hora_fin, cupo_maximo, tipo_evento },
                ids_canchas,
                servicios || []
            );

            res.json({ success: true, message: 'Evento reprogramado exitosamente.', data: eventoReprogramado });
        } catch (error: any) {
            console.error('Error al reprogramar evento:', error);
            res.status(400).json({ success: false, message: error.message || 'Error interno del servidor al reprogramar evento.' });
        }
    }

    static async obtenerEventos(req: Request, res: Response) {
        try {
            const filtros = {
                tipo: req.query.tipo as string,
                fecha: req.query.fecha as string,
                id_cancha: req.query.id_cancha as string,
                disponibles: req.query.disponibles === 'true'
            };
            
            const eventos = await EventoModel.obtenerEventos(filtros);

            // El cliente solo ve lo que debe pagar él (costo_por_persona), no el costo total del evento
            const rol = (req as any).usuario?.rol?.toLowerCase();
            if (rol === 'cliente') {
                const paraCliente = eventos.map((ev: any) => {
                    const { costo_total, total_servicios, ...resto } = ev;
                    return {
                        ...resto,
                        servicios_adicionales: (ev.servicios_adicionales || []).map((s: any) => ({ id_servicio: s.id_servicio, nombre: s.nombre })),
                        canchas_asignadas: (ev.canchas_asignadas || []).map(({ precio_hora, ...c }: any) => c),
                        cancha_asignada: ev.cancha_asignada ? (({ precio_hora, ...c }: any) => c)(ev.cancha_asignada) : null
                    };
                });
                return res.json({ success: true, data: paraCliente });
            }

            res.json({ success: true, data: eventos });
        } catch (error) {
            console.error('Error al obtener eventos:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor al obtener eventos.' });
        }
    }

    static async cancelarEvento(req: Request, res: Response) {
        try {
            const id_evento = parseInt(req.params.id);
            const { motivo_cancelacion } = req.body;
            // @ts-ignore
            const id_usuario_cancelacion = (req as any).usuario?.id_usuario;
            
            if (!motivo_cancelacion) {
                return res.status(400).json({ success: false, message: 'Debe especificar un motivo de cancelación.' });
            }
            
            const result = await EventoModel.cancelarEvento(id_evento, motivo_cancelacion, id_usuario_cancelacion);
            res.json({ success: true, message: 'Evento cancelado exitosamente.', data: result });
        } catch (error: any) {
            console.error('Error al cancelar evento:', error);
            res.status(400).json({ success: false, message: error.message || 'Error al cancelar evento.' });
        }
    }

    static async inscribir(req: Request, res: Response) {
        try {
            const id_evento = parseInt(req.params.id);
            // @ts-ignore
            const id_cliente = (req as any).usuario?.id_usuario;

            if (!id_cliente) {
                return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
            }

            const inscripcion = await InscripcionModel.crearInscripcion(id_cliente, id_evento);
            res.status(201).json({ success: true, message: 'Inscripción exitosa.', data: inscripcion });
        } catch (error: any) {
            console.error('Error al inscribir:', error);
            res.status(400).json({ success: false, message: error.message || 'Error al procesar la inscripción.' });
        }
    }

    static async cancelarInscripcion(req: Request, res: Response) {
        try {
            const id_evento = parseInt(req.params.id);
            // @ts-ignore
            const id_cliente = (req as any).usuario?.id_usuario;

            if (!id_cliente) {
                return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
            }

            const inscripcion = await InscripcionModel.cancelarInscripcion(id_cliente, id_evento);
            res.json({ success: true, message: 'Inscripción cancelada.', data: inscripcion });
        } catch (error: any) {
            console.error('Error al cancelar inscripción:', error);
            res.status(400).json({ success: false, message: error.message || 'Error al cancelar inscripción.' });
        }
    }

    static async misInscripciones(req: Request, res: Response) {
        try {
            // @ts-ignore
            const id_cliente = (req as any).usuario?.id_usuario;
            if (!id_cliente) {
                return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
            }

            const inscripciones = await InscripcionModel.obtenerInscripcionesCliente(id_cliente);
            res.json({ success: true, data: inscripciones });
        } catch (error) {
            console.error('Error al obtener inscripciones:', error);
            res.status(500).json({ success: false, message: 'Error interno al obtener inscripciones.' });
        }
    }

    static async obtenerInscritos(req: Request, res: Response) {
        try {
            const id_evento = parseInt(req.params.id);
            const inscritos = await EventoModel.obtenerInscritosEvento(id_evento);
            res.json({ success: true, data: inscritos });
        } catch (error) {
            console.error('Error al obtener inscritos:', error);
            res.status(500).json({ success: false, message: 'Error interno al obtener los inscritos.' });
        }
    }

    static async canchasOcupadas(req: Request, res: Response) {
        try {
            const { fecha, hora_inicio, hora_fin, excluir } = req.query as Record<string, string>;
            if (!fecha || !hora_inicio || !hora_fin) {
                return res.json({ success: true, data: [] });
            }
            const ids = await EventoModel.obtenerCanchasOcupadas(
                fecha, hora_inicio, hora_fin, excluir ? parseInt(excluir) : undefined
            );
            res.json({ success: true, data: ids });
        } catch (error) {
            console.error('Error al consultar canchas ocupadas:', error);
            res.status(500).json({ success: false, message: 'Error interno al consultar disponibilidad.' });
        }
    }
}