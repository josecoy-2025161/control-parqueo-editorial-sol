import { Request, Response } from 'express';
import { TicketValidator } from '../utils/ticket-validator.util.js';
import { TicketService } from '../services/ticket.service.js';
import { ValidacionesGlobales } from '../utils/validation.util.js';

export class TicketController {

    public static async obtenerPorNumero(req: Request, res: Response): Promise<void> {
        try {
            const { numero } = req.params;
            const numeroTicket = ValidacionesGlobales.validarNumeroTicket(numero, 'numeroTicket');
            const ticket = await TicketService.obtenerPorNumero(numeroTicket);

            res.status(200).json({
                ok: true,
                data: ticket,
            });
        } catch (error: any) {
            const status = error.message.includes('No se encontró') ? 404 : 400;
            res.status(status).json({
                ok: false,
                mensaje: error.message || 'Error al buscar el ticket.',
            });
        }
    }

    public static async registrar(req: Request, res: Response): Promise<void> {
        try {
            const dto = TicketValidator.validateCrearTicket(req.body);
            const ticket = await TicketService.registrarTicket(dto);

            res.status(201).json({
                ok: true,
                mensaje: 'Ticket registrado exitosamente.',
                data: ticket,
            });
        } catch (error: any) {
            const status = error.message.includes('ya fue ingresado') ? 409 : 400;
            res.status(status).json({
                ok: false,
                mensaje: error.message || 'Error al registrar el ticket.',
            });
        }
    }

    public static async listarAuditoria(req: Request, res: Response): Promise<void> {
        try {
            const filtro = typeof req.query.numero === 'string' ? req.query.numero.trim() : undefined;
            const auditoria = await TicketService.obtenerAuditoria(filtro);

            res.status(200).json({
                ok: true,
                data: auditoria,
            });
        } catch (error: any) {
            res.status(500).json({
                ok: false,
                mensaje: error.message || 'Error al obtener los datos de auditoría.',
            });
        }
    }

    public static async balanceHorario(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const idRegistro = parseInt(req.params.id, 10);
            if (isNaN(idRegistro) || idRegistro <= 0) {
                res.status(400).json({ ok: false, mensaje: 'ID de ticket inválido.' });
                return;
            }

            const dto = TicketValidator.validateEditarHorario(req.body);
            const ticketActualizado = await TicketService.editarHorario(idRegistro, dto);

            res.status(200).json({
                ok: true,
                mensaje: 'Horario del ticket actualizado correctamente.',
                data: ticketActualizado,
            });
        } catch (error: any) {
            const status = error.message.includes('no existe') ? 404 : 400;
            res.status(status).json({
                ok: false,
                mensaje: error.message || 'Error al editar el horario del ticket.',
            });
        }
    }

    public static async eliminar(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const idRegistro = parseInt(req.params.id, 10);
            if (isNaN(idRegistro) || idRegistro <= 0) {
                res.status(400).json({ ok: false, mensaje: 'ID de ticket inválido.' });
                return;
            }

            const dto = TicketValidator.validateEliminarTicket(req.body);
            await TicketService.anularTicket(idRegistro, dto.motivoEliminacion);

            res.status(200).json({
                ok: true,
                mensaje: 'Ticket anulado y registrado en auditoría de borrados.',
            });
        } catch (error: any) {
            const status = error.message.includes('no fue encontrado') ? 404 : 400;
            res.status(status).json({
                ok: false,
                mensaje: error.message || 'Error al eliminar el ticket.',
            });
        }
    }
}