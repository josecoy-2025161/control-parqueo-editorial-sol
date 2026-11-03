import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'quetzal',
    standalone: true
})
export class QuetzalPipe implements PipeTransform {
    transform(value: number | null | undefined): string {
        if (value === null || value === undefined || isNaN(value)) {
            return 'Q 0.00';
        }
        return `Q ${value.toFixed(2)}`;
    }
}