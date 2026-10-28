import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import { testDbConnection } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import { BasicAuthMiddlewareOptions } from 'express-basic-auth';

const app = express();

app.use(cors());
app.use(express.json());

// Ruta de autenticación y verificación
app.use('/sol/acceso', authRoutes);

// Proteger todas las rutas operativas bajo /sol/...
// (cuando agregue tickets, auditoría y reportes)
// app.use('/sol/tickets', basicAuthMiddleware, ticketRoutes);

app.listen(ENV.PORT, async () => {
    console.log(`Servidor backend corriendo en el puerto ${ENV.PORT}`);
    await testDbConnection();
});