import { TicketActivoDto } from "./ticket.model";

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