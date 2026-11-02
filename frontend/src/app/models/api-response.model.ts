export interface ApiResponse<T = any> {
    ok?: boolean;
    success?: boolean; // Para /sol/acceso/verificar
    data?: T;
    mensaje?: string;
    message?: string;
    codigo?: string;
}