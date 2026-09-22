import { Router } from "express";
import { ReportesController } from "../controllers/reportes.controller";
import { esAdmin, verificarToken } from "../middlewares/authMiddleware";

const router = Router();

// Solo administrador puede ver

router.post('/pagos', [verificarToken, esAdmin], ReportesController.obtenerDatosPagos);

router.post('/metricasPagos', [verificarToken, esAdmin], ReportesController.obtenerMetricasPagos);

export default router;
