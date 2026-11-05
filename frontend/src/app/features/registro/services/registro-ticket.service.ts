import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../models/api-response.model';
import { CalcularTarifaRequestDto, CalcularTarifaResponseDto } from '../../../models/tarifa.model';
import { CrearTicketRequestDto, TicketActivoDto } from '../../../models/ticket.model';

@Injectable({
    providedIn: 'root'
})
export class RegistroTicketService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrl;

    public calcularTarifa(dto: CalcularTarifaRequestDto): Observable<ApiResponse<CalcularTarifaResponseDto>> {
        return this.http.post<ApiResponse<CalcularTarifaResponseDto>>(`${this.baseUrl}/tarifas/calcular`, dto);
    }

    public registrarTicket(dto: CrearTicketRequestDto): Observable<ApiResponse<TicketActivoDto>> {
        return this.http.post<ApiResponse<TicketActivoDto>>(`${this.baseUrl}/tickets`, dto);
    }
}