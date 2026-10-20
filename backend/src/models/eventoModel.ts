import { pool } from '../config/database';
import { findCanchaImage } from '../utils/canchaImage.util';
import { PoolClient } from 'pg';

// Porcentaje que se suma al costo por persona como ganancia del complejo (0.03 = 3 %)
export const MARGEN_GANANCIA = 0.03;

export interface Servicio {
    id_servicio: number;
    nombre: string;
    tipo_servicio?: string;
    precio_referencia?: number;
    estado: string;
}

export interface Evento {
    id_evento?: number;
    nombre_evento: string;
    descripcion?: string;
    fecha_evento: string;
    hora_inicio: string;
    hora_fin: string;
    cupo_maximo?: number;
    tipo_evento?: string;
    motivo_cancelacion?: string;
    fecha_cancelacion?: string;
    id_usuario_cancelacion?: number;
    estado?: string;
    id_administrador: number;
    fecha_creacion?: string;
    // Agregados para el frontend
    cancha_asignada?: any;
    canchas_asignadas?: any[];
    servicios_adicionales?: any[];
    costo_total?: number;
    costo_por_persona?: number;
    cupos_restantes?: number;
}

export class EventoModel {
    static async obtenerServiciosActivos(): Promise<Servicio[]> {
        const query = `SELECT * FROM servicio WHERE estado = 'activo' ORDER BY nombre ASC`;
        const { rows } = await pool.query(query);
        return rows;
    }

    static async inicializarServicios(): Promise<void> {
        const queryCheck = `SELECT COUNT(*) FROM servicio`;
        const { rows } = await pool.query(queryCheck);
        if (parseInt(rows[0].count) === 0) {
            const queryInsert = `
                INSERT INTO servicio (nombre, tipo_servicio, precio_referencia, estado) VALUES
                ('Arbitraje', 'Personal', 50.00, 'activo'),
                ('Alquiler de Balones', 'Equipamiento', 10.00, 'activo'),
                ('Catering', 'Alimentación', 200.00, 'activo'),
                ('Animación', 'Entretenimiento', 100.00, 'activo'),
                ('Fotografía', 'Multimedia', 150.00, 'activo')
            `;
            await pool.query(queryInsert);
        }
    }

    static async verificarDisponibilidadCancha(
        id_cancha: number,
        fecha: string,
        hora_inicio: string,
        hora_fin: string,
        client?: PoolClient,
        id_evento_excluir?: number
    ): Promise<boolean> {
        const db = client || pool;
        
        const queryReservas = `
            SELECT id_reserva FROM reserva
            WHERE id_cancha = $1 
              AND fecha_reserva = $2 
              AND estado IN ('pendiente', 'confirmada')
              AND ($3 < hora_fin AND $4 > hora_inicio)
        `;
        const resReservas = await db.query(queryReservas, [id_cancha, fecha, hora_inicio, hora_fin]);
        if (resReservas.rows.length > 0) return false;

        const queryEventos = `
            SELECT e.id_evento FROM evento e
            JOIN evento_cancha ec ON e.id_evento = ec.id_evento
            WHERE ec.id_cancha = $1
              AND e.fecha_evento = $2
              AND e.estado != 'cancelado'
              AND ($3 < e.hora_fin AND $4 > e.hora_inicio)
              ${id_evento_excluir ? 'AND e.id_evento != $5' : ''}
        `;
        const paramsEventos = id_evento_excluir
            ? [id_cancha, fecha, hora_inicio, hora_fin, id_evento_excluir]
            : [id_cancha, fecha, hora_inicio, hora_fin];
        const resEventos = await db.query(queryEventos, paramsEventos);
        if (resEventos.rows.length > 0) return false;

        return true;
    }

    /**
     * Devuelve los NOMBRES de las canchas (de la lista) que NO están libres en ese horario.
     * Sirve para mostrar un mensaje claro: "La cancha X, Y no están disponibles...".
     */
    static async obtenerCanchasNoDisponibles(
        ids_canchas: number[],
        fecha: string,
        hora_inicio: string,
        hora_fin: string,
        id_evento_excluir?: number
    ): Promise<string[]> {
        const ocupadas: string[] = [];
        for (const id of ids_canchas) {
            const libre = await EventoModel.verificarDisponibilidadCancha(id, fecha, hora_inicio, hora_fin, undefined, id_evento_excluir);
            if (!libre) {
                const { rows } = await pool.query(`SELECT nombre FROM cancha WHERE id_cancha = $1`, [id]);
                ocupadas.push(rows[0]?.nombre || `Cancha #${id}`);
            }
        }
        return ocupadas;
    }

    /**
     * IDs de TODAS las canchas ocupadas (por reservas o por otros eventos) en una fecha/horario.
     * El frontend lo usa para marcar las canchas ocupadas en el selector.
     */
    static async obtenerCanchasOcupadas(
        fecha: string,
        hora_inicio: string,
        hora_fin: string,
        id_evento_excluir?: number
    ): Promise<number[]> {
        const params: any[] = [fecha, hora_inicio, hora_fin];
        let filtroEvento = '';
        if (id_evento_excluir) {
            params.push(id_evento_excluir);
            filtroEvento = `AND e.id_evento != $4`;
        }
        const query = `
            SELECT r.id_cancha
            FROM reserva r
            WHERE r.fecha_reserva = $1
              AND r.estado IN ('pendiente', 'confirmada')
              AND ($2::time < r.hora_fin AND $3::time > r.hora_inicio)
            UNION
            SELECT ec.id_cancha
            FROM evento e
            JOIN evento_cancha ec ON e.id_evento = ec.id_evento
            WHERE e.fecha_evento = $1
              AND e.estado != 'cancelado'
              AND ($2::time < e.hora_fin AND $3::time > e.hora_inicio)
              ${filtroEvento}
        `;
        const { rows } = await pool.query(query, params);
        return rows.map((r: any) => r.id_cancha);
    }

    /**
     * Lista de clientes inscritos a un evento (para el administrador).
     */
    static async obtenerInscritosEvento(id_evento: number): Promise<any[]> {
        const query = `
            SELECT i.id_inscripcion, i.estado, i.fecha_inscripcion, i.fecha_cancelacion,
                   u.id_usuario AS id_cliente, u.nombre, u.apellido_paterno, u.apellido_materno,
                   u.correo, u.telefono, cl.ci_nit
            FROM inscripcion i
            JOIN cliente cl ON i.id_cliente = cl.id_cliente
            JOIN usuario u ON u.id_usuario = cl.id_cliente
            WHERE i.id_evento = $1
            ORDER BY (i.estado = 'confirmada') DESC, i.fecha_inscripcion ASC
        `;
        const { rows } = await pool.query(query, [id_evento]);
        return rows;
    }

    static async crearEvento(
        evento: Evento,
        ids_canchas: number[],
        servicios: { id_servicio: number, costo_contratado: number }[]
    ): Promise<Evento> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const insertEventoQuery = `
                INSERT INTO evento (
                    nombre_evento, descripcion, fecha_evento, hora_inicio, hora_fin, 
                    cupo_maximo, tipo_evento, id_administrador, estado
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'programado') RETURNING *
            `;
            const valuesEvento = [
                evento.nombre_evento,
                evento.descripcion || '',
                evento.fecha_evento,
                evento.hora_inicio,
                evento.hora_fin,
                evento.cupo_maximo || 0,
                evento.tipo_evento || 'Otro',
                evento.id_administrador
            ];
            const { rows: eventoRows } = await client.query(insertEventoQuery, valuesEvento);
            const nuevoEvento = eventoRows[0];

            const insertCanchaQuery = `
                INSERT INTO evento_cancha (id_evento, id_cancha)
                VALUES ($1, $2)
            `;
            for (const id_cancha of ids_canchas) {
                await client.query(insertCanchaQuery, [nuevoEvento.id_evento, id_cancha]);
            }

            if (servicios && servicios.length > 0) {
                const insertServicioQuery = `
                    INSERT INTO evento_servicio (id_evento, id_servicio, costo_contratado)
                    VALUES ($1, $2, $3)
                `;
                for (const serv of servicios) {
                    await client.query(insertServicioQuery, [nuevoEvento.id_evento, serv.id_servicio, serv.costo_contratado]);
                }
            }

            await client.query('COMMIT');
            return nuevoEvento;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async obtenerEventos(filtros?: { tipo?: string, fecha?: string, id_cancha?: string, disponibles?: boolean }): Promise<Evento[]> {
        let query = `
            SELECT e.*,
                   (
                       SELECT COALESCE(SUM(costo_contratado), 0)
                       FROM evento_servicio es WHERE es.id_evento = e.id_evento
                   ) as total_servicios,
                   (
                       SELECT COUNT(*) FROM inscripcion i WHERE i.id_evento = e.id_evento AND i.estado = 'confirmada'
                   ) as inscritos
            FROM evento e
            WHERE 1=1
        `;
        const values: any[] = [];
        let index = 1;

        if (filtros?.tipo) {
            query += ` AND e.tipo_evento = $${index++}`;
            values.push(filtros.tipo);
        }
        if (filtros?.fecha) {
            query += ` AND e.fecha_evento = $${index++}`;
            values.push(filtros.fecha);
        }
        if (filtros?.id_cancha) {
            // El evento puede tener varias canchas: basta con que una coincida
            query += ` AND EXISTS (
                SELECT 1 FROM evento_cancha ecf
                WHERE ecf.id_evento = e.id_evento AND ecf.id_cancha = $${index++}
            )`;
            values.push(parseInt(filtros.id_cancha));
        }
        if (filtros?.disponibles) {
            query += ` AND e.estado = 'programado' AND e.fecha_evento >= CURRENT_DATE - 1`;
        }

        query += ` ORDER BY e.fecha_evento DESC, e.hora_inicio ASC`;

        const { rows } = await pool.query(query, values);

        for (const row of rows) {
            const sRes = await pool.query(`
                SELECT s.id_servicio, s.nombre, es.costo_contratado
                FROM evento_servicio es
                JOIN servicio s ON es.id_servicio = s.id_servicio
                WHERE es.id_evento = $1
            `, [row.id_evento]);
            row.servicios_adicionales = sRes.rows;

            const cRes = await pool.query(`
                SELECT c.id_cancha, c.nombre, c.disciplina, c.ubicacion, c.precio_hora, c.capacidad, c.estado
                FROM evento_cancha ec
                JOIN cancha c ON ec.id_cancha = c.id_cancha
                WHERE ec.id_evento = $1
                ORDER BY c.nombre ASC
            `, [row.id_evento]);
            row.canchas_asignadas = cRes.rows.map((c: any) => ({ ...c, imagen_url: findCanchaImage(c.id_cancha) }));
            // Compatibilidad: primera cancha como "cancha_asignada"
            row.cancha_asignada = cRes.rows[0] || null;

            const startDate = new Date(`1970-01-01T${row.hora_inicio}Z`);
            const endDate = new Date(`1970-01-01T${row.hora_fin}Z`);
            const horasDecimal = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
            const precioCanchas = cRes.rows.reduce((acc: number, c: any) => acc + parseFloat(c.precio_hora || 0), 0);
            const costoCanchas = horasDecimal * precioCanchas;
            const costoServicios = parseFloat(row.total_servicios || 0);

            row.costo_total = costoCanchas + costoServicios;

            // Precio que paga cada cliente: costo total repartido entre el aforo + margen de ganancia
            const aforo = parseInt(row.cupo_maximo) || 0;
            row.costo_por_persona = aforo > 0
                ? Math.ceil((row.costo_total / aforo) * (1 + MARGEN_GANANCIA) * 2) / 2
                : 0;
            row.cupos_restantes = row.cupo_maximo - parseInt(row.inscritos);

            // ¿Ya terminó? (misma regla que usa el sistema para impedir inscripciones/ediciones)
            const finEvento = new Date(`${new Date(row.fecha_evento).toISOString().substring(0, 10)}T${row.hora_fin}`);
            row.finalizado = row.estado !== 'cancelado' && finEvento <= new Date();
        }

        // Para clientes (disponibles=true): solo eventos programados que todavía no terminaron
        if (filtros?.disponibles) {
            return rows.filter((r: any) => !r.finalizado);
        }

        return rows;
    }

    static async obtenerEventoPorId(id_evento: number): Promise<Evento | undefined> {
        const query = `
            SELECT e.*, ec.id_cancha
            FROM evento e
            LEFT JOIN evento_cancha ec ON e.id_evento = ec.id_evento
            WHERE e.id_evento = $1
        `;
        const { rows } = await pool.query(query, [id_evento]);
        return rows[0];
    }

    static async actualizarEvento(
        id_evento: number,
        evento: Partial<Evento>,
        ids_canchas: number[],
        servicios: { id_servicio: number, costo_contratado: number }[]
    ): Promise<Evento> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const actualRes = await client.query(`SELECT * FROM evento WHERE id_evento = $1`, [id_evento]);
            if (actualRes.rows.length === 0) throw new Error('Evento no encontrado');
            const actual = actualRes.rows[0];

            if (actual.estado === 'cancelado') {
                throw new Error('No se puede editar un evento cancelado');
            }

            const finActual = new Date(`${actual.fecha_evento.toISOString().substring(0, 10)}T${actual.hora_fin}`);
            if (finActual <= new Date()) {
                throw new Error('No se puede editar un evento que ya ocurrió');
            }

            const inscritosRes = await client.query(
                `SELECT COUNT(*) as inscritos FROM inscripcion WHERE id_evento = $1 AND estado = 'confirmada'`,
                [id_evento]
            );
            const inscritos = parseInt(inscritosRes.rows[0].inscritos);
            if ((evento.cupo_maximo || 0) < inscritos) {
                throw new Error(`El aforo no puede ser menor a los ${inscritos} inscritos actuales.`);
            }

            const updateEventoQuery = `
                UPDATE evento SET
                    nombre_evento = $1,
                    descripcion = $2,
                    fecha_evento = $3,
                    hora_inicio = $4,
                    hora_fin = $5,
                    cupo_maximo = $6,
                    tipo_evento = $7
                WHERE id_evento = $8 RETURNING *
            `;
            const values = [
                evento.nombre_evento,
                evento.descripcion || '',
                evento.fecha_evento,
                evento.hora_inicio,
                evento.hora_fin,
                evento.cupo_maximo || 0,
                evento.tipo_evento || 'otro',
                id_evento
            ];
            const { rows: eventoRows } = await client.query(updateEventoQuery, values);
            const eventoActualizado = eventoRows[0];

            // Reemplazar canchas asignadas
            await client.query(`DELETE FROM evento_cancha WHERE id_evento = $1`, [id_evento]);
            for (const id_cancha of ids_canchas) {
                await client.query(`INSERT INTO evento_cancha (id_evento, id_cancha) VALUES ($1, $2)`, [id_evento, id_cancha]);
            }

            // Reemplazar servicios adicionales
            await client.query(`DELETE FROM evento_servicio WHERE id_evento = $1`, [id_evento]);
            if (servicios && servicios.length > 0) {
                const insertServicioQuery = `
                    INSERT INTO evento_servicio (id_evento, id_servicio, costo_contratado)
                    VALUES ($1, $2, $3)
                `;
                for (const serv of servicios) {
                    await client.query(insertServicioQuery, [id_evento, serv.id_servicio, serv.costo_contratado]);
                }
            }

            await client.query('COMMIT');
            return eventoActualizado;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async reprogramarEvento(
        id_evento: number,
        evento: Partial<Evento>,
        ids_canchas: number[],
        servicios: { id_servicio: number, costo_contratado: number }[]
    ): Promise<Evento> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const actualRes = await client.query(`SELECT * FROM evento WHERE id_evento = $1`, [id_evento]);
            if (actualRes.rows.length === 0) throw new Error('Evento no encontrado');
            const actual = actualRes.rows[0];

            if (actual.estado !== 'cancelado') {
                throw new Error('Solo se pueden reprogramar eventos cancelados');
            }

            const updateEventoQuery = `
                UPDATE evento SET
                    nombre_evento = $1,
                    descripcion = $2,
                    fecha_evento = $3,
                    hora_inicio = $4,
                    hora_fin = $5,
                    cupo_maximo = $6,
                    tipo_evento = $7,
                    estado = 'programado',
                    motivo_cancelacion = NULL,
                    fecha_cancelacion = NULL,
                    id_usuario_cancelacion = NULL
                WHERE id_evento = $8 RETURNING *
            `;
            const values = [
                evento.nombre_evento,
                evento.descripcion || '',
                evento.fecha_evento,
                evento.hora_inicio,
                evento.hora_fin,
                evento.cupo_maximo || 0,
                evento.tipo_evento || 'otro',
                id_evento
            ];
            const { rows: eventoRows } = await client.query(updateEventoQuery, values);
            const eventoReprogramado = eventoRows[0];

            await client.query(`DELETE FROM evento_cancha WHERE id_evento = $1`, [id_evento]);
            for (const id_cancha of ids_canchas) {
                await client.query(`INSERT INTO evento_cancha (id_evento, id_cancha) VALUES ($1, $2)`, [id_evento, id_cancha]);
            }

            await client.query(`DELETE FROM evento_servicio WHERE id_evento = $1`, [id_evento]);
            if (servicios && servicios.length > 0) {
                const insertServicioQuery = `
                    INSERT INTO evento_servicio (id_evento, id_servicio, costo_contratado)
                    VALUES ($1, $2, $3)
                `;
                for (const serv of servicios) {
                    await client.query(insertServicioQuery, [id_evento, serv.id_servicio, serv.costo_contratado]);
                }
            }

            await client.query('COMMIT');
            return eventoReprogramado;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }    

    static async cancelarEvento(id_evento: number, motivo_cancelacion: string, id_usuario_cancelacion?: number): Promise<any> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const actualRes = await client.query(
                `SELECT fecha_evento, hora_fin, estado FROM evento WHERE id_evento = $1`,
                [id_evento]
            );
            if (actualRes.rows.length === 0) throw new Error("Evento no encontrado");
            const actual = actualRes.rows[0];

            if (actual.estado === 'cancelado') {
                throw new Error("El evento ya se encuentra cancelado");
            }

            const finEvento = new Date(`${actual.fecha_evento.toISOString().substring(0, 10)}T${actual.hora_fin}`);
            if (finEvento <= new Date()) {
                throw new Error("No se puede cancelar un evento que ya ocurrió");
            }
            
            const updateQuery = `
                UPDATE evento 
                SET estado = 'cancelado', motivo_cancelacion = $1, fecha_cancelacion = NOW(), id_usuario_cancelacion = $3
                WHERE id_evento = $2 RETURNING *
            `;
            const { rows } = await client.query(updateQuery, [motivo_cancelacion, id_evento, id_usuario_cancelacion || null]);
            const evento = rows[0];

            const inscritosQuery = `
                SELECT c.id_cliente, u.nombre, u.correo 
                FROM inscripcion i
                JOIN cliente c ON i.id_cliente = c.id_cliente
                JOIN usuario u ON c.id_cliente = u.id_usuario
                WHERE i.id_evento = $1 AND i.estado = 'confirmada'
            `;
            const inscritosRes = await client.query(inscritosQuery, [id_evento]);

            const updateInscripcion = `
                UPDATE inscripcion SET estado = 'cancelada_por_evento', fecha_cancelacion = NOW()
                WHERE id_evento = $1 AND estado = 'confirmada'
            `;
            await client.query(updateInscripcion, [id_evento]);

            await client.query('COMMIT');
            
            return {
                evento,
                afectados: inscritosRes.rows
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}