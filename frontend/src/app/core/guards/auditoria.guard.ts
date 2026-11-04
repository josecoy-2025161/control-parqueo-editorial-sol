import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map, catchError, of } from 'rxjs';
import { JornadaPollingService } from '../services/jornada-polling.service';

export const auditoriaGuard: CanActivateFn = () => {
    const jornadaService = inject(JornadaPollingService);
    const router = inject(Router);

    // Verificación local inmediata
    const faseGuardada = localStorage.getItem('sol_fase_jornada');
    if (faseGuardada === 'AUDITORIA' || jornadaService.faseActual() === 'AUDITORIA') {
        return true;
    }

    // Verificación contra el Backend
    return jornadaService.consultarEstado().pipe(
        map((res) => {
            const data = res.data;

            // Si la jornada está vacía o el backend indica que sigue en fase de captura (REGISTRO),
            // se bloquea el acceso a auditoría y se redirige al formulario inicial
            if (!data || data.totalTicketsActivos === 0 || data.fase !== 'AUDITORIA') {
                return router.parseUrl('/registro');
            }

            // Si el backend confirma que la jornada ya avanzó a auditoría, sincronizamos la fase local
            localStorage.setItem('sol_fase_jornada', 'AUDITORIA');
            jornadaService.faseActual.set('AUDITORIA');
            return true;
        }),
        catchError(() => {
            // En caso de error de conexión, si no está validado en local, volvemos a registro
            if (localStorage.getItem('sol_fase_jornada') === 'AUDITORIA') {
                return of(true);
            }
            return of(router.parseUrl('/registro'));
        })
    );
};