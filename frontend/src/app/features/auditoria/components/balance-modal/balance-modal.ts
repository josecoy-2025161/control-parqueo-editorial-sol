import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, debounceTime } from 'rxjs';
import { AuditoriaService } from '../../services/auditoria.service';
import { TicketActivoDto } from '../../../../models/ticket.model';
import { QuetzalPipe } from '../../../../shared/pipes/quetzal.pipe';
import { motivoValidator } from '../../../../shared/validators/text-motivo.validator';

@Component({
  selector: 'app-balance-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, QuetzalPipe],
  templateUrl: './balance-modal.html',
  styleUrl: './balance-modal.css'
})

export class BalanceModal implements OnInit, OnDestroy {
  @Input({ required: true }) ticket!: TicketActivoDto;
  @Output() cancelado = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<TicketActivoDto>();

  private readonly fb = inject(FormBuilder);
  private readonly auditoriaService = inject(AuditoriaService);

  public balanceForm!: FormGroup;
  public nuevoCosto = signal<number>(0);
  public calculando = signal<boolean>(false);
  public procesando = signal<boolean>(false);
  public errorMensaje = signal<string | null>(null);

  private sub: Subscription | null = null;

  ngOnInit(): void {
    const horaEntradaLimpia = this.ticket.horaEntrada.slice(0, 5);
    const horaSalidaLimpia = this.ticket.horaSalida.slice(0, 5);
    this.nuevoCosto.set(this.ticket.costo);

    this.balanceForm = this.fb.group({
      horaEntrada: [horaEntradaLimpia, [Validators.required]],
      horaSalida: [horaSalidaLimpia, [Validators.required]],
      motivoEdicion: ['', [Validators.required, motivoValidator(6)]]
    });

    this.sub = this.balanceForm.valueChanges.pipe(debounceTime(350)).subscribe(() => {
      this.recalcularNuevoCosto();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private recalcularNuevoCosto(): void {
    const { horaEntrada, horaSalida } = this.balanceForm.value;
    if (!horaEntrada || !horaSalida || horaEntrada === horaSalida) {
      return;
    }

    // Evaluar si las nuevas horas cruzan las 17:30 o salen al día siguiente
    const cruzaNoche = horaSalida <= horaEntrada || horaSalida > '17:30' || horaEntrada >= '17:30';

    this.calculando.set(true);
    this.auditoriaService.recalcularTarifaSimulada({
      horaEntrada,
      horaSalida,
      tipoVehiculo: this.ticket.tipoVehiculo,
      aplicaTarifaNoche: cruzaNoche, // <-- Se evalúa con el nuevo horario
      esTicketPerdido: this.ticket.esTicketPerdido
    }).subscribe({
      next: (res) => {
        this.calculando.set(false);
        if (res.ok && res.data) {
          this.nuevoCosto.set(res.data.costo);
        }
      },
      error: () => {
        this.calculando.set(false);
      }
    });
  }

  public esMismoHorario(): boolean {
    if (!this.balanceForm) return true;
    const { horaEntrada, horaSalida } = this.balanceForm.value;
    const entradaActual = this.ticket.horaEntrada.slice(0, 5);
    const salidaActual = this.ticket.horaSalida.slice(0, 5);
    return horaEntrada === entradaActual && horaSalida === salidaActual;
  }

  public onSubmit(): void {
    this.errorMensaje.set(null);

    if (this.balanceForm.invalid) {
      this.balanceForm.markAllAsTouched();
      return;
    }

    if (this.esMismoHorario()) {
      this.errorMensaje.set('Debe modificar al menos una de las horas para efectuar una corrección.');
      return;
    }

    this.procesando.set(true);
    const form = this.balanceForm.value;

    this.auditoriaService.balanceHorario(this.ticket.idRegistro, {
      horaEntrada: form.horaEntrada,
      horaSalida: form.horaSalida,
      motivoEdicion: form.motivoEdicion.trim()
    }).subscribe({
      next: (res) => {
        this.procesando.set(false);
        if (res.data) {
          this.guardado.emit(res.data);
        }
      },
      error: (err) => {
        this.procesando.set(false);
        this.errorMensaje.set(err.error?.mensaje || 'Error al guardar la corrección de horario.');
      }
    });
  }

  public cerrar(): void {
    this.cancelado.emit();
  }

  public autoAjustar(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }
}