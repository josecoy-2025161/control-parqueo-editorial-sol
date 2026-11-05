import { ValidacionesGlobales } from './validation.util.js';
import { CrearTicketRequestDto, EditarHorarioRequestDto, EliminarTicketRequestDto } from '../dtos/ticket.dto.js';
import { TipoVehiculo } from '../dtos/tarifa.dto.js';

const TIPOS_VALIDOS: readonly TipoVehiculo[] = ['CARRO', 'MOTO'];

export class TicketValidator {
    public static validateCrearTicket(body: any): CrearTicketRequestDto {
        if (!body || typeof body !== 'object') {
            throw new Error('El cuerpo de la petición no puede estar vacío.');
        }

        const fechaOperacion = ValidacionesGlobales.validarFechaOperacion(body.fechaOperacion, 'fechaOperacion');
        const numeroTicket = ValidacionesGlobales.validarNumeroTicket(body.numeroTicket, 'numeroTicket');
        const horaEntrada = ValidacionesGlobales.validarHora(body.horaEntrada, 'horaEntrada');
        const horaSalida = ValidacionesGlobales.validarHora(body.horaSalida, 'horaSalida');

        if (horaEntrada === horaSalida) {
            throw new Error('La hora de salida no puede ser idéntica a la hora de entrada.');
        }

        const tipoVehiculo = ValidacionesGlobales.validarOpciones<TipoVehiculo>(
            body.tipoVehiculo,
            'tipoVehiculo',
            TIPOS_VALIDOS
        );

        return {
            fechaOperacion,
            numeroTicket,
            tipoVehiculo,
            horaEntrada,
            horaSalida,
            aplicaTarifaNoche: ValidacionesGlobales.normalizarBooleano(body.aplicaTarifaNoche),
            esTicketPerdido: ValidacionesGlobales.normalizarBooleano(body.esTicketPerdido),
        };
    }

    public static validateEditarHorario(body: any): EditarHorarioRequestDto {
        if (!body || typeof body !== 'object') {
            throw new Error('El cuerpo de la petición no puede estar vacío.');
        }

        const horaEntrada = ValidacionesGlobales.validarHora(body.horaEntrada, 'horaEntrada');
        const horaSalida = ValidacionesGlobales.validarHora(body.horaSalida, 'horaSalida');

        if (horaEntrada === horaSalida) {
            throw new Error('La hora de salida no puede ser idéntica a la hora de entrada.');
        }

        const motivoEdicion = ValidacionesGlobales.validarTextoJustificacion(body.motivoEdicion, 'motivoEdicion', 4, 255);

        return {
            horaEntrada,
            horaSalida,
            motivoEdicion,
        };
    }

    public static validateEliminarTicket(body: any): EliminarTicketRequestDto {
        if (!body || typeof body !== 'object') {
            throw new Error('El cuerpo de la petición no puede estar vacío.');
        }

        const motivoEliminacion = ValidacionesGlobales.validarTextoJustificacion(body.motivoEliminacion, 'motivoEliminacion', 4, 255);

        return {
            motivoEliminacion,
        };
    }
}