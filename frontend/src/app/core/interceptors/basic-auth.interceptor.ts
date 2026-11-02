import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { JornadaPollingService } from '../services/jornada-polling.service';
import { Router } from '@angular/router';

export const basicAuthInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const jornadaService = inject(JornadaPollingService);
    const router = inject(Router);

    let authReq = req;
    const token = authService.getAuthHeader();

    // Inyectar cabecera Basic Auth si existen credenciales
    if (token) {
        authReq = req.clone({
            setHeaders: {
                Authorization: `Basic ${token}`,
            },
        });
    }

    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            // 401: Credenciales inválidas
            if (error.status === 401) {
                authService.clearCredentials();
            }

            // 409 con código de jornada cerrada por otro operador
            if (error.status === 409 && (error.error?.codigo === 'JORNADA_YA_CERRADA' || error.error?.codigo === 'JORNADA_CERRADA')) {
                jornadaService.notificarJornadaCerradaPorOtroOperador();
            }

            // Fallo total de conexión / red
            if (error.status === 0) {
                router.navigate(['/error/conexion']);
            }

            return throwError(() => error);
        })
    );
};