import ExcelJS from 'exceljs';
import { ReporteModel } from '../models/reporte.model.js';
import { ValidacionesGlobales } from '../utils/validation.util.js';

export class ReporteService {
    private static normalizarFechaISO(fecha: any): string {
        if (!fecha) {
            const hoy = new Date();
            return hoy.toISOString().split('T')[0];
        }
        if (fecha instanceof Date) {
            const anio = fecha.getFullYear();
            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
            const dia = String(fecha.getDate()).padStart(2, '0');
            return `${anio}-${mes}-${dia}`;
        }
        return String(fecha).slice(0, 10);
    }

    private static formatearFechaNombre(fechaISO: string): string {
        const [anio, mes, dia] = fechaISO.split('-');
        return `${dia}_${mes}_${anio}`;
    }

    public static async generarExcelJornada(): Promise<{ buffer: Buffer; nombreArchivo: string }> {
        const activos = await ReporteModel.obtenerTicketsActivos();

        // Normalizar estrictamente a formato YYYY-MM-DD para MySQL
        const fechaRefISO = activos.length > 0
            ? this.normalizarFechaISO(activos[0].fecha_operacion)
            : this.normalizarFechaISO(new Date());

        const borrados = await ReporteModel.obtenerTicketsBorrados(fechaRefISO);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Editorial Sol - Control de Parqueo';
        workbook.created = new Date();

        // ==========================================
        // HOJA 1: TICKETS REGISTRADOS (ACTIVOS)
        // ==========================================
        const wsActivos = workbook.addWorksheet('Tickets Registrados');

        wsActivos.columns = [
            { header: 'No. Ticket', key: 'numero', width: 14 },
            { header: 'Fecha Operación', key: 'fechaOperacion', width: 16 },
            { header: 'Vehículo', key: 'tipo', width: 12 },
            { header: 'Hora Entrada', key: 'entrada', width: 14 },
            { header: 'Hora Salida', key: 'salida', width: 14 },
            { header: 'Tiempo Estacionado', key: 'tiempoLegible', width: 16 },
            { header: 'Minutos', key: 'minutos', width: 12 },
            { header: 'Tarifa Noche', key: 'noche', width: 14 },
            { header: 'Ticket Perdido', key: 'perdido', width: 14 },
            { header: 'Cobro Total (Q)', key: 'costo', width: 16 },
            { header: 'Estado Edición', key: 'estadoEdicion', width: 16 },
            { header: 'Motivo Edición', key: 'motivoEdicion', width: 35 },
            { header: 'Fecha Captura Digital', key: 'fechaCaptura', width: 22 },
        ];

        wsActivos.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        wsActivos.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1E293B' },
        };

        activos.forEach((t) => {
            wsActivos.addRow({
                numero: t.numero_ticket,
                fechaOperacion: typeof t.fecha_operacion === 'string' ? t.fecha_operacion : new Date(t.fecha_operacion).toISOString().split('T')[0],
                tipo: t.tipo_vehiculo,
                entrada: t.hora_entrada,
                salida: t.hora_salida,
                tiempoLegible: ValidacionesGlobales.formatearMinutosLegible(t.minutos_estacionado),
                minutos: t.minutos_estacionado,
                noche: t.aplica_tarifa_noche ? 'SÍ' : 'NO',
                perdido: t.es_ticket_perdido ? 'SÍ' : 'NO',
                costo: `Q ${t.costo}.00`,
                estadoEdicion: t.motivo_edicion ? 'Editado' : 'Sin editar',
                motivoEdicion: t.motivo_edicion || '—',
                fechaCaptura: new Date(t.fecha_captura).toLocaleString('es-GT'),
            });
        });

        // ==========================================
        // HOJA 2: TICKETS ELIMINADOS (AUDITORÍA)
        // ==========================================
        const wsBorrados = workbook.addWorksheet('Tickets Eliminados');

        wsBorrados.columns = [
            { header: 'No. Ticket', key: 'numero', width: 14 },
            { header: 'Fecha Operación', key: 'fechaOperacion', width: 16 },
            { header: 'Vehículo', key: 'tipo', width: 12 },
            { header: 'Hora Entrada', key: 'entrada', width: 14 },
            { header: 'Hora Salida', key: 'salida', width: 14 },
            { header: 'Tiempo Estacionado', key: 'tiempoLegible', width: 16 },
            { header: 'Minutos', key: 'minutos', width: 12 },
            { header: 'Cobro Original (Q)', key: 'costo', width: 18 },
            { header: 'Motivo Anulación', key: 'motivo', width: 40 },
            { header: 'Captura Original', key: 'fechaCaptura', width: 22 },
            { header: 'Fecha Anulación', key: 'fechaEliminacion', width: 22 },
        ];

        wsBorrados.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        wsBorrados.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF991B1B' },
        };

        borrados.forEach((b) => {
            wsBorrados.addRow({
                numero: b.numero_ticket,
                fechaOperacion: typeof b.fecha_operacion === 'string' ? b.fecha_operacion : new Date(b.fecha_operacion).toISOString().split('T')[0],
                tipo: b.tipo_vehiculo,
                entrada: b.hora_entrada,
                salida: b.hora_salida,
                tiempoLegible: ValidacionesGlobales.formatearMinutosLegible(b.minutos_estacionado),
                minutos: b.minutos_estacionado,
                costo: `Q ${b.costo}.00`,
                motivo: b.motivo_eliminacion,
                fechaCaptura: new Date(b.fecha_captura_original).toLocaleString('es-GT'),
                fechaEliminacion: new Date(b.fecha_eliminacion).toLocaleString('es-GT'),
            });
        });

        const uint8Array = await workbook.xlsx.writeBuffer();
        const buffer = Buffer.from(uint8Array);
        const nombreArchivo = `Reporte_Parqueo_${this.formatearFechaNombre(fechaRefISO)}.xlsx`;

        return { buffer, nombreArchivo };
    }
}