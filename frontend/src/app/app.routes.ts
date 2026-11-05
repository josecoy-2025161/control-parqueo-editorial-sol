import { Routes } from '@angular/router';
import { Registro } from './features/registro/registro';
import { registroGuard } from './core/guards/registro.guard';
import { auditoriaGuard } from './core/guards/auditoria.guard';
import { cierreGuard } from './core/guards/cierre.guard';

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'registro'
    },
    {
        path: 'registro',
        component: Registro,
        canActivate: [registroGuard] // Bloquea si ya finalizó el registro
    },
    {
        path: 'auditoria',
        loadComponent: () => import('./features/auditoria/auditoria').then(m => m.Auditoria),
        canActivate: [auditoriaGuard] // Bloquea si la jornada sigue en captura de tickets
    },
    {
        path: 'cierre',
        loadComponent: () => import('./features/cierre/cierre').then(m => m.Cierre),
        canActivate: [cierreGuard] // Protege la pantalla final de cierre
    },
    {
        path: '**',
        redirectTo: 'registro'
    }
];