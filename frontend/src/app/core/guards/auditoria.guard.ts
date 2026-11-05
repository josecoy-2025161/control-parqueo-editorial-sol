import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map, catchError, of } from 'rxjs';
import { JornadaPollingService } from '../services/jornada-polling.service';

export const auditoriaGuard: CanActivateFn = () => {
    const jornadaService = inject(JornadaPollingService);
    const router = inject(Router);

    return jornadaService.consultarEstado().pipe(
        map((res) => {
            const data = res.data;

            // Si la jornada está vacía (0 tickets) o el backend indica que sigue en captura (REGISTRO),
            // se bloquea el acceso a auditoría y se redirige al formulario inicial
            if (!data || data.totalTicketsActivos === 0 || data.fase !== 'AUDITORIA' || data.activa === false) {
                localStorage.removeItem('sol_fase_jornada');
                jornadaService.faseActual.set('REGISTRO');
                return router.parseUrl('/registro');
            }

            localStorage.setItem('sol_fase_jornada', 'AUDITORIA');
            jornadaService.faseActual.set('AUDITORIA');
            return true;
        }),
        catchError(() => {
            if (localStorage.getItem('sol_fase_jornada') === 'AUDITORIA') {
                return of(true);
            }
            return of(router.parseUrl('/registro'));
        })
    );
};