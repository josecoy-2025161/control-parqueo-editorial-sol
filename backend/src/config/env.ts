import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
    PORT: process.env.PORT || 3000,
    AUTH_USER: process.env.AUTH_USER || 'admin',
    AUTH_PASS: process.env.AUTH_PASS || '54321',
};