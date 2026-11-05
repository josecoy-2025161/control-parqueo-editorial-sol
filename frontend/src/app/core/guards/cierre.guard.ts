import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { JornadaPollingService } from '../services/jornada-polling.service';
import { ReportesService } from '../services/reportes.service';

export const cierreGuard: CanActivateFn = () => {
    const jornadaService = inject(JornadaPollingService);
    const reportesService = inject(ReportesService);
    const router = inject(Router);

    // Debe haber una jornada en auditoría
    const faseActual = jornadaService.faseActual();
    if (faseActual !== 'AUDITORIA') {
        return router.parseUrl('/registro');
    }

    // Comprobar si se ha generado y descargado el Excel
    const reporteInfo = reportesService.ultimoReporteDescargado();
    const stateNav = router.getCurrentNavigation()?.extras.state;

    if (!reporteInfo && !stateNav?.['nombreArchivo']) {
        // Si intenta entrar a /cierre por URL directa sin haber hecho clic en descargar Excel
        return router.parseUrl('/auditoria');
    }

    return true;
};