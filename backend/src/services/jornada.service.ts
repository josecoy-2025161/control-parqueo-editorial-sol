import { pool } from '../config/db.js';
import { JornadaModel } from '../models/jornada.model.js';
import { EstadoJornadaResponseDto } from '../dtos/jornada.dto.js';
import { RowDataPacket } from 'mysql2/promise';

export class JornadaService {
    public static async notificarCambio(): Promise<void> {
        await pool.query('UPDATE configuracion_jornada SET version = version + 1 WHERE id = 1');
    }

    public static async marcarFaseAuditoria(): Promise<void> {
        await pool.query("UPDATE configuracion_jornada SET fase = 'AUDITORIA', version = version + 1 WHERE id = 1");
    }

    public static async reiniciarFase(): Promise<void> {
        await pool.query("UPDATE configuracion_jornada SET fase = 'REGISTRO', version = version + 1 WHERE id = 1");
    }

    public static async consultarEstado(): Promise<EstadoJornadaResponseDto & { fase: 'REGISTRO' | 'AUDITORIA' }> {
        const { total, fechaOperacion, totalRecaudado, totalEditados } = await JornadaModel.obtenerResumenOperativo();

        // Leer estado real desde la base de datos
        const [rows] = await pool.query<RowDataPacket[]>('SELECT fase, version FROM configuracion_jornada WHERE id = 1');
        let fase = rows[0]?.fase || 'REGISTRO';
        const version = rows[0]?.version || 1;

        // Si la base de datos está vacía (0 tickets), la jornada siempre inicia en REGISTRO
        if (total === 0 && fase !== 'REGISTRO') {
            await this.reiniciarFase();
            fase = 'REGISTRO';
        }

        return {
            activa: total > 0,
            totalTicketsActivos: total,
            fechaOperacionActual: fechaOperacion,
            fase: fase,
            totalRecaudado,
            totalEditados,
            version: version,
            mensaje: total > 0
                ? (fase === 'AUDITORIA' ? 'Jornada en fase de auditoría.' : 'Jornada activa en captura.')
                : 'No hay tickets activos. La jornada está vacía o ya fue reiniciada.',
        };
    }
}