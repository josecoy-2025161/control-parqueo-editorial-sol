import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { AuditoriaService } from './services/auditoria.service';
import { JornadaPollingService } from '../../core/services/jornada-polling.service';
import { ReportesService } from '../../core/services/reportes.service';
import { TicketActivoDto } from '../../models/ticket.model';
import { ResumenAuditoriaDto } from '../../models/auditoria.model';
import { QuetzalPipe } from '../../shared/pipes/quetzal.pipe';
import { TicketDurationPipe } from '../../shared/pipes/ticket-duration.pipe';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, QuetzalPipe, TicketDurationPipe],
  templateUrl: './auditoria.html',
  styleUrl: './auditoria.css'
})

export class Auditoria implements OnInit, OnDestroy {
  private readonly auditoriaService = inject(AuditoriaService);
  private readonly jornadaPolling = inject(JornadaPollingService);
  private readonly reportesService = inject(ReportesService);
  private readonly router = inject(Router);

  public cargando = signal<boolean>(true);
  public generandoExcel = signal<boolean>(false);
  public mensajeError = signal<string | null>(null);

  public tickets = signal<TicketActivoDto[]>([]);
  public resumen = signal<ResumenAuditoriaDto>({
    totalTickets: 0,
    totalCarros: 0,
    totalMotos: 0,
    totalPerdidos: 0,
    totalRecaudado: 0
  });

  public fechaOperacionActual = signal<string>('—');
  public buscadorControl = new FormControl('');
  private readonly subs = new Subscription();

  ngOnInit(): void {
    this.jornadaPolling.iniciarPolling();
    this.cargarDatosAuditoria();

    // Búsqueda reactiva por número de boleta con debounce
    const searchSub = this.buscadorControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe((filtro) => {
      this.cargarDatosAuditoria(filtro || '');
    });
    this.subs.add(searchSub);

    // Refresco automático cuando otra pestaña o el backend cambien la jornada
    const refreshSub = this.jornadaPolling.recargarAuditoria$.subscribe(() => {
      const filtroActual = this.buscadorControl.value || '';
      this.cargarDatosAuditoria(filtroActual);
    });
    this.subs.add(refreshSub);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  public cargarDatosAuditoria(filtro?: string): void {
    this.cargando.set(true);
    this.mensajeError.set(null);

    this.auditoriaService.obtenerAuditoria(filtro).subscribe({
      next: (res) => {
        this.cargando.set(false);
        if (res.ok && res.data) {
          this.tickets.set(res.data.tickets || []);
          this.resumen.set(res.data.resumen);

          // Si hay tickets, usar la fecha de operación del primero como referencia
          if (res.data.tickets && res.data.tickets.length > 0) {
            this.fechaOperacionActual.set(res.data.tickets[0].fechaOperacion);
          }
        }
      },
      error: (err) => {
        this.cargando.set(false);
        this.mensajeError.set(err.error?.mensaje || 'Error al cargar los datos de auditoría.');
      }
    });
  }

  public generarReporteExcel(): void {
    this.generandoExcel.set(true);
    this.reportesService.descargarExcel().subscribe({
      next: (response) => {
        this.generandoExcel.set(false);
        const fallback = `Reporte_Parqueo_${new Date().toLocaleDateString('es-GT').replace(/\//g, '_')}.xlsx`;
        const nombreArchivo = this.reportesService.obtenerNombreArchivo(response, fallback);

        // Disparar la descarga en el navegador
        if (response.body) {
          const blob = new Blob([response.body], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = nombreArchivo;
          a.click();
          window.URL.revokeObjectURL(url);
        }

        // Navegar a la pantalla de confirmación de cierre
        this.router.navigate(['/cierre'], {
          state: {
            nombreArchivo,
            resumen: this.resumen(),
            fechaOperacion: this.fechaOperacionActual()
          }
        });
      },
      error: (err) => {
        this.generandoExcel.set(false);
        this.mensajeError.set(err.error?.mensaje || 'Error al generar y descargar el reporte Excel.');
      }
    });
  }

  public volverRegistro(): void {
    this.router.navigate(['/registro']);
  }

  // Métodos que dispararán los modales de balance y anulación
  public abrirEditar(ticket: TicketActivoDto): void {
    alert(`Editar horario de ticket: ${ticket.numeroTicket} (Se conectará en la rama de modales)`);
  }

  public abrirEliminar(ticket: TicketActivoDto): void {
    alert(`Anular ticket: ${ticket.numeroTicket} (Se conectará en la rama de modales)`);
  }
}