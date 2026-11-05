import { TipoVehiculo } from './tarifa.dto.js';

export interface ConfirmarCierreResponseDto {
    fechaCierre: string;
    totalTicketsArchivados: number;
    totalRecaudado: number;
    mensaje: string;
}

export interface TicketHistoricoDto {
    idHistorico: number;
    idRegistroOriginal: number;
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
    fechaCierreSistema: string;
}