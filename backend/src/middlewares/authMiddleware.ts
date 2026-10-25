import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';

const verificarToken = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            error: 'Acceso denegado. No se proporcionó un token de autenticación.'
        });
    }

    try {
        const decodificado = jwt.verify(token, process.env.JWT_SECRET as string);
        const claims = decodificado as jwt.JwtPayload & { id_usuario?: number | string };
        if (!claims.id_usuario) {
            return res.status(401).json({ error: 'Token inválido o sin usuario asociado.' });
        }

        const resultado = await pool.query(
            'SELECT estado_cuenta FROM usuario WHERE id_usuario = $1',
            [claims.id_usuario]
        );
        const usuario = resultado.rows[0] as { estado_cuenta?: string } | undefined;
        if (!usuario || usuario.estado_cuenta?.toLowerCase() === 'eliminado') {
            return res.status(401).json({ error: 'La cuenta no existe o ha sido eliminada.' });
        }

        (req as any).usuario = decodificado;
        next();
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Sesión expirada por inactividad. Por favor, inicia sesión de nuevo.'
            });
        }
        if (!(error instanceof jwt.JsonWebTokenError)) {
            console.error('Error al verificar el estado del usuario:', error);
            return res.status(500).json({ error: 'Error al verificar el estado de la cuenta.' });
        }
        return res.status(403).json({
            error: 'Token inválido o corrupto.'
        });
    }
};

const esAdmin = (req: Request, res: Response, next: NextFunction) => {
    const usuario = (req as any).usuario;
    const rol = usuario?.rol?.toLowerCase();
    if (!usuario || (rol !== 'admin' && rol !== 'administrador')) {
        return res.status(403).json({
            error: 'Acceso denegado. Se requieren permisos de administrador.'
        });
    }
    next();
};

const esAdminOEmpleado = (req: Request, res: Response, next: NextFunction) => {
    const usuario = (req as any).usuario;
    const rol = usuario?.rol?.toLowerCase();
    if (!usuario || (rol !== 'admin' && rol !== 'administrador' && rol !== 'empleado')) {
        return res.status(403).json({
            error: 'Acceso denegado. Se requieren permisos de administrador o empleado.'
        });
    }
    next();
};

const esCliente = (req: Request, res: Response, next: NextFunction) => {
    const usuario = (req as any).usuario;
    const rol = usuario?.rol?.toLowerCase();
    if (!usuario || rol !== 'cliente') {
        return res.status(403).json({
            error: 'Acceso denegado. Se requieren permisos de cliente.'
        });
    }
    next();
};

export { verificarToken, esAdmin, esAdminOEmpleado, esCliente };