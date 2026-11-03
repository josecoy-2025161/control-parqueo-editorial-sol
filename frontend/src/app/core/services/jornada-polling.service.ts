import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subscription, timer, switchMap, catchError, of } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';
import { EstadoJornadaResponseDto } from '../../models/jornada.model';

export type FaseJornada = 'REGISTRO' | 'AUDITORIA';

@Injectable({
    providedIn: 'root'
})

export class JornadaPollingService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly baseUrl = environment.apiUrl;
    private pollingSub: Subscription | null = null;

    // Fase actual en la que se encuentra la jornada
    public readonly faseActual = signal<FaseJornada>(
        (localStorage.getItem('sol_fase_jornada') as FaseJornada) || 'REGISTRO'
    );

    public readonly jornadaCerradaModalVisible = signal<boolean>(false);
    public readonly estadoJornada = signal<EstadoJornadaResponseDto | null>(null);

    constructor() {
        window.addEventListener('storage', (event) => {
            if (event.key === 'sol_fase_jornada') {
                const nuevaFase = (event.newValue as FaseJornada) || 'REGISTRO';
                this.faseActual.set(nuevaFase);

                if (nuevaFase === 'AUDITORIA') {
                    this.router.navigate(['/auditoria']);
                } else if (nuevaFase === 'REGISTRO') {
                    this.router.navigate(['/registro']);
                }
            }
        });
    }

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
                const data = res.data as any;
                this.estadoJornada.set(data);

                // Si otro operador finalizó el registro desde cualquier otro navegador/dispositivo
                if (data.fase === 'AUDITORIA' && this.router.url.includes('/registro')) {
                    this.faseActual.set('AUDITORIA');
                    localStorage.setItem('sol_fase_jornada', 'AUDITORIA');
                    this.router.navigate(['/auditoria']);
                }

                // Si la jornada fue cerrada y reiniciada
                if (data.activa === false && data.totalTicketsActivos === 0) {
                    if (this.faseActual() === 'AUDITORIA') {
                        this.notificarJornadaCerradaPorOtroOperador();
                    }
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

    // Marcar que el registro del día fue finalizado
    public finalizarRegistroDelDia(): void {
        // Notificar al backend para que todos los dispositivos/incógnito se enteren
        this.http.post(`${this.baseUrl}/jornada/finalizar-registro`, {}).subscribe({
            next: () => {
                this.faseActual.set('AUDITORIA');
                localStorage.setItem('sol_fase_jornada', 'AUDITORIA');
                this.router.navigate(['/auditoria']);
            },
            error: () => {
                this.faseActual.set('AUDITORIA');
                localStorage.setItem('sol_fase_jornada', 'AUDITORIA');
                this.router.navigate(['/auditoria']);
            }
        });
    }

    // Reiniciar cuando se confirma el cierre definitivo y se vacía la jornada
    public reiniciarParaNuevaJornada(): void {
        this.faseActual.set('REGISTRO');
        localStorage.removeItem('sol_fase_jornada');
        this.jornadaCerradaModalVisible.set(false);
        this.router.navigate(['/registro']);
    }

    public notificarJornadaCerradaPorOtroOperador(): void {
        this.jornadaCerradaModalVisible.set(true);
        this.faseActual.set('REGISTRO');
        localStorage.removeItem('sol_fase_jornada');
        this.detenerPolling();
    }
}