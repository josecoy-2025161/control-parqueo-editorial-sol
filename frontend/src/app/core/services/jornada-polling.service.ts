import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subscription, timer, switchMap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';
import { EstadoJornadaResponseDto } from '../../models/jornada.model';

@Injectable({
    providedIn: 'root'
})
export class JornadaPollingService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrl;
    private pollingSub: Subscription | null = null;

    // Signal reactivo para mostrar el modal de bloqueo concurrente
    public readonly jornadaCerradaModalVisible = signal<boolean>(false);
    public readonly estadoJornada = signal<EstadoJornadaResponseDto | null>(null);

    public consultarEstado(): Observable<ApiResponse<EstadoJornadaResponseDto>> {
        return this.http.get<ApiResponse<EstadoJornadaResponseDto>>(`${this.baseUrl}/jornada/estado`);
    }

    public iniciarPolling(): void {
        if (this.pollingSub) return;

        this.pollingSub = timer(0, environment.pollingIntervalMs).pipe(
            switchMap(() => this.consultarEstado().pipe(
                catchError(() => of(null))
            ))
        ).subscribe((res) => {
            if (res && res.data) {
                this.estadoJornada.set(res.data);
                if (res.data.activa === false && res.data.totalTicketsActivos === 0) {
                    // Detectó cierre en segundo plano
                    this.notificarJornadaCerradaPorOtroOperador();
                }
            }
        });
    }

    public detenerPolling(): void {
        if (this.pollingSub) {
            this.pollingSub.unsubscribe();
            this.pollingSub = null;
        }
    }

    public notificarJornadaCerradaPorOtroOperador(): void {
        this.jornadaCerradaModalVisible.set(true);
        this.detenerPolling();
    }

    public resetearAviso(): void {
        this.jornadaCerradaModalVisible.set(false);
    }
}