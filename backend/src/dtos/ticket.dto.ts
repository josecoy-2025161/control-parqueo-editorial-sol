import { TipoVehiculo } from './tarifa.dto.js';

export interface TicketActivoDto {
    idRegistro: number;
    fechaOperacion: string;
    numeroTicket: string;
    tipoVehiculo: TipoVehiculo;
    horaEntrada: string;
    horaSalida: string;
    minutosEstacionado: number;
    tiempoLegible: string;      // Ej. "1 hr 25 min" para la tabla de auditoría
    costo: number;
    esTicketPerdido: boolean;
    aplicaTarifaNoche: boolean;
    motivoEdicion: string | null;
    fechaCaptura: string;
}

export interface CrearTicketRequestDto {
    fechaOperacion: string;    // "YYYY-MM-DD" o "DD/MM/YYYY"
    numeroTicket: string;      // Correlativo físico
    tipoVehiculo: TipoVehiculo;
    horaEntrada: string;
    horaSalida: string;
    aplicaTarifaNoche?: boolean;
    esTicketPerdido?: boolean;
}

export interface EditarHorarioRequestDto {
    horaEntrada: string;
    horaSalida: string;
    motivoEdicion: string;
}

export interface EliminarTicketRequestDto {
    motivoEliminacion: string;
}

export interface ResumenAuditoriaDto {
    totalTickets: number;
    totalCarros: number;
    totalMotos: number;
    totalPerdidos: number;
    totalRecaudado: number;
}

export interface AuditoriaJornadaResponseDto {
    resumen: ResumenAuditoriaDto;
    tickets: TicketActivoDto[];
}