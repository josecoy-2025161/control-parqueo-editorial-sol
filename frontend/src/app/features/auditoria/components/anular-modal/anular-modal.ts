import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuditoriaService } from '../../services/auditoria.service';
import { TicketActivoDto } from '../../../../models/ticket.model';
import { QuetzalPipe } from '../../../../shared/pipes/quetzal.pipe';
import { motivoValidator } from '../../../../shared/validators/text-motivo.validator';

@Component({
  selector: 'app-anular-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, QuetzalPipe],
  templateUrl: './anular-modal.html',
  styleUrl: './anular-modal.css'
})

export class AnularModal {
  @Input({ required: true }) ticket!: TicketActivoDto;
  @Output() cancelado = new EventEmitter<void>();
  @Output() anuladoExitoso = new EventEmitter<number>();

  private readonly auditoriaService = inject(AuditoriaService);

  public motivoControl = new FormControl('', [Validators.required, motivoValidator(6)]);
  public procesando = signal<boolean>(false);
  public errorMensaje = signal<string | null>(null);

  public confirmarAnulacion(): void {
    this.errorMensaje.set(null);

    if (this.motivoControl.invalid) {
      this.motivoControl.markAsTouched();
      return;
    }

    this.procesando.set(true);
    const motivo = (this.motivoControl.value || '').trim();

    this.auditoriaService.anularTicket(this.ticket.idRegistro, motivo).subscribe({
      next: () => {
        this.procesando.set(false);
        this.anuladoExitoso.emit(this.ticket.idRegistro);
      },
      error: (err) => {
        this.procesando.set(false);
        this.errorMensaje.set(err.error?.mensaje || 'Error al anular la boleta.');
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