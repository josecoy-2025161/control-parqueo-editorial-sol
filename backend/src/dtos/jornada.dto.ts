export interface EstadoJornadaResponseDto {
    activa: boolean;
    totalTicketsActivos: number;
    fechaOperacionActual: string | null;
    fase?: 'REGISTRO' | 'AUDITORIA';
    totalRecaudado?: number;
    totalEditados?: number;
    version?: number;
    mensaje?: string;
}