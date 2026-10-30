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

const app: Application = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Ruta pública de autenticación y verificación de credenciales
app.use('/sol/acceso', authRoutes);

// Rutas operativas protegidas con HTTP Basic Auth
app.use('/sol/tarifas', basicAuthMiddleware, tarifaRoutes);
app.use('/sol/tickets', basicAuthMiddleware, ticketRoutes);
app.use('/sol/jornada', basicAuthMiddleware, jornadaRoutes);
app.use('/sol/reportes', basicAuthMiddleware, reporteRoutes);
app.use('/sol/cierre', basicAuthMiddleware, cierreRoutes);

// Middleware para rutas inexistentes (404)
app.use(notFoundMiddleware);

// Middleware global para excepciones y colisiones de BD (500 / 409)
app.use(globalErrorHandler);

export default app;