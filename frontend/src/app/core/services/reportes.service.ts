import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ReporteDescargadoInfo {
    nombreArchivo: string;
    fechaDescarga: Date;
}

@Injectable({
    providedIn: 'root'
})

export class ReportesService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrl;

    // Estado reactivo que certifica que el Excel fue emitido y descargado
    public readonly ultimoReporteDescargado = signal<ReporteDescargadoInfo | null>(null);

    public descargarExcel(): Observable<HttpResponse<Blob>> {
        return this.http.get(`${this.baseUrl}/reportes/excel`, {
            responseType: 'blob',
            observe: 'response',
        }).pipe(
            tap((response) => {
                const fallback = `Reporte_Parqueo_${new Date().toLocaleDateString('es-GT').replace(/\//g, '_')}.xlsx`;
                const nombreArchivo = this.obtenerNombreArchivo(response, fallback);
                this.ultimoReporteDescargado.set({
                    nombreArchivo,
                    fechaDescarga: new Date()
                });
            })
        );
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

    public limpiarReporteDescargado(): void {
        this.ultimoReporteDescargado.set(null);
    }
}