import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
    PORT: Number(process.env.PORT) || 3000,
    AUTH_USER: process.env.AUTH_USER || 'admin',
    AUTH_PASS: process.env.AUTH_PASS || 'admin123',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '',
    DB: {
        HOST: process.env.DB_HOST || 'localhost',
        USER: process.env.DB_USER || 'root',
        PASSWORD: process.env.DB_PASSWORD || '',
        NAME: process.env.DB_NAME || 'control_parqueo_sol',
        PORT: Number(process.env.DB_PORT) || 3306,
    },
};