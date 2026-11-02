import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ReportesService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrl;

    public descargarExcel(): Observable<HttpResponse<Blob>> {
        return this.http.get(`${this.baseUrl}/reportes/excel`, {
            responseType: 'blob',
            observe: 'response',
        });
    }

    public obtenerNombreArchivo(response: HttpResponse<Blob>, fallbackNombre: string): string {
        const disposition = response.headers.get('content-disposition');
        if (disposition && disposition.includes('filename=')) {
            const match = disposition.match(/filename="?([^";]+)"?/);
            if (match && match[1]) {
                return match[1];
            }
        }
        return fallbackNombre;
    }
}