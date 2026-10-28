import { Router, Request, Response } from 'express';
import { basicAuthMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// Si pasa el middleware, devuelve estado 200 confirmando acceso (GET)
router.get('/verificar', basicAuthMiddleware, (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: 'Credenciales válidas. Acceso concedido.',
    });
});

export default router;