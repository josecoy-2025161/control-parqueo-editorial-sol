import { Routes } from '@angular/router';
import { Registro } from './features/registro/registro';
import { registroGuard } from './core/guards/registro.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'registro',
        pathMatch: 'full'
    },
    {
        path: 'registro',
        component: Registro,
        canActivate: [registroGuard] // <-- Bloquea el acceso si ya se finalizó el registro
    },
    {
        path: 'auditoria',
        loadComponent: () => import('./features/auditoria/auditoria').then(m => m.Auditoria)
    },
    {
        path: 'cierre',
        loadComponent: () => import('./features/cierre/cierre').then(m => m.Cierre)
    },
    {
        path: '**',
        redirectTo: 'registro'
    }
];