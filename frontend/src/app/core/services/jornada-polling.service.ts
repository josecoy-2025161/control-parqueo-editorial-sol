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

    private broadcastChannel: BroadcastChannel | null = null;
    public readonly recargarAuditoria$ = new Subject<void>();

    public readonly faseActual = signal<FaseJornada>(
        (localStorage.getItem('sol_fase_jornada') as FaseJornada) || 'REGISTRO'
    );

    public readonly jornadaCerradaModalVisible = signal<boolean>(false);
    public readonly estadoJornada = signal<EstadoJornadaResponseDto | null>(null);

    private ultimoEstadoSerializado: string = '';

    constructor() {
        if (typeof BroadcastChannel !== 'undefined') {
            this.broadcastChannel = new BroadcastChannel('sol_parqueo_channel');
            this.broadcastChannel.onmessage = (event) => {
                if (event.data?.tipo === 'FASE_CAMBIADA') {
                    this.aplicarFase(event.data.fase);
                    this.recargarAuditoria$.next();
                } else if (event.data?.tipo === 'TICKETS_MODIFICADOS') {
                    // Refresco inmediato en las demás pestañas/ventanas del mismo equipo
                    this.recargarAuditoria$.next();
                }
            };
        }

        window.addEventListener('storage', (event) => {
            if (event.key === 'sol_fase_jornada') {
                this.aplicarFase((event.newValue as FaseJornada) || 'REGISTRO');
                this.recargarAuditoria$.next();
            } else if (event.key === 'sol_tickets_sync') {
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

    public notificarTicketsModificados(): void {
        this.broadcastChannel?.postMessage({ tipo: 'TICKETS_MODIFICADOS' });
        localStorage.setItem('sol_tickets_sync', Date.now().toString());
        this.recargarAuditoria$.next();
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
                const data = res.data;
                this.estadoJornada.set(data);

                // Serializamos todos los atributos clave para detectar ediciones y anulaciones
                const estadoActual = `${data.totalTicketsActivos}_${data.fechaOperacionActual}_${data.fase}_${data.version}_${data.totalRecaudado}_${data.totalEditados}`;

                if (this.ultimoEstadoSerializado && this.ultimoEstadoSerializado !== estadoActual) {
                    this.recargarAuditoria$.next();
                }
                this.ultimoEstadoSerializado = estadoActual;

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
        this.broadcastChannel?.postMessage({ tipo: 'FASE_CAMBIADA', fase: 'AUDITORIA' });
        this.aplicarFase('AUDITORIA');
        this.recargarAuditoria$.next();

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
    }
}