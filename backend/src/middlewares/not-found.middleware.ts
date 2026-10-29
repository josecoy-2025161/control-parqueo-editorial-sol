import { Request, Response, NextFunction } from 'express';

export const notFoundMiddleware = (req: Request, res: Response, _next: NextFunction): void => {
    res.status(404).json({
        ok: false,
        mensaje: `La ruta solicitada '${req.method} ${req.originalUrl}' no existe en este servidor.`,
    });
};