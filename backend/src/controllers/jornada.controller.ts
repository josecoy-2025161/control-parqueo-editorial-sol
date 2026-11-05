import { Request, Response } from 'express';
import { JornadaService } from '../services/jornada.service.js';

export class JornadaController {
    public static async obtenerEstado(_req: Request, res: Response): Promise<void> {
        try {
            const estado = await JornadaService.consultarEstado();
            res.status(200).json({
                ok: true,
                data: estado,
            });
        } catch (error: any) {
            res.status(500).json({
                ok: false,
                mensaje: error.message || 'Error al consultar el estado de la jornada.',
            });
        }
    }

    public static async finalizarRegistro(_req: Request, res: Response): Promise<void> {
        try {
            await JornadaService.marcarFaseAuditoria();
            res.status(200).json({
                ok: true,
                mensaje: 'Registro del día finalizado. Sistema en fase de auditoría.',
            });
        } catch (error: any) {
            res.status(500).json({
                ok: false,
                mensaje: error.message || 'Error al actualizar fase de jornada.',
            });
        }
    }
}