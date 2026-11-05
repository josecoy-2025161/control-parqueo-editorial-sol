import { Request, Response, NextFunction } from 'express';

export const globalErrorHandler = (
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {
    // Manejo de colisión concurrente de tickets en MySQL (llave única)
    if (err.code === 'ER_DUP_ENTRY' || (err.message && err.message.includes('Duplicate entry'))) {
        res.status(409).json({
            ok: false,
            codigo: 'TICKET_DUPLICADO',
            mensaje: 'El número de ticket ya fue ingresado por otro operador.',
        });
        return;
    }

    res.status(err.status || 500).json({
        ok: false,
        mensaje: err.message || 'Error interno del servidor.',
    });
};