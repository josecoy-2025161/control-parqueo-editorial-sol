import { ValidacionesGlobales } from './validation.util.js';
import { CalcularTarifaRequestDto, TipoVehiculo } from '../dtos/tarifa.dto.js';

const TIPOS_VEHICULO_PERMITIDOS: readonly TipoVehiculo[] = ['CARRO', 'MOTO'];

export class TarifaValidator {
    public static validateCalcularTarifa(body: any): CalcularTarifaRequestDto {
        if (!body || typeof body !== 'object') {
            throw new Error('El cuerpo de la petición no puede estar vacío.');
        }

        // Validar y normalizar formato de horas (HH:mm)
        const horaEntrada = ValidacionesGlobales.validarHora(body.horaEntrada, 'horaEntrada');
        const horaSalida = ValidacionesGlobales.validarHora(body.horaSalida, 'horaSalida');

        // Regla de negocio: hora de entrada y salida no pueden coincidir
        if (horaEntrada === horaSalida) {
            throw new Error('La hora de salida no puede ser idéntica a la hora de entrada.');
        }

        // Validar tipo de vehículo ('CARRO' | 'MOTO')
        const tipoVehiculo = ValidacionesGlobales.validarOpciones<TipoVehiculo>(
            body.tipoVehiculo,
            'tipoVehiculo',
            TIPOS_VEHICULO_PERMITIDOS
        );

        // Normalizar booleanos de casos especiales
        const aplicaTarifaNoche = ValidacionesGlobales.normalizarBooleano(body.aplicaTarifaNoche);
        const esTicketPerdido = ValidacionesGlobales.normalizarBooleano(body.esTicketPerdido);

        return {
            horaEntrada,
            horaSalida,
            tipoVehiculo,
            aplicaTarifaNoche,
            esTicketPerdido,
        };
    }
}