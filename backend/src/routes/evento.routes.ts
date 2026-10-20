import { Router } from 'express';
import { EventoController } from '../controllers/evento.controller';
import { verificarToken, esAdminOEmpleado, esCliente } from '../middlewares/authMiddleware';

const router = Router();

// Rutas Públicas (o accesibles para todos los autenticados)
router.get('/', verificarToken, EventoController.obtenerEventos);
router.get('/servicios', verificarToken, EventoController.obtenerServicios);
router.get('/canchas-ocupadas', verificarToken, esAdminOEmpleado, EventoController.canchasOcupadas);

// Rutas Cliente
router.get('/mis-inscripciones', verificarToken, esCliente, EventoController.misInscripciones);
router.post('/:id/inscribir', verificarToken, esCliente, EventoController.inscribir);
router.patch('/:id/cancelar-inscripcion', verificarToken, esCliente, EventoController.cancelarInscripcion);

// Rutas Administrador / Empleado
router.get('/:id/inscritos', verificarToken, esAdminOEmpleado, EventoController.obtenerInscritos);
router.post('/', verificarToken, esAdminOEmpleado, EventoController.crearEvento);
router.put('/:id', verificarToken, esAdminOEmpleado, EventoController.editarEvento);
router.patch('/:id/cancelar', verificarToken, esAdminOEmpleado, EventoController.cancelarEvento);
router.patch('/:id/reprogramar', verificarToken, esAdminOEmpleado, EventoController.reprogramarEvento);

export default router;