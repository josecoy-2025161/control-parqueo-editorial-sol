export class ValidacionesGlobales {
    // Validar que el campo no sea nulo, indefinido ni texto en blanco
    public static validarCadena = (valor: unknown, campo: string): string => {
        if (valor === undefined || valor === null || typeof valor !== 'string' || valor.trim() === '') {
            throw new Error(`El campo ${campo} es obligatorio y no puede estar vacío.`);
        }
        return valor.trim();
    };

    // Validar texto descriptivo para justificaciones (motivo de edición y anulación)
    // Permite letras, números, espacios y signos de puntuación comunes; rechaza emojis y caracteres de control
    public static validarTextoJustificacion = (valor: unknown, campo: string, minLongitud = 5, maxLongitud = 255): string => {
        const texto = ValidacionesGlobales.validarCadena(valor, campo);

        if (texto.length < minLongitud) {
            throw new Error(`El campo ${campo} debe contener al menos ${minLongitud} caracteres.`);
        }

        if (texto.length > maxLongitud) {
            throw new Error(`El campo ${campo} no puede exceder los ${maxLongitud} caracteres.`);
        }

        // Acepta letras con tildes, números, espacios y signos de puntuación estándar
        const regexTextoValido = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s.,;:()#\-_/]+$/;
        if (!regexTextoValido.test(texto)) {
            throw new Error(`El campo ${campo} contiene caracteres no permitidos o símbolos inválidos.`);
        }

        return texto;
    };

    // Validar número de ticket físico (cadena numérica que preserva representación exacta)
    public static validarNumeroTicket = (valor: unknown, campo = 'No. de ticket'): string => {
        const ticketStr = ValidacionesGlobales.validarCadena(valor, campo);
        const regexSoloNumeros = /^\d+$/;

        if (!regexSoloNumeros.test(ticketStr)) {
            throw new Error(`El campo ${campo} solo debe contener dígitos numéricos.`);
        }

        if (ticketStr.length > 20) {
            throw new Error(`El campo ${campo} no puede exceder los 20 dígitos.`);
        }

        return ticketStr;
    };

    // Validar formato de hora en 24 horas (HH:mm o HH:mm:ss)
    public static validarHora = (valor: unknown, campo: string): string => {
        const horaStr = ValidacionesGlobales.validarCadena(valor, campo);
        const regexHora = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;

        if (!regexHora.test(horaStr)) {
            throw new Error(`El campo ${campo} debe tener un formato de hora válido en 24 horas (HH:mm o HH:mm:ss).`);
        }

        // Normalizar a formato HH:mm cortando segundos si vienen presentes
        const partes = horaStr.split(':');
        return `${partes[0].padStart(2, '0')}:${partes[1].padStart(2, '0')}`;
    };

    // Validar fecha de operación (YYYY-MM-DD o DD/MM/YYYY): no permite fechas futuras
    public static validarFechaOperacion = (valor: unknown, campo = 'Fecha de operación'): string => {
        const fechaStr = ValidacionesGlobales.validarCadena(valor, campo);

        // Normalizar si viene en formato DD/MM/YYYY a YYYY-MM-DD
        let fechaISO = fechaStr;
        const regexLatino = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const coincidenciaLatina = fechaStr.match(regexLatino);

        if (coincidenciaLatina) {
            const [, dia, mes, anio] = coincidenciaLatina;
            fechaISO = `${anio}-${mes}-${dia}`;
        }

        const regexISO = /^\d{4}-\d{2}-\d{2}$/;
        if (!regexISO.test(fechaISO)) {
            throw new Error(`El campo ${campo} debe tener un formato de fecha válido (YYYY-MM-DD o DD/MM/YYYY).`);
        }

        const [anio, mes, dia] = fechaISO.split('-').map(Number);
        const fechaObj = new Date(anio, mes - 1, dia);

        if (
            fechaObj.getFullYear() !== anio ||
            fechaObj.getMonth() !== mes - 1 ||
            fechaObj.getDate() !== dia
        ) {
            throw new Error(`El campo ${campo} contiene una fecha calendario inexistente.`);
        }

        // Comparar con la fecha actual del sistema (sin horas)
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        fechaObj.setHours(0, 0, 0, 0);

        if (fechaObj > hoy) {
            throw new Error(`El campo ${campo} no puede ser una fecha futura.`);
        }

        return fechaISO;
    };

    // Validar números enteros no negativos (minutos, costos en Quetzales enteros, IDs)
    public static validarEnteroNoNegativo = (valor: unknown, campo: string): number => {
        if (valor === undefined || valor === null || valor === '') {
            throw new Error(`El campo ${campo} no puede estar vacío.`);
        }

        const numero = Number(valor);
        if (!Number.isInteger(numero) || numero < 0) {
            throw new Error(`El campo ${campo} debe ser un número entero válido y no negativo.`);
        }

        return numero;
    };

    // Validar valores permitidos de un enum o conjunto cerrado de opciones
    public static validarOpciones = <T extends string>(valor: unknown, campo: string, opcionesValidas: readonly T[]): T => {
        const cadena = ValidacionesGlobales.validarCadena(valor, campo);
        const normalizado = cadena.toUpperCase();

        const opcionEncontrada = opcionesValidas.find((opcion) => opcion.toUpperCase() === normalizado);
        if (!opcionEncontrada) {
            throw new Error(`El campo ${campo} es inválido. Opciones permitidas: ${opcionesValidas.join(', ')}.`);
        }

        return opcionEncontrada;
    };

    // Normalizar y validar valores booleanos
    public static normalizarBooleano = (valor: unknown): boolean => {
        return valor === true || valor === 'true' || valor === 1 || valor === '1';
    };
}