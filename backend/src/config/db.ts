import mysql from 'mysql2/promise';
import { ENV } from './env.js';

export const pool = mysql.createPool({
    host: ENV.DB.HOST,
    user: ENV.DB.USER,
    password: ENV.DB.PASSWORD,
    database: ENV.DB.NAME,
    port: ENV.DB.PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '-06:00', // Ajustado a la zona horaria de Guatemala
});

export const testDbConnection = async (): Promise<void> => {
    try {
        const connection = await pool.getConnection();
        console.log('Conexión a la base de datos establecida correctamente.');
        connection.release();
    } catch (error) {
        console.error('Error al conectar con la base de datos:', error);
        process.exit(1);
    }
};