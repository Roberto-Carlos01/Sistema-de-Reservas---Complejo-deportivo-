import { Router } from "express";
import { ReportesController } from "../controllers/reportes.controller";
import { esAdmin, verificarToken } from "../middlewares/authMiddleware";

const router = Router();

// Solo administrador puede ver

router.post('/pagos', [verificarToken, esAdmin], ReportesController.obtenerDatosPagos);

router.post('/metricasPagos', [verificarToken, esAdmin], ReportesController.obtenerMetricasPagos);

router.post('/heatmap', [verificarToken, esAdmin], ReportesController.obtenerDatosOcupacion);

router.get('/listarCanchas', [verificarToken, esAdmin], ReportesController.listarCanchas);

export default router;
