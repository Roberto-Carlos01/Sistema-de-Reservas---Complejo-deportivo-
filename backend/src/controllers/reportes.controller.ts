import { Request, Response } from "express";

import { ReportesModel } from "../models/reportes.model";

export const ReportesController = {
  obtenerDatosPagos: async (req: Request, res: Response) => {
    try {
      const { fechaInicio, fechaFin } = req.body;

      const result = await ReportesModel.obtReportPagos(fechaInicio, fechaFin);

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener los datos de pagos.' });
    }
  },

  obtenerMetricasPagos: async (req: Request, res: Response) => {
    try {
      const { fechaInicio, fechaFin } = req.body;

      const result = await ReportesModel.obtMetricasPagos(fechaInicio, fechaFin);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener las metricas de pagos.' });
    }
  },

  obtenerDatosOcupacion: async (req: Request, res: Response) => {
    try {
      const { fechaInicio, fechaFin, idCancha } = req.body;

      const result = await ReportesModel.obtDataHeatMap(fechaInicio, fechaFin, idCancha);

      const transformData = transformarANivoHeatmap(result);

      res.status(200).json({ success: true, data: transformData });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener datos para el heatmap.' });
    }
  },

  listarCanchas: async (req: Request, res: Response) => {
    try {
      const result = await ReportesModel.listarCanchas();

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al listar las canchas registradas.' });
    }
  }
};

const transformarANivoHeatmap = (rows: { dia: string; hora: string; reservas: number }[]) => {
  const diasMap = new Map<string, { x: string; y: number }[]>();

  rows.forEach((row) => {
    if (!diasMap.has(row.dia)) {
      diasMap.set(row.dia, []);
    }
    diasMap.get(row.dia)?.push({
      x: row.hora,
      y: row.reservas,
    });
  });

  return Array.from(diasMap.entries()).map(([dia, data]) => ({
    id: dia,
    data,
  }));
};
