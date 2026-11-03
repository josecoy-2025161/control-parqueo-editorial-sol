import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { JornadaPollingService } from '../services/jornada-polling.service';
import { Router } from '@angular/router';

export const basicAuthInterceptor: HttpInterceptorFn = (req, next) => {
    const jornadaService = inject(JornadaPollingService);
    const router = inject(Router);

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
            // 409: Detección de jornada cerrada por el otro operador
            if (error.status === 409 && (error.error?.codigo === 'JORNADA_YA_CERRADA' || error.error?.codigo === 'JORNADA_CERRADA')) {
                jornadaService.notificarJornadaCerradaPorOtroOperador();
            }

            // 0: Caída de red o servidor
            if (error.status === 0) {
                router.navigate(['/error/conexion']);
            }

            return throwError(() => error);
        })
    );
};