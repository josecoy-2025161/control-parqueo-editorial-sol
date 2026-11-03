import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../models/api-response.model';
import { TicketActivoDto } from '../../../models/ticket.model';
import { AuditoriaJornadaResponseDto } from '../../../models/auditoria.model';;

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
}