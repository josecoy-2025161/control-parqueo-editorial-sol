import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { JornadaPollingService } from '../services/jornada-polling.service';

export const basicAuthInterceptor: HttpInterceptorFn = (req, next) => {
    const jornadaService = inject(JornadaPollingService);

    // Recuperar si ya se guardó en la sesión del navegador
    const tokenGuardado = sessionStorage.getItem('sol_auth');

    let headers = req.headers;
    if (tokenGuardado) {
        headers = headers.set('Authorization', `Basic ${tokenGuardado}`);
    }

    const authReq = req.clone({
        headers,
        withCredentials: true
    });

    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 409 && (error.error?.codigo === 'JORNADA_YA_CERRADA' || error.error?.codigo === 'JORNADA_CERRADA')) {
                jornadaService.notificarJornadaCerradaPorOtroOperador();
            }

            // Si hay un error de red (backend caído o sin internet)
            if (error.status === 0) {
                console.error('Fallo de conexión al servidor.');
                alert('Pérdida temporal de conexión con el servidor. Verifica tu red y vuelve a intentarlo.');
            }

            return throwError(() => error);
        })
    );
};