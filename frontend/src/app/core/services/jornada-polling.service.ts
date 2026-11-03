import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subscription, Subject, timer, switchMap, catchError, of } from 'rxjs';
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

    // Canal para comunicación instantánea entre todas las ventanas del mismo navegador
    private broadcastChannel: BroadcastChannel | null = null;

    // Evento reactivo para que la vista de Auditoría refresque sus datos sin recargar la página
    public readonly recargarAuditoria$ = new Subject<void>();

    public readonly faseActual = signal<FaseJornada>(
        (localStorage.getItem('sol_fase_jornada') as FaseJornada) || 'REGISTRO'
    );

    public readonly jornadaCerradaModalVisible = signal<boolean>(false);
    public readonly estadoJornada = signal<EstadoJornadaResponseDto | null>(null);

    // Registro del último estado conocido para detectar cambios en segundo plano
    private ultimoEstadoSerializado: string = '';

    constructor() {
        // Escucha por BroadcastChannel
        if (typeof BroadcastChannel !== 'undefined') {
            this.broadcastChannel = new BroadcastChannel('sol_parqueo_channel');
            this.broadcastChannel.onmessage = (event) => {
                if (event.data?.tipo === 'FASE_CAMBIADA') {
                    const nuevaFase: FaseJornada = event.data.fase;
                    this.aplicarFase(nuevaFase);
                    this.recargarAuditoria$.next();
                }
            };
        }

        // Escucha de respaldo por localStorage
        window.addEventListener('storage', (event) => {
            if (event.key === 'sol_fase_jornada') {
                const nuevaFase = (event.newValue as FaseJornada) || 'REGISTRO';
                this.aplicarFase(nuevaFase);
                this.recargarAuditoria$.next();
            }
        });
    }

    private aplicarFase(fase: FaseJornada): void {
        this.faseActual.set(fase);
        if (fase === 'AUDITORIA') {
            localStorage.setItem('sol_fase_jornada', 'AUDITORIA');
            if (this.router.url.includes('/registro') || this.router.url === '/') {
                this.router.navigate(['/auditoria']);
            }
        } else if (fase === 'REGISTRO') {
            localStorage.removeItem('sol_fase_jornada');
            if (this.router.url.includes('/auditoria') || this.router.url.includes('/cierre')) {
                this.router.navigate(['/registro']);
            }
        }
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

                const estadoActual = `${data.totalTicketsActivos}_${data.fechaOperacionActual}_${data.fase}_${data.activa}`;

                // Si el estado en el backend cambió (nuevos tickets, otra jornada, etc.)
                if (this.ultimoEstadoSerializado && this.ultimoEstadoSerializado !== estadoActual) {
                    // Avisar a la pantalla de auditoría para que vuelva a pedir la lista de tickets
                    this.recargarAuditoria$.next();
                }
                this.ultimoEstadoSerializado = estadoActual;

                // Si el backend reporta que ya está en fase de AUDITORIA
                if (data.fase === 'AUDITORIA') {
                    this.faseActual.set('AUDITORIA');
                    localStorage.setItem('sol_fase_jornada', 'AUDITORIA');
                    if (this.router.url.includes('/registro') || this.router.url === '/') {
                        this.router.navigate(['/auditoria']);
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

    public finalizarRegistroDelDia(): void {
        // Notificar a las demás pestañas abiertas en la misma máquina
        this.broadcastChannel?.postMessage({ tipo: 'FASE_CAMBIADA', fase: 'AUDITORIA' });
        this.aplicarFase('AUDITORIA');
        this.recargarAuditoria$.next();

        // Notificar al backend para sincronizar otros navegadores o dispositivos
        this.http.post(`${this.baseUrl}/jornada/finalizar-registro`, {}).subscribe({
            next: () => { },
            error: () => { }
        });
    }

    public reiniciarParaNuevaJornada(): void {
        this.broadcastChannel?.postMessage({ tipo: 'FASE_CAMBIADA', fase: 'REGISTRO' });
        this.aplicarFase('REGISTRO');
        this.jornadaCerradaModalVisible.set(false);
    }

    public notificarJornadaCerradaPorOtroOperador(): void {
        this.jornadaCerradaModalVisible.set(true);
        this.faseActual.set('REGISTRO');
        localStorage.removeItem('sol_fase_jornada');
        // Mantenemos el polling activo para que detecte la siguiente jornada sin morir
    }
}