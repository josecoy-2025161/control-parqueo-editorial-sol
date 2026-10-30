import { JornadaModel } from '../models/jornada.model.js';
import { EstadoJornadaResponseDto } from '../dtos/jornada.dto.js';

export class JornadaService {
    public static async consultarEstado(): Promise<EstadoJornadaResponseDto> {
        const { total, fechaOperacion } = await JornadaModel.obtenerResumenOperativo();

        return {
            activa: total > 0,
            totalTicketsActivos: total,
            fechaOperacionActual: fechaOperacion,
            mensaje: total > 0
                ? 'Jornada activa con registros pendientes de cierre.'
                : 'No hay tickets activos. La jornada está vacía o ya fue reiniciada.',
        };
    }
}