import { Router, Request, Response } from 'express';
import { TarifaController } from '../controllers/tarifa.controller.js';

const router = Router();

router.route('/calcular')
    .post(TarifaController.calcular)
    .all((req: Request, res: Response) => {
        res.setHeader('Allow', 'POST');
        res.status(405).json({
            ok: false,
            mensaje: `Método ${req.method} no permitido para la ruta ${req.originalUrl}. Métodos aceptados: POST.`,
        });
    });

export default router;