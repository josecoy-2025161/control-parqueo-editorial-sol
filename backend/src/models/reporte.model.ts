import { pool } from '../config/db.js';
import { RowDataPacket } from 'mysql2/promise';

export interface ReporteActivoRow extends RowDataPacket {
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

export interface ReporteBorradoRow extends RowDataPacket {
    id_borrado: number;
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
    motivo_eliminacion: string;
    fecha_captura_original: string;
    fecha_eliminacion: string;
}

export class ReporteModel {
    public static async obtenerTicketsActivos(): Promise<ReporteActivoRow[]> {
        const [rows] = await pool.query<ReporteActivoRow[]>(
            `SELECT * FROM registro_tickets 
       ORDER BY fecha_operacion DESC, CAST(numero_ticket AS UNSIGNED) ASC, numero_ticket ASC`
        );
        return rows;
    }

    public static async obtenerTicketsBorrados(fechaOperacion?: string): Promise<ReporteBorradoRow[]> {
        let sql = `SELECT * FROM auditoria_borrados`;
        const params: any[] = [];

        if (fechaOperacion) {
            sql += ` WHERE fecha_operacion = ?`;
            params.push(fechaOperacion);
        }

        sql += ` ORDER BY fecha_eliminacion DESC`;
        const [rows] = await pool.query<ReporteBorradoRow[]>(sql, params);
        return rows;
    }
}