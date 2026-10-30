import { Router, Request, Response } from 'express';
import { ReporteController } from '../controllers/reporte.controller.js';

const router = Router();

router.route('/excel')
    .get(ReporteController.descargarExcel)
    .all((req: Request, res: Response) => {
        res.setHeader('Allow', 'GET');
        res.status(405).json({
            ok: false,
            mensaje: `Método ${req.method} no permitido en ${req.originalUrl}. Acepta: GET.`,
        });
    });

export default router;