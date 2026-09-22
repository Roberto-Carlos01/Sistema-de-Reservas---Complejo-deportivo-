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
  }
}
