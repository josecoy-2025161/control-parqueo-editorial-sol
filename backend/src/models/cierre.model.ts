import { pool } from '../config/db.js';
import { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

interface TicketOperativoRow extends RowDataPacket {
    id_registro: number;
    fecha_operacion: string;
    numero_ticket: string;
    tipo_vehiculo: 'CARRO' | 'MOTO';
    hora_entrada: string;
    hora_salida: string;
    minutos_estacionado: number;
    costo: number;
    es_ticket_perdido: number;
    aplica_tarifa_noche: number;
    motivo_edicion: string | null;
    fecha_captura: string;
}

export interface HistoricoRow extends RowDataPacket {
    id_historico: number;
    id_registro_original: number;
    fecha_operacion: string;
    numero_ticket: string;
    tipo_vehiculo: 'CARRO' | 'MOTO';
    hora_entrada: string;
    hora_salida: string;
    minutos_estacionado: number;
    costo: number;
    es_ticket_perdido: number;
    aplica_tarifa_noche: number;
    motivo_edicion: string | null;
    fecha_captura: string;
    fecha_cierre_sistema: string;
}

export class CierreModel {
    /**
     * Ejecuta el cierre transaccional seguro:
     * 1. Bloquea lectura con FOR UPDATE.
     * 2. Verifica si hay registros.
     * 3. Copia todo a auditoria_tickets_registrados.
     * 4. Vacia registro_tickets.
     */
    public static async ejecutarCierreTransaccional(): Promise<{ totalArchivados: number; totalRecaudado: number; fechaCierre: string }> {
        const connection: PoolConnection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Bloquear y leer los registros activos actuales
            const [ticketsActivos] = await connection.query<TicketOperativoRow[]>(
                'SELECT * FROM registro_tickets FOR UPDATE'
            );

            if (ticketsActivos.length === 0) {
                await connection.rollback();
                throw new Error('JORNADA_YA_CERRADA');
            }

            const totalArchivados = ticketsActivos.length;
            const totalRecaudado = ticketsActivos.reduce((acc, t) => acc + t.costo, 0);

            // Copiar masivamente de registro_tickets a auditoria_tickets_registrados
            const [insertResult] = await connection.query<ResultSetHeader>(
                `INSERT INTO auditoria_tickets_registrados 
         (id_registro_original, fecha_operacion, numero_ticket, tipo_vehiculo, hora_entrada, hora_salida, 
          minutos_estacionado, costo, es_ticket_perdido, aplica_tarifa_noche, motivo_edicion, fecha_captura)
         SELECT 
          id_registro, fecha_operacion, numero_ticket, tipo_vehiculo, hora_entrada, hora_salida, 
          minutos_estacionado, costo, es_ticket_perdido, aplica_tarifa_noche, motivo_edicion, fecha_captura
         FROM registro_tickets`
            );

            if (insertResult.affectedRows !== totalArchivados) {
                await connection.rollback();
                throw new Error('FALLO_RESPALDO_HISTORICO');
            }

            // Vaciar la tabla operativa una vez confirmado el respaldo
            await connection.query<ResultSetHeader>('DELETE FROM registro_tickets');

            await connection.commit();

            return {
                totalArchivados,
                totalRecaudado,
                fechaCierre: new Date().toISOString(),
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Consulta del histórico permanente
     */
    public static async consultarHistorico(fechaOperacion?: string): Promise<HistoricoRow[]> {
        let sql = `SELECT * FROM auditoria_tickets_registrados`;
        const params: any[] = [];

        if (fechaOperacion) {
            sql += ` WHERE fecha_operacion = ?`;
            params.push(fechaOperacion);
        }

        sql += ` ORDER BY fecha_cierre_sistema DESC, CAST(numero_ticket AS UNSIGNED) ASC`;

        const [rows] = await pool.query<HistoricoRow[]>(sql, params);
        return rows;
    }
}