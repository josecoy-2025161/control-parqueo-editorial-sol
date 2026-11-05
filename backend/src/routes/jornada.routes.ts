import { Router, Request, Response } from 'express';
import { JornadaController } from '../controllers/jornada.controller.js';

const router = Router();

router.route('/estado')
    .get(JornadaController.obtenerEstado)
    .all((req: Request, res: Response) => {
        res.setHeader('Allow', 'GET');
        res.status(405).json({
            ok: false,
            mensaje: `Método ${req.method} no permitido en ${req.originalUrl}. Acepta: GET.`,
        });
    });

router.route('/finalizar-registro')
    .post(JornadaController.finalizarRegistro)
    .all((req: Request, res: Response) => {
        res.setHeader('Allow', 'POST');
        res.status(405).json({
            ok: false,
            mensaje: `Método ${req.method} no permitido en ${req.originalUrl}. Acepta: POST.`,
        });
    });

export default router;