import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CierreService } from './services/cierre.service';
import { ReportesService } from '../../core/services/reportes.service';
import { JornadaPollingService } from '../../core/services/jornada-polling.service';
import { AuditoriaService } from '../auditoria/services/auditoria.service';
import { ResumenAuditoriaDto } from '../../models/auditoria.model';
import { QuetzalPipe } from '../../shared/pipes/quetzal.pipe';

@Component({
  selector: 'app-cierre',
  standalone: true,
  imports: [CommonModule, FormsModule, QuetzalPipe],
  templateUrl: './cierre.html',
  styleUrl: './cierre.css'
})

export class Cierre implements OnInit {
  private readonly cierreService = inject(CierreService);
  private readonly reportesService = inject(ReportesService);
  private readonly jornadaPolling = inject(JornadaPollingService);
  private readonly auditoriaService = inject(AuditoriaService);
  private readonly router = inject(Router);

  public nombreArchivo = signal<string>('Reporte_Parqueo.xlsx');
  public fechaOperacion = signal<string>('—');
  public resumen = signal<ResumenAuditoriaDto>({
    totalTickets: 0,
    totalCarros: 0,
    totalMotos: 0,
    totalPerdidos: 0,
    totalRecaudado: 0
  });

  public checkConfirmado = signal<boolean>(false);
  public procesandoCierre = signal<boolean>(false);
  public errorMensaje = signal<string | null>(null);

  ngOnInit(): void {
    // 1. Obtener datos pasados desde Auditoría por router state
    const state = history.state;
    if (state && state.resumen) {
      this.resumen.set(state.resumen);
      this.fechaOperacion.set(state.fechaOperacion || '—');
      if (state.nombreArchivo) {
        this.nombreArchivo.set(state.nombreArchivo);
      }
    } else {
      // 2. Si se refrescó, leer del servicio de reportes y de auditoría
      const rep = this.reportesService.ultimoReporteDescargado();
      if (rep) {
        this.nombreArchivo.set(rep.nombreArchivo);
      }
      this.auditoriaService.obtenerAuditoria().subscribe({
        next: (res) => {
          if (res.data) {
            this.resumen.set(res.data.resumen);
            if (res.data.tickets && res.data.tickets.length > 0) {
              this.fechaOperacion.set(res.data.tickets[0].fechaOperacion);
            }
          }
        }
      });
    }
  }

  public volverAuditoria(): void {
    this.router.navigate(['/auditoria']);
  }

  public ejecutarCierreSeguro(): void {
    if (!this.checkConfirmado()) return;

    this.procesandoCierre.set(true);
    this.errorMensaje.set(null);

    this.cierreService.confirmarCierre().subscribe({
      next: () => {
        this.procesandoCierre.set(false);
        this.reportesService.limpiarReporteDescargado();

        // Reiniciar la jornada activa a nivel global para todos los dispositivos
        this.jornadaPolling.reiniciarParaNuevaJornada();
      },
      error: (err) => {
        this.procesandoCierre.set(false);
        this.errorMensaje.set(err.error?.mensaje || 'Error al ejecutar el cierre seguro de jornada.');
      }
    });
  }
}