export type TipoVehiculo = 'CARRO' | 'MOTO';

export interface CalcularTarifaRequestDto {
    horaEntrada: string;
    horaSalida: string;
    tipoVehiculo: TipoVehiculo;
    aplicaTarifaNoche?: boolean;
    esTicketPerdido?: boolean;
}

export interface DesgloseTarifa {
    minutosTotales: number;
    minutosFacturables: number;
    costoBase: number;
    recargoNoche: number;
    recargoPerdido: number;
}

export interface CalcularTarifaResponseDto {
    minutosEstacionado: number;
    costo: number;
    desglose?: DesgloseTarifa;
}