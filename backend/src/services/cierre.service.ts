import { CierreModel, HistoricoRow } from '../models/cierre.model.js';
import { ConfirmarCierreResponseDto, TicketHistoricoDto } from '../dtos/cierre.dto.js';
import { ValidacionesGlobales } from '../utils/validation.util.js';

export class CierreService {
    public static async confirmarCierreJornada(): Promise<ConfirmarCierreResponseDto> {
        try {
            const resultado = await CierreModel.ejecutarCierreTransaccional();

            return {
                fechaCierre: resultado.fechaCierre,
                totalTicketsArchivados: resultado.totalArchivados,
                totalRecaudado: resultado.totalRecaudado,
                mensaje: 'Jornada cerrada exitosamente. Los registros han sido archivados de forma permanente y la jornada operativa está lista para el nuevo día.',
            };
        } catch (error: any) {
            if (error.message === 'JORNADA_YA_CERRADA') {
                throw new Error('La jornada ya no contiene tickets activos o ya fue cerrada previamente por el otro operador.');
            }
            if (error.message === 'FALLO_RESPALDO_HISTORICO') {
                throw new Error('Error al respaldar en el histórico. Los datos operativos se conservaron sin alteraciones.');
            }
            throw error;
        }
    }

    public static async obtenerHistorico(fechaOperacion?: string): Promise<TicketHistoricoDto[]> {
        const rows = await CierreModel.consultarHistorico(fechaOperacion);

        return rows.map((r: HistoricoRow) => ({
            idHistorico: r.id_historico,
            idRegistroOriginal: r.id_registro_original,
            fechaOperacion: typeof r.fecha_operacion === 'string' ? r.fecha_operacion : new Date(r.fecha_operacion).toISOString().split('T')[0],
            numeroTicket: r.numero_ticket,
            tipoVehiculo: r.tipo_vehiculo,
            horaEntrada: r.hora_entrada,
            horaSalida: r.hora_salida,
            minutosEstacionado: r.minutos_estacionado,
            tiempoLegible: ValidacionesGlobales.formatearMinutosLegible(r.minutos_estacionado),
            costo: r.costo,
            esTicketPerdido: Boolean(r.es_ticket_perdido),
            aplicaTarifaNoche: Boolean(r.aplica_tarifa_noche),
            motivoEdicion: r.motivo_edicion,
            fechaCaptura: new Date(r.fecha_captura).toISOString(),
            fechaCierreSistema: new Date(r.fecha_cierre_sistema).toISOString(),
        }));
    }
}