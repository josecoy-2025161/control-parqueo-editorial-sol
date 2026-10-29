import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import { testDbConnection } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import tarifaRoutes from './routes/tarifa.routes.js';
import { basicAuthMiddleware } from './middlewares/auth.middleware.js';

const app = express();

app.use(cors());
app.use(express.json());

// Ruta de autenticación y verificación
app.use('/sol/acceso', authRoutes);
app.use('/sol/tarifas', basicAuthMiddleware, tarifaRoutes);

// Proteger todas las rutas operativas bajo /sol/...
// app.use('/sol/tickets', basicAuthMiddleware, ticketRoutes);

app.listen(ENV.PORT, async () => {
    console.log(`Servidor backend corriendo en el puerto ${ENV.PORT}`);
    await testDbConnection();
});