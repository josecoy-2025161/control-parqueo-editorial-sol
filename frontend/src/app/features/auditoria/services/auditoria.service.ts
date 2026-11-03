import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../models/api-response.model';
import { TicketActivoDto, EditarHorarioRequestDto } from '../../../models/ticket.model';
import { AuditoriaJornadaResponseDto } from '../../../models/auditoria.model';
import { CalcularTarifaRequestDto, CalcularTarifaResponseDto } from '../../../models/tarifa.model';

@Injectable({
    providedIn: 'root'
})

export class AuditoriaService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrl;

    public obtenerAuditoria(filtroNumero?: string): Observable<ApiResponse<AuditoriaJornadaResponseDto>> {
        let params = new HttpParams();
        if (filtroNumero && filtroNumero.trim()) {
            params = params.set('numero', filtroNumero.trim());
        }
        return this.http.get<ApiResponse<AuditoriaJornadaResponseDto>>(`${this.baseUrl}/tickets/activos`, { params });
    }

    public buscarPorNumero(numeroTicket: string): Observable<ApiResponse<TicketActivoDto>> {
        return this.http.get<ApiResponse<TicketActivoDto>>(`${this.baseUrl}/tickets/buscar/${numeroTicket}`);
    }

    public recalcularTarifaSimulada(dto: CalcularTarifaRequestDto): Observable<ApiResponse<CalcularTarifaResponseDto>> {
        return this.http.post<ApiResponse<CalcularTarifaResponseDto>>(`${this.baseUrl}/tarifas/calcular`, dto);
    }

    public balanceHorario(idRegistro: number, dto: EditarHorarioRequestDto): Observable<ApiResponse<TicketActivoDto>> {
        return this.http.patch<ApiResponse<TicketActivoDto>>(`${this.baseUrl}/tickets/${idRegistro}/balance`, dto);
    }

    public anularTicket(idRegistro: number, motivoEliminacion: string): Observable<ApiResponse> {
        return this.http.delete<ApiResponse>(`${this.baseUrl}/tickets/${idRegistro}`, {
            body: { motivoEliminacion }
        });
    }
}