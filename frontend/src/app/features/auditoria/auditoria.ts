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
import { BalanceModal } from './components/balance-modal/balance-modal';
import { AnularModal } from './components/anular-modal/anular-modal';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, QuetzalPipe, TicketDurationPipe, BalanceModal, AnularModal],
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
  public mensajeExito = signal<string | null>(null);

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

  // Estados de los modales
  public ticketParaEditar = signal<TicketActivoDto | null>(null);
  public ticketParaAnular = signal<TicketActivoDto | null>(null);

  private readonly subs = new Subscription();

  ngOnInit(): void {
    this.jornadaPolling.iniciarPolling();
    this.cargarDatosAuditoria();

    const searchSub = this.buscadorControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe((filtro) => {
      this.cargarDatosAuditoria(filtro || '');
    });
    this.subs.add(searchSub);

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

  public abrirEditar(ticket: TicketActivoDto): void {
    this.ticketParaEditar.set(ticket);
  }

  public onTicketEditado(ticketActualizado: TicketActivoDto): void {
    this.ticketParaEditar.set(null);
    this.mensajeExito.set(`Boleta ${ticketActualizado.numeroTicket} corregida exitosamente.`);
    this.cargarDatosAuditoria(this.buscadorControl.value || '');
  }

  public abrirEliminar(ticket: TicketActivoDto): void {
    this.ticketParaAnular.set(ticket);
  }

  public onTicketAnulado(idRegistro: number): void {
    this.ticketParaAnular.set(null);
    this.mensajeExito.set('Boleta anulada y transferida al registro de auditoría.');
    this.cargarDatosAuditoria(this.buscadorControl.value || '');
  }

  public generarReporteExcel(): void {
    this.generandoExcel.set(true);
    this.reportesService.descargarExcel().subscribe({
      next: (response) => {
        this.generandoExcel.set(false);
        const fallback = `Reporte_Parqueo_${new Date().toLocaleDateString('es-GT').replace(/\//g, '_')}.xlsx`;
        const nombreArchivo = this.reportesService.obtenerNombreArchivo(response, fallback);

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
}