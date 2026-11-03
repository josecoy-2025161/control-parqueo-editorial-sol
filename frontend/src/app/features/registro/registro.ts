import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { RegistroTicketService } from './services/registro-ticket.service';
import { QuetzalPipe } from '../../shared/pipes/quetzal.pipe';
import { TipoVehiculo } from '../../models/tarifa.model';

function validarHorasDistintas(group: AbstractControl): ValidationErrors | null {
  const entrada = group.get('horaEntrada')?.value;
  const salida = group.get('horaSalida')?.value;
  if (entrada && salida && entrada === salida) {
    return { horasIguales: true };
  }
  return null;
}

function validarFechaNoFutura(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const fechaIngresada = new Date(control.value + 'T00:00:00');
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (fechaIngresada > hoy) {
    return { fechaFutura: true };
  }
  return null;
}

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, QuetzalPipe],
  templateUrl: './registro.html',
  styleUrl: './registro.css'
})
export class Registro implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly ticketService = inject(RegistroTicketService);
  private readonly router = inject(Router);

  public ticketForm!: FormGroup;
  public cobroCalculado = signal<number>(0);
  public calculandoTarifa = signal<boolean>(false);
  public guardando = signal<boolean>(false);
  public mensajeError = signal<string | null>(null);
  public mensajeExito = signal<string | null>(null);

  private readonly formChangesSub = new Subscription();

  ngOnInit(): void {
    this.inicializarFormulario();
    this.escucharCambiosParaCalculo();
  }

  ngOnDestroy(): void {
    this.formChangesSub.unsubscribe();
  }

  private obtenerFechaHoy(): string {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  private inicializarFormulario(): void {
    this.ticketForm = this.fb.group({
      fechaOperacion: [this.obtenerFechaHoy(), [Validators.required, validarFechaNoFutura]],
      numeroTicket: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      tipoVehiculo: ['CARRO' as TipoVehiculo, [Validators.required]],
      horaEntrada: ['', [Validators.required]],
      horaSalida: ['', [Validators.required]],
      aplicaTarifaNoche: [false],
      esTicketPerdido: [false]
    }, { validators: validarHorasDistintas });
  }

  private escucharCambiosParaCalculo(): void {
    const sub = this.ticketForm.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged((prev, curr) =>
        prev.horaEntrada === curr.horaEntrada &&
        prev.horaSalida === curr.horaSalida &&
        prev.tipoVehiculo === curr.tipoVehiculo &&
        prev.aplicaTarifaNoche === curr.aplicaTarifaNoche &&
        prev.esTicketPerdido === curr.esTicketPerdido
      )
    ).subscribe(() => {
      this.solicitarCalculoTarifa();
    });

    this.formChangesSub.add(sub);
  }

  public seleccionarTipoVehiculo(tipo: TipoVehiculo): void {
    this.ticketForm.patchValue({ tipoVehiculo: tipo });
  }

  private solicitarCalculoTarifa(): void {
    const { horaEntrada, horaSalida, tipoVehiculo, aplicaTarifaNoche, esTicketPerdido } = this.ticketForm.value;

    if (!horaEntrada || !horaSalida || this.ticketForm.hasError('horasIguales')) {
      this.cobroCalculado.set(0);
      return;
    }

    this.calculandoTarifa.set(true);

    this.ticketService.calcularTarifa({
      horaEntrada,
      horaSalida,
      tipoVehiculo,
      aplicaTarifaNoche: !!aplicaTarifaNoche,
      esTicketPerdido: !!esTicketPerdido
    }).subscribe({
      next: (res) => {
        this.calculandoTarifa.set(false);
        if (res.ok && res.data) {
          this.cobroCalculado.set(res.data.costo);
        }
      },
      error: () => {
        this.calculandoTarifa.set(false);
        this.cobroCalculado.set(0);
      }
    });
  }

  public guardarBoleta(): void {
    this.mensajeError.set(null);
    this.mensajeExito.set(null);

    if (this.ticketForm.invalid) {
      this.ticketForm.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const formVal = this.ticketForm.value;

    this.ticketService.registrarTicket({
      fechaOperacion: formVal.fechaOperacion,
      numeroTicket: String(formVal.numeroTicket).trim(),
      tipoVehiculo: formVal.tipoVehiculo,
      horaEntrada: formVal.horaEntrada,
      horaSalida: formVal.horaSalida,
      aplicaTarifaNoche: !!formVal.aplicaTarifaNoche,
      esTicketPerdido: !!formVal.esTicketPerdido
    }).subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.mensajeExito.set(res.mensaje || 'Ticket registrado exitosamente.');

        // Mantener fecha y tipo, limpiar los demás campos para captura rápida
        const fechaActual = this.ticketForm.get('fechaOperacion')?.value;
        const tipoActual = this.ticketForm.get('tipoVehiculo')?.value;

        this.ticketForm.reset({
          fechaOperacion: fechaActual,
          numeroTicket: '',
          tipoVehiculo: tipoActual,
          horaEntrada: '',
          horaSalida: '',
          aplicaTarifaNoche: false,
          esTicketPerdido: false
        });

        this.cobroCalculado.set(0);
      },
      error: (err) => {
        this.guardando.set(false);
        const backendMsg = err.error?.mensaje || 'Error al registrar el ticket.';
        this.mensajeError.set(backendMsg);
      }
    });
  }

  public limpiarCampos(): void {
    const fecha = this.ticketForm.get('fechaOperacion')?.value;
    this.ticketForm.reset({
      fechaOperacion: fecha,
      numeroTicket: '',
      tipoVehiculo: 'CARRO',
      horaEntrada: '',
      horaSalida: '',
      aplicaTarifaNoche: false,
      esTicketPerdido: false
    });
    this.cobroCalculado.set(0);
    this.mensajeError.set(null);
    this.mensajeExito.set(null);
  }

  public irAuditoria(): void {
    this.router.navigate(['/auditoria']);
  }
}