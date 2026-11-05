import { Request, Response } from 'express';
import { CierreService } from '../services/cierre.service.js';
import { JornadaService } from '../services/jornada.service.js';

export class CierreController {
    public static async confirmarCierre(_req: Request, res: Response): Promise<void> {
        try {
            const resumen = await CierreService.confirmarCierreJornada();
            await JornadaService.reiniciarFase(); // <-- Asegura que la siguiente jornada empiece en REGISTRO

            res.status(200).json({
                ok: true,
                mensaje: 'Cierre de jornada completado.',
                data: resumen,
            });
        } catch (error: any) {
            const esConflicto = error.message.includes('ya no contiene tickets activos') || error.message.includes('cerrada previamente');
            const status = esConflicto ? 409 : 500;

            res.status(status).json({
                ok: false,
                codigo: esConflicto ? 'JORNADA_YA_CERRADA' : 'ERROR_CIERRE',
                mensaje: error.message || 'Error al procesar el cierre seguro de jornada.',
            });
        }
    }

    public static async listarHistorico(req: Request, res: Response): Promise<void> {
        try {
            const fecha = typeof req.query.fecha === 'string' ? req.query.fecha.trim() : undefined;
            const historico = await CierreService.obtenerHistorico(fecha);

            res.status(200).json({
                ok: true,
                data: historico,
            });
        } catch (error: any) {
            res.status(500).json({
                ok: false,
                mensaje: error.message || 'Error al consultar el histórico permanente.',
            });
        }
    }
}