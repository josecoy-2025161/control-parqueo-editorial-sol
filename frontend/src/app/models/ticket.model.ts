import { TipoVehiculo } from './tarifa.model';

export interface TicketActivoDto {
    idRegistro: number;
    fechaOperacion: string;
    numeroTicket: string;
    tipoVehiculo: TipoVehiculo;
    horaEntrada: string;
    horaSalida: string;
    minutosEstacionado: number;
    tiempoLegible: string;
    costo: number;
    esTicketPerdido: boolean;
    aplicaTarifaNoche: boolean;
    motivoEdicion: string | null;
    fechaCaptura: string;
}

export interface CrearTicketRequestDto {
    fechaOperacion: string;
    numeroTicket: string;
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