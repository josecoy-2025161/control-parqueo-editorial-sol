import { pool } from '../config/db.js';
import { RowDataPacket } from 'mysql2/promise';

interface ConteoRow extends RowDataPacket {
    total: number;
    fecha_operacion: string | null;
    total_recaudado: number;
    total_editados: number;
}

export class JornadaModel {
    /**
     * Obtiene el resumen operativo completo para control de versiones y sincronización
     */
    public static async obtenerResumenOperativo(): Promise<{
        total: number;
        fechaOperacion: string | null;
        totalRecaudado: number;
        totalEditados: number;
    }> {
        const [rows] = await pool.query<ConteoRow[]>(
            `SELECT 
                COUNT(*) AS total, 
                -- DATE_FORMAT devuelve texto "YYYY-MM-DD"; sin él, mysql2 entrega un objeto Date
                DATE_FORMAT(MAX(fecha_operacion), '%Y-%m-%d') AS fecha_operacion,
                COALESCE(SUM(costo), 0) AS total_recaudado,
                COALESCE(SUM(CASE WHEN motivo_edicion IS NOT NULL THEN 1 ELSE 0 END), 0) AS total_editados
             FROM registro_tickets`
        );

        const total = rows[0]?.total ?? 0;
        const fecha = rows[0]?.fecha_operacion ?? null;
        const totalRecaudado = Number(rows[0]?.total_recaudado ?? 0);
        const totalEditados = Number(rows[0]?.total_editados ?? 0);

        return { total, fechaOperacion: fecha, totalRecaudado, totalEditados };
    }
}