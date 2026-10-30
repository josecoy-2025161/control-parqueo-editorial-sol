import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import { testDbConnection } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import tarifaRoutes from './routes/tarifa.routes.js';
import ticketRoutes from './routes/ticket.routes.js';
import jornadaRoutes from './routes/jornada.routes.js'
import reporteRoutes from './routes/reporte.routes.js';
import cierreRoutes from './routes/cierre.routes.js';
import { basicAuthMiddleware } from './middlewares/auth.middleware.js';
import { notFoundMiddleware } from './middlewares/not-found.middleware.js';
import { globalErrorHandler } from './middlewares/error.middleware.js';

const app = express();

app.use(cors());
app.use(express.json());

// Ruta de autenticación y verificación
app.use('/sol/acceso', authRoutes);

// Rutas operativas
app.use('/sol/tarifas', basicAuthMiddleware, tarifaRoutes);
app.use('/sol/tickets', basicAuthMiddleware, ticketRoutes);
app.use('/sol/jornada', basicAuthMiddleware, jornadaRoutes);
app.use('/sol/reportes', basicAuthMiddleware, reporteRoutes);
app.use('/sol/cierre', basicAuthMiddleware, cierreRoutes);

// Middleware para rutas no encontradas (404)
app.use(notFoundMiddleware);

// Middleware global de manejo de excepciones
app.use(globalErrorHandler);

app.listen(ENV.PORT, async () => {
    console.log(`Servidor backend corriendo en el puerto ${ENV.PORT}`);
    await testDbConnection();
});