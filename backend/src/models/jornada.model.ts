import { pool } from '../config/db.js';
import { RowDataPacket } from 'mysql2/promise';

interface ConteoRow extends RowDataPacket {
    total: number;
    fecha_operacion: string | null;
}

export class JornadaModel {
    /**
     * Obtiene la cantidad de tickets activos actuales y la fecha operativa en curso
     */
    public static async obtenerResumenOperativo(): Promise<{ total: number; fechaOperacion: string | null }> {
        const [rows] = await pool.query<ConteoRow[]>(
            `SELECT COUNT(*) AS total, MAX(fecha_operacion) AS fecha_operacion 
       FROM registro_tickets`
        );

        const total = rows[0]?.total ?? 0;
        const fecha = rows[0]?.fecha_operacion ? String(rows[0].fecha_operacion) : null;

        return { total, fechaOperacion: fecha };
    }
}