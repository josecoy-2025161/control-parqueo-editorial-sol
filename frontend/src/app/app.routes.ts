import { Routes } from '@angular/router';
import { Registro } from './features/registro/registro';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'registro',
        pathMatch: 'full'
    },
    {
        path: 'registro',
        component: Registro
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