import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map, catchError, of } from 'rxjs';
import { JornadaPollingService } from '../services/jornada-polling.service';

export const registroGuard: CanActivateFn = () => {
    const jornadaService = inject(JornadaPollingService);
    const router = inject(Router);

    // Verificación local rápida: Si esta pestaña ya finalizó el registro
    if (jornadaService.faseActual() === 'AUDITORIA') {
        router.navigate(['/auditoria']);
        return false;
    }

    // Si se abre una pestaña nueva o se recarga de cero, consulta el estado real al servidor
    return jornadaService.consultarEstado().pipe(
        map((res) => {
            // Si la jornada está activa y ya tiene tickets registrados,
            // comprueba si el sistema debe permanecer bloqueado en auditoría
            const faseGuardada = localStorage.getItem('sol_fase_jornada');

            if (faseGuardada === 'AUDITORIA') {
                router.navigate(['/auditoria']);
                return false;
            }

            // Si la jornada ya fue cerrada por el otro operador (activa === false)
            if (res.data && res.data.activa === false && res.data.totalTicketsActivos === 0) {
                jornadaService.reiniciarParaNuevaJornada();
                return true;
            }

            return true;
        }),
        catchError(() => {
            // Ante fallo de comunicación se permite continuar de forma segura
            return of(true);
        })
    );
};