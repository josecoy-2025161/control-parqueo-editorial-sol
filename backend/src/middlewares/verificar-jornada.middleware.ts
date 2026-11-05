import { Request, Response, NextFunction } from 'express';
import { JornadaModel } from '../models/jornada.model.js';

export const verificarJornadaActivaMiddleware = async (
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { total } = await JornadaModel.obtenerResumenOperativo();

        if (total === 0) {
            res.status(409).json({
                ok: false,
                codigo: 'JORNADA_CERRADA',
                mensaje: 'El sistema fue reiniciado para una nueva jornada por otro operador.',
            });
            return;
        }

        next();
    } catch (error: any) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al verificar la jornada activa.',
        });
    }
};