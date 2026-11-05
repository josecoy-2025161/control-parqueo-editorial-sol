import { pool } from '../config/db.js';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import { TicketActivoDto } from '../dtos/ticket.dto.js';

export interface TicketRow extends RowDataPacket {
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

export class TicketModel {
    public static async findByNumero(numeroTicket: string): Promise<TicketRow | null> {
        const [rows] = await pool.query<TicketRow[]>(
            'SELECT * FROM registro_tickets WHERE numero_ticket = ? LIMIT 1',
            [numeroTicket]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    public static async findById(idRegistro: number): Promise<TicketRow | null> {
        const [rows] = await pool.query<TicketRow[]>(
            'SELECT * FROM registro_tickets WHERE id_registro = ? LIMIT 1',
            [idRegistro]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    public static async create(datos: {
        fechaOperacion: string;
        numeroTicket: string;
        tipoVehiculo: string;
        horaEntrada: string;
        horaSalida: string;
        costo: number;
        esTicketPerdido: boolean;
        aplicaTarifaNoche: boolean;
    }): Promise<number> {
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO registro_tickets 
       (fecha_operacion, numero_ticket, tipo_vehiculo, hora_entrada, hora_salida, costo, es_ticket_perdido, aplica_tarifa_noche)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                datos.fechaOperacion,
                datos.numeroTicket,
                datos.tipoVehiculo,
                datos.horaEntrada,
                datos.horaSalida,
                datos.costo,
                datos.esTicketPerdido,
                datos.aplicaTarifaNoche,
            ]
        );
        return result.insertId;
    }

    public static async findAllActivos(filtroNumero?: string): Promise<TicketRow[]> {
        let sql = `SELECT * FROM registro_tickets`;
        const params: any[] = [];

        if (filtroNumero) {
            sql += ` WHERE numero_ticket LIKE ?`;
            params.push(`%${filtroNumero}%`);
        }

        // Regla de orden: fecha descendente y numero_ticket ascendente (convertido a entero)
        sql += ` ORDER BY fecha_operacion DESC, CAST(numero_ticket AS UNSIGNED) ASC, numero_ticket ASC`;

        const [rows] = await pool.query<TicketRow[]>(sql, params);
        return rows;
    }

    public static async updateHorario(
        idRegistro: number,
        horaEntrada: string,
        horaSalida: string,
        costo: number,
        motivoEdicion: string,
        aplicaTarifaNoche: boolean
    ): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(
            `UPDATE registro_tickets 
             SET hora_entrada = ?, hora_salida = ?, costo = ?, motivo_edicion = ?, aplica_tarifa_noche = ?
             WHERE id_registro = ?`,
            [horaEntrada, horaSalida, costo, motivoEdicion, aplicaTarifaNoche, idRegistro]
        );
        return result.affectedRows > 0;
    }

    /**
     * Eliminación transaccional: Copia a auditoria_borrados y elimina de registro_tickets
     */
    public static async eliminarConAuditoria(idRegistro: number, motivoEliminacion: string): Promise<boolean> {
        const connection: PoolConnection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Obtener registro actual bloqueándolo para lectura concurrente
            const [rows] = await connection.query<TicketRow[]>(
                'SELECT * FROM registro_tickets WHERE id_registro = ? FOR UPDATE',
                [idRegistro]
            );

            if (rows.length === 0) {
                await connection.rollback();
                return false;
            }

            const ticket = rows[0];

            // Insertar copia en auditoria_borrados
            await connection.query<ResultSetHeader>(
                `INSERT INTO auditoria_borrados 
         (id_registro_original, fecha_operacion, numero_ticket, tipo_vehiculo, hora_entrada, hora_salida, 
          minutos_estacionado, costo, es_ticket_perdido, aplica_tarifa_noche, motivo_eliminacion, fecha_captura_original)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    ticket.id_registro,
                    ticket.fecha_operacion,
                    ticket.numero_ticket,
                    ticket.tipo_vehiculo,
                    ticket.hora_entrada,
                    ticket.hora_salida,
                    ticket.minutos_estacionado,
                    ticket.costo,
                    ticket.es_ticket_perdido,
                    ticket.aplica_tarifa_noche,
                    motivoEliminacion,
                    ticket.fecha_captura,
                ]
            );

            // Eliminar de la tabla operativa activa
            await connection.query<ResultSetHeader>(
                'DELETE FROM registro_tickets WHERE id_registro = ?',
                [idRegistro]
            );

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}