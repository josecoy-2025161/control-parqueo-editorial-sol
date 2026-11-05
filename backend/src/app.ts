import express, { Application } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import tarifaRoutes from './routes/tarifa.routes.js';
import ticketRoutes from './routes/ticket.routes.js';
import jornadaRoutes from './routes/jornada.routes.js';
import reporteRoutes from './routes/reporte.routes.js';
import cierreRoutes from './routes/cierre.routes.js';
import { basicAuthMiddleware } from './middlewares/auth.middleware.js';
import { notFoundMiddleware } from './middlewares/not-found.middleware.js';
import { globalErrorHandler } from './middlewares/error.middleware.js';
import { ENV } from './config/env.js';
import path from 'node:path';
import fs from 'node:fs';

const app: Application = express();

// Configuración restrictiva de CORS para producción.
// IMPORTANTE: debe registrarse ANTES de las rutas, porque Express ejecuta
// los middlewares en el mismo orden en que se declaran con app.use().
const dominiosPermitidos: string[] = [
    'http://localhost:4200',
    ENV.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
    origin: (origen, callback) => {
        // Sin "origen" = petición que no viene de un navegador (curl, Postman, servidor)
        if (!origen || dominiosPermitidos.includes(origen)) {
            callback(null, true);
        } else {
            const error: any = new Error('Origen no permitido por CORS.');
            error.status = 403;
            callback(error);
        }
    },
    credentials: true
}));

// Middlewares globales
app.use(express.json());

// Ruta pública de autenticación y verificación de credenciales
app.use('/sol/acceso', authRoutes);

// Rutas operativas protegidas con HTTP Basic Auth
app.use('/sol/tarifas', basicAuthMiddleware, tarifaRoutes);
app.use('/sol/tickets', basicAuthMiddleware, ticketRoutes);
app.use('/sol/jornada', basicAuthMiddleware, jornadaRoutes);
app.use('/sol/reportes', basicAuthMiddleware, reporteRoutes);
app.use('/sol/cierre', basicAuthMiddleware, cierreRoutes);

// Frontend estático (Angular). En Docker queda en /app/public
const carpetaFrontend = process.env.FRONTEND_DIR
    ?? path.resolve(import.meta.dirname, '../../public');

if (fs.existsSync(carpetaFrontend)) {
    app.use(express.static(carpetaFrontend, { index: false, maxAge: '7d' }));
    // Fallback SPA: cualquier GET que no sea /sol devuelve index.html
    app.use((req, res, next) => {
        if (req.method !== 'GET' || req.path.startsWith('/sol')) return next();
        res.sendFile(path.join(carpetaFrontend, 'index.html'), {
            headers: { 'Cache-Control': 'no-cache' },
        });
    });
}

// Middleware para rutas inexistentes (404)
app.use(notFoundMiddleware);

// Middleware global para excepciones y colisiones de BD (500 / 409)
app.use(globalErrorHandler);

export default app;