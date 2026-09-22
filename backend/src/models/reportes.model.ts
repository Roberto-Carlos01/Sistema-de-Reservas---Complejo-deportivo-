import { pool } from "../config/database";

interface ReportPagos {
  estado: string;
  total: number;
  cantidad: number;
}

interface MetricasPagos {
  id: string;
  label: string;
  cantidad: number;
  monto: number;
}

export const ReportesModel = {
  obtReportPagos: async (fechaInicio: string, fechaFin: string): Promise<ReportPagos[]> => {
    const query = `
      SELECT
        estado,
        SUM(monto)::numeric AS total,
        count(estado)::int AS cantidad
      FROM pago
      WHERE fecha_pago >= $1::date AND fecha_pago < ($2::date + INTERVAL '1 day')
      GROUP BY estado;
    `;
    const values = [fechaInicio, fechaFin];
    const { rows } = await pool.query<ReportPagos>(query, values);

    return rows;
  },

  obtMetricasPagos: async (fechaInicio: string, fechaFin: string): Promise<MetricasPagos[]> => {
    const query = `
      SELECT
        metodo_pago as id,
        metodo_pago as label,
        COUNT(metodo_pago)::int AS cantidad,
        SUM(monto)::numeric AS monto
      FROM pago
      WHERE fecha_pago >= $1::date AND fecha_pago < ($2::date + INTERVAL '1 day') AND metodo_pago != 'reembolsado'
      GROUP BY metodo_pago;
    `;
    const values = [fechaInicio, fechaFin];
    const { rows } = await pool.query<MetricasPagos>(query, values);

    return rows;
  }
}
