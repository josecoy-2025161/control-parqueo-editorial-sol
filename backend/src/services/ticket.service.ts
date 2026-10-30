import { TicketModel, TicketRow } from '../models/ticket.model.js';
import { TarifaService } from './tarifa.service.js';
import { ValidacionesGlobales } from '../utils/validation.util.js';
import {
    CrearTicketRequestDto,
    EditarHorarioRequestDto,
    TicketActivoDto,
    AuditoriaJornadaResponseDto,
    ResumenAuditoriaDto
} from '../dtos/ticket.dto.js';

export class TicketService {
    private static mapRowToDto(row: TicketRow): TicketActivoDto {
        return {
            idRegistro: row.id_registro,
            fechaOperacion: typeof row.fecha_operacion === 'string' ? row.fecha_operacion : new Date(row.fecha_operacion).toISOString().split('T')[0],
            numeroTicket: row.numero_ticket,
            tipoVehiculo: row.tipo_vehiculo,
            horaEntrada: row.hora_entrada,
            horaSalida: row.hora_salida,
            minutosEstacionado: row.minutos_estacionado,
            tiempoLegible: ValidacionesGlobales.formatearMinutosLegible(row.minutos_estacionado),
            costo: row.costo,
            esTicketPerdido: Boolean(row.es_ticket_perdido),
            aplicaTarifaNoche: Boolean(row.aplica_tarifa_noche),
            motivoEdicion: row.motivo_edicion,
            fechaCaptura: new Date(row.fecha_captura).toISOString(),
        };
    }

    public static async obtenerPorNumero(numeroTicket: string): Promise<TicketActivoDto> {
        const ticket = await TicketModel.findByNumero(numeroTicket);
        if (!ticket) {
            throw new Error(`No se encontró ningún ticket activo con el número '${numeroTicket}'.`);
        }
        return this.mapRowToDto(ticket);
    }

    public static async registrarTicket(dto: CrearTicketRequestDto): Promise<TicketActivoDto> {
        const existente = await TicketModel.findByNumero(dto.numeroTicket);
        if (existente) {
            throw new Error(`El número de ticket '${dto.numeroTicket}' ya fue ingresado en la jornada activa.`);
        }

        // El cobro siempre es calculado por el backend
        const calculo = TarifaService.procesarCalculo({
            horaEntrada: dto.horaEntrada,
            horaSalida: dto.horaSalida,
            tipoVehiculo: dto.tipoVehiculo,
            aplicaTarifaNoche: dto.aplicaTarifaNoche,
            esTicketPerdido: dto.esTicketPerdido,
        });

        const idInsertado = await TicketModel.create({
            fechaOperacion: dto.fechaOperacion,
            numeroTicket: dto.numeroTicket,
            tipoVehiculo: dto.tipoVehiculo,
            horaEntrada: dto.horaEntrada,
            horaSalida: dto.horaSalida,
            costo: calculo.costo,
            esTicketPerdido: Boolean(dto.esTicketPerdido),
            aplicaTarifaNoche: Boolean(calculo.desglose?.recargoNoche ? true : dto.aplicaTarifaNoche),
        });

        const creado = await TicketModel.findById(idInsertado);
        if (!creado) {
            throw new Error('Error al recuperar el ticket recién creado.');
        }

        return this.mapRowToDto(creado);
    }

    public static async obtenerAuditoria(filtroNumero?: string): Promise<AuditoriaJornadaResponseDto> {
        // Obtener todos los tickets sin filtrar para los totales globales
        const todos = await TicketModel.findAllActivos();

        const resumen: ResumenAuditoriaDto = {
            totalTickets: todos.length,
            totalCarros: todos.filter(t => t.tipo_vehiculo === 'CARRO').length,
            totalMotos: todos.filter(t => t.tipo_vehiculo === 'MOTO').length,
            totalPerdidos: todos.filter(t => Boolean(t.es_ticket_perdido)).length,
            totalRecaudado: todos.reduce((acc, t) => acc + t.costo, 0),
        };

        // Si hay filtro, se aplica solo a la lista devuelta sin afectar los totales
        const filasFiltradas = filtroNumero ? await TicketModel.findAllActivos(filtroNumero) : todos;

        return {
            resumen,
            tickets: filasFiltradas.map(this.mapRowToDto),
        };
    }

    public static async editarHorario(idRegistro: number, dto: EditarHorarioRequestDto): Promise<TicketActivoDto> {
        const ticketActual = await TicketModel.findById(idRegistro);
        if (!ticketActual) {
            throw new Error('El ticket especificado no existe en la jornada activa.');
        }

        const entradaActual = ticketActual.hora_entrada.slice(0, 5);
        const salidaActual = ticketActual.hora_salida.slice(0, 5);

        if (dto.horaEntrada === entradaActual && dto.horaSalida === salidaActual) {
            throw new Error('Debe modificar al menos una de las horas para registrar el cambio.');
        }

        // Recalcular tarifa con el nuevo horario
        const calculo = TarifaService.procesarCalculo({
            horaEntrada: dto.horaEntrada,
            horaSalida: dto.horaSalida,
            tipoVehiculo: ticketActual.tipo_vehiculo,
            aplicaTarifaNoche: Boolean(ticketActual.aplica_tarifa_noche),
            esTicketPerdido: Boolean(ticketActual.es_ticket_perdido),
        });

        await TicketModel.updateHorario(
            idRegistro,
            dto.horaEntrada,
            dto.horaSalida,
            calculo.costo,
            dto.motivoEdicion
        );

        const ticketActualizado = await TicketModel.findById(idRegistro);
        return this.mapRowToDto(ticketActualizado!);
    }

    public static async anularTicket(idRegistro: number, motivoEliminacion: string): Promise<void> {
        const exito = await TicketModel.eliminarConAuditoria(idRegistro, motivoEliminacion);
        if (!exito) {
            throw new Error('El ticket a eliminar no fue encontrado en la jornada activa.');
        }
    }
}