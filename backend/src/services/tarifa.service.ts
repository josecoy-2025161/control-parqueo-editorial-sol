import { CalcularTarifaRequestDto, CalcularTarifaResponseDto, TipoVehiculo } from '../dtos/tarifa.dto.js';

export class TarifaService {
    private static readonly MINUTOS_APERTURA = 4 * 60 + 30; // 04:30 AM (270 min)
    private static readonly MINUTOS_CIERRE = 17 * 60 + 30;   // 05:30 PM (1050 min)
    private static readonly RECARGO_NOCHE = 150;
    private static readonly RECARGO_PERDIDO = 25;

    private static convertirHoraAMinutos(hora: string): number {
        const [horas, minutos] = hora.split(':').map(Number);
        return horas * 60 + minutos;
    }

    /**
     * Minutos reales transcurridos en el parqueo (soporta salida tras medianoche)
     */
    public static calcularMinutosTotales(minEntrada: number, minSalida: number): number {
        return minSalida > minEntrada
            ? minSalida - minEntrada
            : (minSalida + 24 * 60) - minEntrada;
    }

    /**
     * Minutos facturables limitados estrictamente a la ventana operativa (4:30 AM a 5:30 PM)
     */
    public static calcularMinutosFacturables(minEntrada: number, minSalida: number): number {
        const calcularVentanaMismoDia = (inicio: number, fin: number): number => {
            const inicioReal = Math.max(inicio, TarifaService.MINUTOS_APERTURA);
            const finReal = Math.min(fin, TarifaService.MINUTOS_CIERRE);
            return finReal > inicioReal ? finReal - inicioReal : 0;
        };

        if (minSalida > minEntrada) {
            return calcularVentanaMismoDia(minEntrada, minSalida);
        } else {
            // Estancia habitual que cruza la noche
            const facturableDia1 = calcularVentanaMismoDia(minEntrada, TarifaService.MINUTOS_CIERRE);
            const facturableDia2 = calcularVentanaMismoDia(TarifaService.MINUTOS_APERTURA, minSalida);
            return facturableDia1 + facturableDia2;
        }
    }

    /**
     * Cálculo de tarifa por intervalos y redondeo hacia arriba
     */
    private static calcularCostoBase(minutosFacturables: number, tipo: TipoVehiculo): number {
        if (minutosFacturables <= 0) return 0;

        if (tipo === 'CARRO') {
            if (minutosFacturables <= 30) return 5;
            if (minutosFacturables <= 60) return 10;
            const bloquesExtra = Math.ceil((minutosFacturables - 60) / 30);
            return 10 + bloquesExtra * 5;
        } else {
            // MOTO
            if (minutosFacturables <= 60) return 5;
            const bloquesExtra = Math.ceil((minutosFacturables - 60) / 30);
            return 5 + bloquesExtra * 5;
        }
    }

    public static procesarCalculo(dto: CalcularTarifaRequestDto): CalcularTarifaResponseDto {
        const minEntrada = this.convertirHoraAMinutos(dto.horaEntrada);
        const minSalida = this.convertirHoraAMinutos(dto.horaSalida);

        const minutosTotales = this.calcularMinutosTotales(minEntrada, minSalida);
        const minutosFacturables = this.calcularMinutosFacturables(minEntrada, minSalida);

        // Se activa recargo nocturno si cruza la medianoche, si la salida o entrada rebasa las 5:30 PM, o si la casilla viene marcada
        const cruzoHorarioCierre =
            minSalida <= minEntrada ||
            minSalida > TarifaService.MINUTOS_CIERRE ||
            minEntrada >= TarifaService.MINUTOS_CIERRE;

        const aplicaNoche = Boolean(dto.aplicaTarifaNoche || cruzoHorarioCierre);

        const costoBase = this.calcularCostoBase(minutosFacturables, dto.tipoVehiculo);
        const recargoNocheMonto = aplicaNoche ? this.RECARGO_NOCHE : 0;
        const recargoPerdidoMonto = dto.esTicketPerdido ? this.RECARGO_PERDIDO : 0;

        const costoFinal = costoBase + recargoNocheMonto + recargoPerdidoMonto;

        return {
            minutosEstacionado: minutosTotales,
            costo: costoFinal,
            desglose: {
                minutosTotales,
                minutosFacturables,
                costoBase,
                recargoNoche: recargoNocheMonto,
                recargoPerdido: recargoPerdidoMonto,
            },
        };
    }
}