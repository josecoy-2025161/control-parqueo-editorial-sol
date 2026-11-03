import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'ticketDuration',
    standalone: true
})
export class TicketDurationPipe implements PipeTransform {
    transform(tiempoLegible?: string, minutos?: number): string {
        if (tiempoLegible && tiempoLegible.trim()) {
            return tiempoLegible;
        }
        if (minutos !== undefined && minutos !== null && !isNaN(minutos)) {
            const hrs = Math.floor(minutos / 60);
            const mins = minutos % 60;
            if (hrs > 0 && mins > 0) return `${hrs} hr ${mins} min`;
            if (hrs > 0) return `${hrs} hr`;
            return `${mins} min`;
        }
        return '—';
    }
}