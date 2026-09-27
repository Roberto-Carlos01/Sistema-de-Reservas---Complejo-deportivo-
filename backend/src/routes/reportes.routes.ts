import { Router } from "express";
import { ReportesController } from "../controllers/reportes.controller";
import {
  esAdmin,
  esAdminOEmpleado,
  esCliente,
  verificarToken
} from "../middlewares/authMiddleware";
const router = Router();

// Solo administrador puede ver

router.post('/pagos', [verificarToken, esAdmin], ReportesController.obtenerDatosPagos);

router.post('/metricasPagos', [verificarToken, esAdmin], ReportesController.obtenerMetricasPagos);

router.post('/heatmap', [verificarToken, esAdmin], ReportesController.obtenerDatosOcupacion);

router.get('/listarCanchas', [verificarToken, esAdmin], ReportesController.listarCanchas);



router.get(
    '/historial-inscripciones',
    [verificarToken, esCliente],
    ReportesController.obtenerHistorialInscripciones
);
router.get(
    '/historial-cliente',
    [verificarToken, esCliente],
    ReportesController.obtenerHistorialCliente
);

router.post(
  '/totalReservas',
  [verificarToken, esAdmin],
  ReportesController.obtenerTotalReservas
);
router.post(
  '/horasOcupadas',
  [verificarToken, esAdmin],
  ReportesController.obtenerHorasOcupadas
);

router.post(
  '/mayorDemanda',
  [verificarToken, esAdmin],
  ReportesController.obtenerMayorDemanda
);
router.post(
  '/rentabilidadServicios',
  [verificarToken, esAdmin],
  ReportesController.obtenerRentabilidadServicios
);
router.post(
  '/usuarios',
  verificarToken,
  esAdmin,
  ReportesController.obtenerReporteUsuarios
);


router.get(
    '/historial-cliente',
    [verificarToken, esCliente],
    ReportesController.obtenerHistorialCliente
);
router.post('/comportamiento-usuarios', [verificarToken, esAdmin], ReportesController.obtenerComportamientoUsuarios);

router.post('/detallesPagos', [verificarToken, esAdmin], ReportesController.obtenerDetallesPagos);

router.post(
  '/eventos-servicios',
  [verificarToken, esAdminOEmpleado],
  ReportesController.obtenerReporteEventosServicios
);

export default router;

