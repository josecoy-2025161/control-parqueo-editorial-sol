export interface EstadoJornadaResponseDto {
    activa: boolean;
    totalTicketsActivos: number;
    fechaOperacionActual: string | null;
    mensaje?: string;
}