import { JornadaModel } from '../models/jornada.model.js';
import { EstadoJornadaResponseDto } from '../dtos/jornada.dto.js';

export class JornadaService {
    // Estado compartido entre todos los operadores en el backend
    private static faseJornada: 'REGISTRO' | 'AUDITORIA' = 'REGISTRO';

    public static marcarFaseAuditoria(): void {
        this.faseJornada = 'AUDITORIA';
    }

    public static reiniciarFase(): void {
        this.faseJornada = 'REGISTRO';
    }

    public static async consultarEstado(): Promise<EstadoJornadaResponseDto & { fase: 'REGISTRO' | 'AUDITORIA' }> {
        const { total, fechaOperacion } = await JornadaModel.obtenerResumenOperativo();

        // Si la base de datos está vacía (0 tickets), la jornada siempre inicia en REGISTRO
        if (total === 0) {
            this.faseJornada = 'REGISTRO';
        }

        return {
            activa: total > 0,
            totalTicketsActivos: total,
            fechaOperacionActual: fechaOperacion,
            fase: this.faseJornada,
            mensaje: total > 0
                ? (this.faseJornada === 'AUDITORIA' ? 'Jornada en fase de auditoría.' : 'Jornada activa en captura.')
                : 'No hay tickets activos. La jornada está vacía o ya fue reiniciada.',
        };
    }
}