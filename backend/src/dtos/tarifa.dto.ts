export type TipoVehiculo = 'CARRO' | 'MOTO';

export interface CalcularTarifaRequestDto {
    horaEntrada: string;       // Formato "HH:mm" o "HH:mm:ss" (ej. "12:05" o "12:05:00")
    horaSalida: string;        // Formato "HH:mm" o "HH:mm:ss" (ej. "13:30" o "13:30:00")
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
    minutosEstacionado: number; // Minutos totales transcurridos
    costo: number;              // En Quetzales enteros
    desglose?: DesgloseTarifa;
}