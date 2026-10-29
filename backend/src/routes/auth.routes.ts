import { Router, Request, Response } from 'express';
import { basicAuthMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.route('/verificar')
    .get(basicAuthMiddleware, (_req: Request, res: Response) => {
        res.status(200).json({
            success: true,
            message: 'Credenciales válidas. Acceso concedido.',
        });
    })
    .all((req: Request, res: Response) => {
        res.setHeader('Allow', 'GET');
        res.status(405).json({
            success: false,
            message: `Método ${req.method} no permitido para la ruta ${req.originalUrl}. Métodos aceptados: GET.`,
        });
    });

export default router;