import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import { basicAuthMiddleware } from './middlewares/auth.middleware.js';

const app = express();

app.use(cors());
app.use(express.json());

// Ruta de autenticación
app.use('/sol/acceso', authRoutes);

// Proteger todas las rutas operativas bajo /api/...
// (cuando agregue tickets, auditoría y reportes)
// app.use('/api/tickets', basicAuthMiddleware, ticketRoutes);

app.listen(ENV.PORT, () => {
    console.log(`Servidor backend corriendo en el puerto: ${ENV.PORT}`);
});