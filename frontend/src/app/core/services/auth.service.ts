import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrl;

    // Credenciales en memoria/sesión (no persistidas en texto plano desprotegido)
    private readonly credencialesSignal = signal<string | null>(
        sessionStorage.getItem('sol_auth')
    );

    public readonly isAuthenticated = signal<boolean>(!!this.credencialesSignal());

    public getAuthHeader(): string | null {
        return this.credencialesSignal();
    }

    public setCredentials(user: string, pass: string): void {
        const token = btoa(`${user}:${pass}`);
        this.credencialesSignal.set(token);
        sessionStorage.setItem('sol_auth', token);
    }

    public clearCredentials(): void {
        this.credencialesSignal.set(null);
        this.isAuthenticated.set(false);
        sessionStorage.removeItem('sol_auth');
    }

    public verificarAcceso(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/acceso/verificar`).pipe(
            tap(() => this.isAuthenticated.set(true)),
            catchError((err) => {
                this.clearCredentials();
                return throwError(() => err);
            })
        );
    }
}