import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../models/api-response.model';
import { ConfirmarCierreResponseDto } from '../../../models/cierre.model';

@Injectable({
    providedIn: 'root'
})

export class CierreService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrl;

    public confirmarCierre(): Observable<ApiResponse<ConfirmarCierreResponseDto>> {
        return this.http.post<ApiResponse<ConfirmarCierreResponseDto>>(`${this.baseUrl}/cierre/confirmar`, {});
    }
}