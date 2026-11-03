import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function motivoValidator(minLongitud: number = 5): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const valor = control.value;
        if (!valor || typeof valor !== 'string') {
            return { required: true };
        }

        const limpio = valor.trim();
        if (limpio.length < minLongitud) {
            return { minlength: { requiredLength: minLongitud, actualLength: limpio.length } };
        }

        // Permitir texto estándar: letras, números, acentos, espacios y signos ortográficos usuales
        const patronValido = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s.,;:()#\-_/]+$/;
        if (!patronValido.test(limpio)) {
            return { formatoInvalido: true };
        }

        return null;
    };
}