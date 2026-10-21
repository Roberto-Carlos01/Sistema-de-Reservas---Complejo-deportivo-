import { pool } from '../config/database';

export const PagoModel = {
    obtenerPorId: async (id_pago: number) => {
        const result = await pool.query('SELECT * FROM pago WHERE id_pago = $1', [id_pago]);
        return result.rows[0];
    },

    crearPago: async (data: {
        id_reserva: number;
        monto: number;
        metodo_pago: string;
        tipo_registro: string;
        referencia_pasarela?: string | null;
        nro_comprobante?: string | null;
        comprobante_url?: string | null;
        detalle_adicionales?: unknown;
        estado?: string;
        id_usuario?: number | null;
    }) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await client.query(`
                INSERT INTO pago
                (id_reserva, monto, metodo_pago, tipo_registro, referencia_pasarela, nro_comprobante, estado, comprobante_url, detalle_adicionales)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *;
            `, [
                data.id_reserva, data.monto, data.metodo_pago, data.tipo_registro || 'online',
                data.referencia_pasarela || null, data.nro_comprobante || null, data.estado || 'pendiente_verificacion',
                data.comprobante_url || null, JSON.stringify(data.detalle_adicionales || [])
            ]);
            await client.query(`
                INSERT INTO pago_auditoria (id_pago, id_usuario, accion, estado_anterior, estado_nuevo, motivo)
                VALUES ($1, $2, 'registro', NULL, $3, 'Pago registrado')
            `, [result.rows[0].id_pago, data.id_usuario || null, result.rows[0].estado]);
            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    obtenerPorReserva: async (id_reserva: number) => {
        const query = `
            SELECT p.*, COALESCE(u.nombre, 'Anónimo') AS nombre, COALESCE(u.apellido_paterno, '') AS apellido_paterno, u.correo
            FROM pago p
            JOIN reserva r ON p.id_reserva = r.id_reserva
            LEFT JOIN cliente cl ON r.id_cliente = cl.id_cliente
            LEFT JOIN usuario u ON cl.id_cliente = u.id_usuario
            WHERE p.id_reserva = $1
            ORDER BY p.id_pago DESC
            LIMIT 1;
        `;
        const result = await pool.query(query, [id_reserva]);
        return result.rows[0];
    },

    actualizarComprobante: async (id_pago: number, comprobante_url: string) => {
        const query = `
            UPDATE pago 
            SET comprobante_url = $1, estado = 'pendiente_verificacion'
            WHERE id_pago = $2 AND estado IN ('pendiente', 'pendiente_verificacion')
            RETURNING *;
        `;
        const result = await pool.query(query, [comprobante_url, id_pago]);
        return result.rows[0];
    },

    verificarPago: async (id_pago: number, estado: string, motivo_rechazo?: string | null) => {
        return PagoModel.verificarPagoConAuditoria(id_pago, estado, motivo_rechazo || null, null);
    },

    verificarPagoConAuditoria: async (id_pago: number, estado: string, motivo: string | null, id_usuario: number | null) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const anterior = await client.query('SELECT * FROM pago WHERE id_pago = $1 FOR UPDATE', [id_pago]);
            if (!anterior.rows[0] || !['pendiente', 'pendiente_verificacion'].includes(anterior.rows[0].estado)) {
                await client.query('ROLLBACK');
                return null;
            }
            const actualizado = await client.query(`
                UPDATE pago
                SET estado = $1::varchar(30),
                    fecha_pago = CASE WHEN $2::boolean THEN now() ELSE fecha_pago END,
                    motivo_rechazo = CASE WHEN $3::boolean THEN $4::text ELSE NULL::text END
                WHERE id_pago = $5
                RETURNING *;
            `, [estado, estado === 'pagado', estado === 'rechazado', motivo, id_pago]);
            await client.query(`
                UPDATE reserva
                SET estado = $1, fecha_gestion = now()
                WHERE id_reserva = $2
            `, [estado === 'pagado' ? 'confirmada' : 'pendiente_pago', anterior.rows[0].id_reserva]);
            await client.query(`
                INSERT INTO pago_auditoria (id_pago, id_usuario, accion, estado_anterior, estado_nuevo, motivo)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [id_pago, id_usuario, estado === 'pagado' ? 'aprobacion' : 'rechazo', anterior.rows[0].estado, estado, motivo]);
            await client.query('COMMIT');
            return actualizado.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    registrarAuditoria: async (id_pago: number, id_usuario: number | null, accion: string, estadoAnterior: string | null, estadoNuevo: string | null, motivo: string | null = null, monto: number | null = null) => {
        await pool.query(`
            INSERT INTO pago_auditoria (id_pago, id_usuario, accion, estado_anterior, estado_nuevo, motivo, monto)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [id_pago, id_usuario, accion, estadoAnterior, estadoNuevo, motivo, monto]);
    },

    obtenerAuditoria: async (id_pago: number) => {
        const result = await pool.query(`
            SELECT a.*, COALESCE(u.nombre || ' ' || u.apellido_paterno, 'Sistema') AS responsable
            FROM pago_auditoria a
            LEFT JOIN usuario u ON u.id_usuario = a.id_usuario
            WHERE a.id_pago = $1
            ORDER BY a.creado_en DESC, a.id_auditoria DESC
        `, [id_pago]);
        return result.rows;
    },

    registrarReembolso: async (id_pago: number, id_usuario: number, monto: number, motivo: string, referencia_externa: string | null) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const pagoResult = await client.query('SELECT * FROM pago WHERE id_pago = $1 FOR UPDATE', [id_pago]);
            const pago = pagoResult.rows[0];
            if (!pago || !['pagado', 'reembolso_parcial'].includes(pago.estado)) {
                await client.query('ROLLBACK');
                return { error: 'Solo se puede reembolsar un pago aprobado con saldo disponible.' };
            }
            const sumResult = await client.query('SELECT COALESCE(SUM(monto), 0) AS total FROM pago_reembolso WHERE id_pago = $1', [id_pago]);
            const reembolsadoAntes = Number(sumResult.rows[0].total);
            const saldo = Number(pago.monto) - reembolsadoAntes;
            if (monto <= 0 || monto > saldo + 0.001) {
                await client.query('ROLLBACK');
                return { error: `El monto supera el saldo reembolsable de Bs. ${saldo.toFixed(2)}.` };
            }
            const nuevoTotal = Math.round((reembolsadoAntes + monto) * 100) / 100;
            const nuevoEstado: 'reembolsado' | 'reembolso_parcial' = nuevoTotal >= Number(pago.monto) ? 'reembolsado' : 'reembolso_parcial';
            const reembolso = await client.query(`
                INSERT INTO pago_reembolso (id_pago, id_usuario, monto, motivo, referencia_externa)
                VALUES ($1, $2, $3, $4, $5) RETURNING *
            `, [id_pago, id_usuario, monto, motivo, referencia_externa]);
            await client.query('UPDATE pago SET estado = $1 WHERE id_pago = $2', [nuevoEstado, id_pago]);
            await client.query(`
                INSERT INTO pago_auditoria (id_pago, id_usuario, accion, estado_anterior, estado_nuevo, monto, motivo)
                VALUES ($1, $2, 'reembolso', $3, $4, $5, $6)
            `, [id_pago, id_usuario, pago.estado, nuevoEstado, monto, motivo]);
            await client.query('COMMIT');
            return { reembolso: reembolso.rows[0], estado: nuevoEstado, reembolsado: nuevoTotal, saldo: Math.max(0, Number(pago.monto) - nuevoTotal) };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    obtenerRevisionReserva: async (id_reserva: number) => {
        const reserva = await pool.query(`
            SELECT r.id_reserva, r.estado AS estado_reserva, r.fecha_solicitud, r.fecha_reserva,
                   r.canal_reserva, r.hora_inicio, r.hora_fin, r.observaciones,
                   c.id_cancha, c.nombre AS cancha_nombre, c.disciplina, c.precio_hora,
                   r.id_cliente, COALESCE(u.nombre || ' ' || u.apellido_paterno || ' ' || COALESCE(u.apellido_materno, ''), 'Anónimo') AS cliente_nombre,
                   u.correo AS cliente_correo, u.telefono AS cliente_telefono,
                   COALESCE((SELECT json_agg(json_build_object('nombre', ut.nombre, 'cantidad', 1))
                             FROM reserva_utilidad ru JOIN utilidad ut ON ut.id_utilidad = ru.id_utilidad
                             WHERE ru.id_reserva = r.id_reserva), '[]'::json) AS utilidades
            FROM reserva r
            JOIN cancha c ON c.id_cancha = r.id_cancha
            LEFT JOIN cliente cl ON cl.id_cliente = r.id_cliente
            LEFT JOIN usuario u ON u.id_usuario = cl.id_cliente
            WHERE r.id_reserva = $1
        `, [id_reserva]);
        if (!reserva.rows[0]) return null;
        const pagos = await pool.query(`
            SELECT p.*, COALESCE((SELECT SUM(pr.monto) FROM pago_reembolso pr WHERE pr.id_pago = p.id_pago), 0) AS monto_reembolsado
            FROM pago p WHERE p.id_reserva = $1 ORDER BY p.id_pago DESC
        `, [id_reserva]);
        const auditorias = await Promise.all(pagos.rows.map((pago) => PagoModel.obtenerAuditoria(pago.id_pago)));
        return { reserva: reserva.rows[0], pagos: pagos.rows.map((pago, indice) => ({ ...pago, auditoria: auditorias[indice] })) };
    },

    obtenerConciliacion: async (desde: string, hasta: string) => {
        const result = await pool.query(`
            SELECT * FROM (
                SELECT p.id_pago, p.id_reserva, p.fecha_pago AS fecha_movimiento, 'ingreso'::text AS tipo_movimiento,
                       p.monto AS monto, p.metodo_pago, p.nro_comprobante AS referencia,
                       p.estado, COALESCE(u.nombre || ' ' || u.apellido_paterno, 'Anónimo') AS cliente,
                       c.nombre AS cancha, NULL::text AS motivo
                FROM pago p
                JOIN reserva r ON r.id_reserva = p.id_reserva
                JOIN cancha c ON c.id_cancha = r.id_cancha
                LEFT JOIN cliente cl ON cl.id_cliente = r.id_cliente
                LEFT JOIN usuario u ON u.id_usuario = cl.id_cliente
                WHERE p.estado IN ('pagado', 'reembolso_parcial', 'reembolsado')
                  AND p.fecha_pago >= $1::date AND p.fecha_pago < ($2::date + INTERVAL '1 day')
                UNION ALL
                SELECT p.id_pago, p.id_reserva, pr.creado_en AS fecha_movimiento, 'reembolso'::text AS tipo_movimiento,
                       pr.monto AS monto, p.metodo_pago, COALESCE(pr.referencia_externa, p.nro_comprobante) AS referencia,
                       p.estado, COALESCE(u.nombre || ' ' || u.apellido_paterno, 'Anónimo') AS cliente,
                       c.nombre AS cancha, pr.motivo
                FROM pago_reembolso pr
                JOIN pago p ON p.id_pago = pr.id_pago
                JOIN reserva r ON r.id_reserva = p.id_reserva
                JOIN cancha c ON c.id_cancha = r.id_cancha
                LEFT JOIN cliente cl ON cl.id_cliente = r.id_cliente
                LEFT JOIN usuario u ON u.id_usuario = cl.id_cliente
                WHERE pr.creado_en >= $1::date AND pr.creado_en < ($2::date + INTERVAL '1 day')
            ) movimientos
            ORDER BY fecha_movimiento DESC, id_pago DESC
        `, [desde, hasta]);
        const ingresos = result.rows.filter((row) => row.tipo_movimiento === 'ingreso').reduce((sum, row) => sum + Number(row.monto), 0);
        const reembolsos = result.rows.filter((row) => row.tipo_movimiento === 'reembolso').reduce((sum, row) => sum + Number(row.monto), 0);
        return { movimientos: result.rows, ingresos, reembolsos, neto: ingresos - reembolsos };
    },

    obtenerHistorialPagos: async (id_cliente: number) => {
        const query = `
                 SELECT p.*, r.fecha_reserva, r.hora_inicio, r.hora_fin, c.nombre as cancha_nombre,
                     COALESCE((SELECT SUM(pr.monto) FROM pago_reembolso pr WHERE pr.id_pago = p.id_pago), 0) AS monto_reembolsado
            FROM pago p
            JOIN reserva r ON p.id_reserva = r.id_reserva
            JOIN cancha c ON r.id_cancha = c.id_cancha
            WHERE r.id_cliente = $1
            ORDER BY p.id_pago DESC;
        `;
        const result = await pool.query(query, [id_cliente]);
        return result.rows;
    },

    obtenerPagosPorReserva: async (id_reserva: number) => {
        const result = await pool.query(
                        'SELECT * FROM pago WHERE id_reserva = $1 ORDER BY id_pago DESC',
            [id_reserva]
        );
        return result.rows;
    },

    obtenerPagosPendientes: async () => {
        const query = `
                 SELECT p.*,
                       r.id_cliente, r.canal_reserva, r.observaciones,
                       COALESCE((SELECT SUM(pr.monto) FROM pago_reembolso pr WHERE pr.id_pago = p.id_pago), 0) AS monto_reembolsado,
                     COALESCE(u.nombre, 'Anónimo') AS nombre, COALESCE(u.apellido_paterno, '') AS apellido_paterno, u.correo,
                   c.nombre as cancha_nombre,
                   r.fecha_reserva, r.hora_inicio, r.hora_fin
            FROM pago p
            JOIN reserva r ON p.id_reserva = r.id_reserva
                 LEFT JOIN cliente cl ON r.id_cliente = cl.id_cliente
                 LEFT JOIN usuario u ON cl.id_cliente = u.id_usuario
            JOIN cancha c ON r.id_cancha = c.id_cancha
            WHERE p.estado IN ('pendiente', 'pendiente_verificacion')
            ORDER BY p.fecha_pago DESC;
        `;
        const result = await pool.query(query);
        return result.rows;
    },

    obtenerTodosPagos: async () => {
        const query = `
            SELECT p.*,
                   r.id_cliente, r.canal_reserva, r.observaciones,
                   COALESCE((SELECT SUM(pr.monto) FROM pago_reembolso pr WHERE pr.id_pago = p.id_pago), 0) AS monto_reembolsado,
                   COALESCE(u.nombre, 'Anónimo') AS nombre, COALESCE(u.apellido_paterno, '') AS apellido_paterno, u.correo,
                   c.nombre AS cancha_nombre,
                   r.fecha_reserva, r.hora_inicio, r.hora_fin
            FROM pago p
            JOIN reserva r ON r.id_reserva = p.id_reserva
            LEFT JOIN cliente cl ON cl.id_cliente = r.id_cliente
            LEFT JOIN usuario u ON u.id_usuario = cl.id_cliente
            JOIN cancha c ON c.id_cancha = r.id_cancha
            ORDER BY p.fecha_pago DESC, p.id_pago DESC;
        `;
        const result = await pool.query(query);
        return result.rows;
    },

    eliminarPago: async (id_reserva: number) => {
        const query = `DELETE FROM pago WHERE id_reserva = $1 RETURNING *;`;
        const result = await pool.query(query, [id_reserva]);
        return result.rows[0];
    }
};
