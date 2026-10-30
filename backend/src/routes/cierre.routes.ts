import { Router, Request, Response } from 'express';
import { CierreController } from '../controllers/cierre.controller.js';

const router = Router();

router.route('/confirmar')
    .post(CierreController.confirmarCierre)
    .all((req: Request, res: Response) => {
        res.setHeader('Allow', 'POST');
        res.status(405).json({
            ok: false,
            mensaje: `Método ${req.method} no permitido en ${req.originalUrl}. Acepta: POST.`,
        });
    });

// Consulta de histórico permanente
router.route('/historico')
    .get(CierreController.listarHistorico)
    .all((req: Request, res: Response) => {
        res.setHeader('Allow', 'GET');
        res.status(405).json({
            ok: false,
            mensaje: `Método ${req.method} no permitido en ${req.originalUrl}. Acepta: GET.`,
        });
    });

export default router;