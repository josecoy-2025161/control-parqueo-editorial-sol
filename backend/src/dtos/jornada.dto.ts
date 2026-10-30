export interface EstadoJornadaResponseDto {
    activa: boolean;
    totalTicketsActivos: number;
    fechaOperacionActual: string | null; // Fecha de los tickets que se están trabajando
    mensaje?: string;
}