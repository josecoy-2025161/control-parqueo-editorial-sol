import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env.js';

export const basicAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Sistema Control Parqueo - Editorial Sol"');
        res.status(401).json({
            success: false,
            message: 'Autenticación requerida. Proporcione credenciales válidas.'
        });
        return;
    }

    const base64Credentials = authHeader.split(' ')[1];
    const decodedCredentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = decodedCredentials.split(':');

    if (username === ENV.AUTH_USER && password === ENV.AUTH_PASS) {
        next();
    } else {
        res.setHeader('WWW-Authenticate', 'Basic realm="Sistema Control Parqueo -  Editorial Sol"');
        res.status(401).json({
            success: false,
            message: 'Credenciales inválidas.'
        });
    }
};