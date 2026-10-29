import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import { testDbConnection } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import tarifaRoutes from './routes/tarifa.routes.js';
import ticketRoutes from './routes/ticket.routes.js';
import { basicAuthMiddleware } from './middlewares/auth.middleware.js';
import { notFoundMiddleware } from './middlewares/not-found.middleware.js';

const app = express();

app.use(cors());
app.use(express.json());

// Ruta de autenticación y verificación
app.use('/sol/acceso', authRoutes);

/*  Proteger todas las rutas operativas bajo /sol/...
app.use('/sol/tickets', basicAuthMiddleware, ticketRoutes); */

// Rutas operativas
app.use('/sol/tarifas', basicAuthMiddleware, tarifaRoutes);
app.use('/sol/tickets', basicAuthMiddleware, ticketRoutes);

// Middleware para rutas no encontradas (404)
app.use(notFoundMiddleware);

app.listen(ENV.PORT, async () => {
    console.log(`Servidor backend corriendo en el puerto ${ENV.PORT}`);
    await testDbConnection();
});