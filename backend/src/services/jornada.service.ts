import { JornadaModel } from '../models/jornada.model.js';
import { EstadoJornadaResponseDto } from '../dtos/jornada.dto.js';

export class JornadaService {

    private static faseJornada: 'REGISTRO' | 'AUDITORIA' = 'REGISTRO';
    private static versionJornada: number = 1;

    public static notificarCambio(): void {
        this.versionJornada++;
    }

    public static marcarFaseAuditoria(): void {
        this.faseJornada = 'AUDITORIA';
        this.versionJornada++;
    }

    public static reiniciarFase(): void {
        this.faseJornada = 'REGISTRO';
        this.versionJornada++;
    }

    public static async consultarEstado(): Promise<EstadoJornadaResponseDto> {
        const { total, fechaOperacion, totalRecaudado, totalEditados } = await JornadaModel.obtenerResumenOperativo();

        if (total === 0) {
            this.faseJornada = 'REGISTRO';
        }

        return {
            activa: total > 0,
            totalTicketsActivos: total,
            fechaOperacionActual: fechaOperacion,
            fase: this.faseJornada,
            totalRecaudado,
            totalEditados,
            version: this.versionJornada,
            mensaje: total > 0
                ? (this.faseJornada === 'AUDITORIA' ? 'Jornada en fase de auditoría.' : 'Jornada activa en captura.')
                : 'No hay tickets activos. La jornada está vacía o ya fue reiniciada.',
        };
    }
}