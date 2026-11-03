import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map, catchError, of } from 'rxjs';
import { JornadaPollingService } from '../services/jornada-polling.service';

export const registroGuard: CanActivateFn = () => {
    const jornadaService = inject(JornadaPollingService);
    const router = inject(Router);

    return jornadaService.consultarEstado().pipe(
        map((res) => {
            const data = res.data as any;

            // Si no hay tickets activos en la base de datos (jornada cerrada o inicio de día)
            if (!data || data.totalTicketsActivos === 0 || data.activa === false) {
                localStorage.removeItem('sol_fase_jornada');
                jornadaService.faseActual.set('REGISTRO');
                return true; // Permitir el formulario de registro
            }

            // Si en el backend la jornada ya pasó a fase de auditoría
            if (data.fase === 'AUDITORIA') {
                localStorage.setItem('sol_fase_jornada', 'AUDITORIA');
                jornadaService.faseActual.set('AUDITORIA');
                return router.parseUrl('/auditoria'); // Redirección limpia sin pantalla en blanco
            }

            return true;
        }),
        catchError(() => {
            return of(true);
        })
    );
};