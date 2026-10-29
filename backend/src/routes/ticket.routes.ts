import { Router, Request, Response } from 'express';
import { TicketController } from '../controllers/ticket.controller.js';

const router = Router();

// Registro de nuevo ticket
router.route('/')
    .post(TicketController.registrar)
    .all((req: Request, res: Response) => {
        res.setHeader('Allow', 'POST');
        res.status(405).json({ ok: false, mensaje: `Método ${req.method} no permitido en ${req.originalUrl}. Acepta: POST.` });
    });

// Consulta general de auditoría (con soporte opcional de query param ?numero=...)
router.route('/activos')
    .get(TicketController.listarAuditoria)
    .all((req: Request, res: Response) => {
        res.setHeader('Allow', 'GET');
        res.status(405).json({ ok: false, mensaje: `Método ${req.method} no permitido en ${req.originalUrl}. Acepta: GET.` });
    });

// Buscar ticket específico por su número correlativo físico
router.route('/buscar/:numero')
    .get(TicketController.obtenerPorNumero)
    .all((req: Request, res: Response) => {
        res.setHeader('Allow', 'GET');
        res.status(405).json({ ok: false, mensaje: `Método ${req.method} no permitido en ${req.originalUrl}. Acepta: GET.` });
    });

// Edición de horario / balance por ID interno
router.route('/:id/balance')
    .patch(TicketController.balanceHorario)
    .all((req: Request, res: Response) => {
        res.setHeader('Allow', 'PATCH');
        res.status(405).json({ ok: false, mensaje: `Método ${req.method} no permitido en ${req.originalUrl}. Acepta: PATCH.` });
    });

// Eliminación justificada por ID interno
router.route('/:id')
    .delete(TicketController.eliminar)
    .all((req: Request, res: Response) => {
        res.setHeader('Allow', 'DELETE');
        res.status(405).json({ ok: false, mensaje: `Método ${req.method} no permitido en ${req.originalUrl}. Acepta: DELETE.` });
    });

export default router;