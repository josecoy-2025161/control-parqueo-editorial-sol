/**
 * =============================================================================
 * ASISTENTE DE INSTALACIÓN DEL BACKEND — Control de Parqueo Editorial Sol
 * =============================================================================
 *
 * Uso:  pnpm run setup
 *
 * Este script prepara el backend en 4 pasos:
 *   1. Pregunta los datos de conexión a MySQL y las credenciales de los operadores.
 *   2. Comprueba que MySQL responde con esos datos.
 *   3. Crea la base de datos y sus tablas a partir de src/script.sql.
 *   4. Genera el archivo .env con la configuración.
 *
 * Se puede ejecutar varias veces sin problema: si la base y las tablas ya
 * existen, no se borra ningún dato, y los valores del .env actual se ofrecen
 * como respuesta por defecto (basta con presionar Enter).
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

// -----------------------------------------------------------------------------
// Rutas de los archivos
// -----------------------------------------------------------------------------
// setup.ts vive en src/ (o en dist/ si se compila), así que la carpeta raíz
// del backend siempre está un nivel más arriba.
const carpetaActual = path.dirname(fileURLToPath(import.meta.url));
const carpetaBackend = path.resolve(carpetaActual, '..');
const rutaEnv = path.join(carpetaBackend, '.env');
const rutaEnvRespaldo = path.join(carpetaBackend, '.env.bak');
const rutaScriptSql = path.join(carpetaBackend, 'src', 'script.sql');

// Tablas que debe crear script.sql (se usan para verificar al final)
const TABLAS_ESPERADAS = [
    'registro_tickets',
    'auditoria_borrados',
    'auditoria_tickets_registrados',
    'configuracion_jornada',
];

// -----------------------------------------------------------------------------
// Lectura de respuestas desde la consola
// -----------------------------------------------------------------------------
// Se usa "readline", que viene incluido en Node.js y funciona en cualquier
// terminal (PowerShell, CMD, Git Bash, Linux, macOS).
//
// Para las contraseñas, la salida pasa por "salidaConsola": mientras
// "ocultarEscritura" vale true, lo que el usuario escribe no se muestra.
let ocultarEscritura = false;

const salidaConsola = new Writable({
    write(texto, _codificacion, terminar) {
        if (!ocultarEscritura) {
            process.stdout.write(texto);
        }
        terminar();
    },
});

const consola = readline.createInterface({
    input: process.stdin,
    output: salidaConsola,
    terminal: Boolean(process.stdin.isTTY),
});

let instalacionTerminada = false;

// Ctrl + C: cancelar sin modificar nada
consola.on('SIGINT', () => {
    console.log('\n\n  Instalación cancelada por el usuario. No se modificó nada.\n');
    process.exit(130);
});

// Si la entrada se cierra antes de terminar (por ejemplo Ctrl + D), también se cancela
consola.on('close', () => {
    if (!instalacionTerminada) {
        console.log('\n\n  Instalación cancelada. No se modificó nada.\n');
        process.exit(1);
    }
});

interface Configuracion {
    PORT: string;
    AUTH_USER: string;
    AUTH_PASS: string;
    DB_HOST: string;
    DB_PORT: string;
    DB_USER: string;
    DB_PASSWORD: string;
    DB_NAME: string;
    CORS_ORIGIN: string;
}

// -----------------------------------------------------------------------------
// Funciones de apoyo para la consola
// -----------------------------------------------------------------------------
const titulo = (texto: string): void => {
    console.log(`\n=== ${texto} ===\n`);
};

const exito = (texto: string): void => console.log(`  ✔ ${texto}`);
const aviso = (texto: string): void => console.log(`  ⚠ ${texto}`);
const fallo = (texto: string): void => console.log(`  ✖ ${texto}`);

/** Lee una línea. Si "oculto" es true, no se muestra lo que se escribe (contraseñas). */
async function leerLinea(pregunta: string, oculto: boolean): Promise<string> {
    if (!oculto) {
        return consola.question(pregunta);
    }

    process.stdout.write(pregunta);
    ocultarEscritura = true;
    try {
        return await consola.question('');
    } finally {
        ocultarEscritura = false;
        process.stdout.write('\n');
    }
}

/**
 * Hace una pregunta y repite hasta que la respuesta sea válida.
 * - porDefecto: valor que se usa si el usuario solo presiona Enter.
 * - validar: devuelve un mensaje de error, o null si la respuesta es correcta.
 * - oculto: no muestra lo que se escribe (para contraseñas).
 */
async function preguntar(
    texto: string,
    porDefecto: string,
    validar: (valor: string) => string | null,
    oculto: boolean = false
): Promise<string> {
    while (true) {
        let pista = '';
        if (oculto) {
            pista = porDefecto ? ' (oculta, Enter = conservar la actual)' : ' (no se mostrará al escribir)';
        } else if (porDefecto) {
            pista = ` [${porDefecto}]`;
        }

        const respuesta = (await leerLinea(`  ${texto}${pista}: `, oculto)).trim();
        const valor = respuesta === '' ? porDefecto : respuesta;
        const error = validar(valor);

        if (error === null) {
            return valor;
        }
        fallo(error);
    }
}

/** Pregunta de sí / no. Devuelve true si la respuesta es "s". */
async function confirmar(texto: string, porDefecto: boolean = true): Promise<boolean> {
    const opciones = porDefecto ? 'S/n' : 's/N';
    const respuesta = (await consola.question(`  ${texto} (${opciones}): `)).trim().toLowerCase();

    if (respuesta === '') return porDefecto;
    return respuesta === 's' || respuesta === 'si' || respuesta === 'sí';
}

// -----------------------------------------------------------------------------
// Validaciones
// -----------------------------------------------------------------------------
const obligatorio = (nombre: string) => (valor: string): string | null =>
    valor.length > 0 ? null : `${nombre} es obligatorio.`;

const validarPuerto = (valor: string): string | null => {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero >= 1 && numero <= 65535
        ? null
        : 'El puerto debe ser un número entero entre 1 y 65535.';
};

const validarNombreBaseDatos = (valor: string): string | null =>
    /^[a-zA-Z0-9_]+$/.test(valor)
        ? null
        : 'El nombre solo puede tener letras, números y guion bajo (_).';

// Basic Auth separa usuario y contraseña con ":", por eso no se permite ese carácter.
const validarUsuarioOperador = (valor: string): string | null => {
    if (valor.length === 0) return 'El usuario es obligatorio.';
    if (valor.includes(':')) return 'El usuario no puede contener el carácter ":".';
    return null;
};

const validarClaveOperador = (valor: string): string | null => {
    if (valor.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
    if (valor.includes(':')) return 'La contraseña no puede contener el carácter ":".';
    if (valor === 'admin123') return 'No uses la contraseña de ejemplo "admin123".';
    return null;
};

// El origen de CORS debe ser exacto: protocolo + dominio (+ puerto), sin "/" al final.
const validarOrigenCors = (valor: string): string | null => {
    if (valor === '') return null; // Es opcional
    return /^https?:\/\/[^\s/]+$/.test(valor)
        ? null
        : 'Formato inválido. Ejemplo correcto: https://parqueo.editorialsol.com (sin "/" al final).';
};

// -----------------------------------------------------------------------------
// Paso 1: preguntar la configuración
// -----------------------------------------------------------------------------
function leerEnvActual(): Partial<Configuracion> {
    if (!fs.existsSync(rutaEnv)) {
        return {};
    }
    console.log('  Se encontró un archivo .env: sus valores se usarán como respuesta por defecto.');
    return dotenv.parse(fs.readFileSync(rutaEnv, 'utf8')) as Partial<Configuracion>;
}

async function pedirConfiguracion(): Promise<Configuracion> {
    const actual = leerEnvActual();

    titulo('Paso 1 de 4 · Servidor');
    const PORT = await preguntar('Puerto del backend', actual.PORT || '3000', validarPuerto);

    titulo('Paso 1 de 4 · Conexión a MySQL');
    const DB_HOST = await preguntar('Servidor (host)', actual.DB_HOST || 'localhost', obligatorio('El servidor'));
    const DB_PORT = await preguntar('Puerto', actual.DB_PORT || '3306', validarPuerto);
    const DB_USER = await preguntar('Usuario', actual.DB_USER || 'root', obligatorio('El usuario'));
    const DB_PASSWORD = await preguntar('Contraseña', actual.DB_PASSWORD || '', () => null, true);
    const DB_NAME = await preguntar('Nombre de la base de datos', actual.DB_NAME || 'control_parqueo_sol', validarNombreBaseDatos);

    titulo('Paso 1 de 4 · Credenciales de los operadores (Basic Auth)');
    const AUTH_USER = await preguntar('Usuario de los operadores', actual.AUTH_USER || '', validarUsuarioOperador);
    const AUTH_PASS = await preguntar('Contraseña de los operadores', actual.AUTH_PASS || '', validarClaveOperador, true);

    titulo('Paso 1 de 4 · CORS (producción)');
    console.log('  Dominio desde donde se abrirá el sistema en producción.');
    console.log('  Déjalo vacío si solo trabajarás en tu computadora (localhost:4200 ya está permitido).\n');
    const CORS_ORIGIN = await preguntar('Dominio de producción', actual.CORS_ORIGIN || '', validarOrigenCors);

    return { PORT, AUTH_USER, AUTH_PASS, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, CORS_ORIGIN };
}

function mostrarResumen(config: Configuracion): void {
    titulo('Resumen');
    console.log(`  Puerto del backend   : ${config.PORT}`);
    console.log(`  MySQL                : ${config.DB_USER}@${config.DB_HOST}:${config.DB_PORT}`);
    console.log(`  Contraseña de MySQL  : ${config.DB_PASSWORD ? '********' : '(vacía)'}`);
    console.log(`  Base de datos        : ${config.DB_NAME}`);
    console.log(`  Usuario operadores   : ${config.AUTH_USER}`);
    console.log(`  Contraseña operadores: ********`);
    console.log(`  Dominio producción   : ${config.CORS_ORIGIN || '(ninguno)'}`);
    console.log('');
}

// -----------------------------------------------------------------------------
// Pasos 2 y 3: conectar a MySQL y crear la base de datos
// -----------------------------------------------------------------------------

/** Traduce los errores más comunes de MySQL a un mensaje fácil de entender. */
function explicarErrorMysql(error: any, config: Configuracion): string {
    switch (error?.code) {
        case 'ECONNREFUSED':
            return `No hay un servidor MySQL escuchando en ${config.DB_HOST}:${config.DB_PORT}. Verifica que el servicio de MySQL esté encendido.`;
        case 'ENOTFOUND':
            return `No se encontró el servidor "${config.DB_HOST}". Revisa que el nombre del host esté bien escrito.`;
        case 'ETIMEDOUT':
            return `MySQL no respondió a tiempo en ${config.DB_HOST}:${config.DB_PORT}. Revisa la red o el firewall.`;
        case 'ER_ACCESS_DENIED_ERROR':
            return 'MySQL rechazó el usuario o la contraseña. Verifica tus credenciales.';
        case 'ER_DBACCESS_DENIED_ERROR':
        case 'ER_SPECIFIC_ACCESS_DENIED_ERROR':
            return `El usuario "${config.DB_USER}" no tiene permisos para crear la base de datos. Usa un usuario con más privilegios (por ejemplo root).`;
        default:
            return error?.message || String(error);
    }
}

/**
 * Lee script.sql y lo divide en sentencias individuales.
 * Se omiten los comentarios (--) y las líneas CREATE DATABASE / USE,
 * porque el asistente crea la base con el nombre que eligió el usuario.
 */
function leerSentenciasSql(): string[] {
    if (!fs.existsSync(rutaScriptSql)) {
        throw new Error(`No se encontró el archivo ${rutaScriptSql}`);
    }

    return fs.readFileSync(rutaScriptSql, 'utf8')
        .split(/\r?\n/)
        .filter((linea) => !linea.trim().startsWith('--'))
        .join('\n')
        .split(';')
        .map((sentencia) => sentencia.trim())
        .filter((sentencia) => sentencia.length > 0)
        .filter((sentencia) => !/^(CREATE\s+DATABASE|USE)\b/i.test(sentencia));
}

async function prepararBaseDeDatos(config: Configuracion): Promise<void> {
    titulo('Paso 2 de 4 · Probando la conexión a MySQL');

    // Primero se conecta SIN base de datos, porque puede que todavía no exista
    const conexion = await mysql.createConnection({
        host: config.DB_HOST,
        port: Number(config.DB_PORT),
        user: config.DB_USER,
        password: config.DB_PASSWORD,
        connectTimeout: 10000,
    });

    try {
        const [filas] = await conexion.query<mysql.RowDataPacket[]>('SELECT VERSION() AS version');
        exito(`Conexión exitosa (MySQL ${filas[0]?.version}).`);

        titulo('Paso 3 de 4 · Creando la base de datos y las tablas');

        await conexion.query(
            `CREATE DATABASE IF NOT EXISTS \`${config.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
        await conexion.changeUser({ database: config.DB_NAME });
        exito(`Base de datos "${config.DB_NAME}" lista.`);

        for (const sentencia of leerSentenciasSql()) {
            try {
                await conexion.query(sentencia);
            } catch (error: any) {
                // Si el setup ya se ejecutó antes, los índices ya existen: no es un error real.
                if (error.code === 'ER_DUP_KEYNAME') continue;
                throw error;
            }
        }

        // Verificar que se crearon todas las tablas
        const [tablas] = await conexion.query<mysql.RowDataPacket[]>(
            'SELECT TABLE_NAME AS nombre FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
            [config.DB_NAME]
        );
        const tablasExistentes = tablas.map((fila) => String(fila.nombre));

        for (const tabla of TABLAS_ESPERADAS) {
            if (!tablasExistentes.includes(tabla)) {
                throw new Error(`La tabla "${tabla}" no se pudo crear.`);
            }
            exito(`Tabla ${tabla}`);
        }

        // Mostrar el estado actual de la jornada guardado en la base de datos
        const [configJornada] = await conexion.query<mysql.RowDataPacket[]>(
            'SELECT fase, version FROM configuracion_jornada WHERE id = 1'
        );
        const [conteo] = await conexion.query<mysql.RowDataPacket[]>(
            'SELECT COUNT(*) AS total FROM registro_tickets'
        );
        exito(`Jornada en fase ${configJornada[0]?.fase} con ${conteo[0]?.total} ticket(s) activo(s).`);
    } finally {
        await conexion.end();
    }
}

// -----------------------------------------------------------------------------
// Paso 4: generar el archivo .env
// -----------------------------------------------------------------------------

/** Pone comillas a los valores con espacios o símbolos especiales (por ejemplo "#"). */
function formatearValorEnv(valor: string): string {
    if (/^[\w.\-@/+]*$/.test(valor)) return valor;
    if (!valor.includes("'")) return `'${valor}'`;
    return `"${valor}"`;
}

function guardarEnv(config: Configuracion): void {
    titulo('Paso 4 de 4 · Generando el archivo .env');

    const v = (clave: keyof Configuracion): string => `${clave}=${formatearValorEnv(config[clave])}`;

    const contenido = [
        '# Archivo generado por "pnpm run setup". NO subir al repositorio.',
        '',
        '# Backend',
        v('PORT'),
        '',
        '# Credenciales',
        v('AUTH_USER'),
        v('AUTH_PASS'),
        '',
        '# MySQL',
        v('DB_HOST'),
        v('DB_USER'),
        v('DB_PASSWORD'),
        v('DB_NAME'),
        v('DB_PORT'),
        '',
        '# CORS',
        v('CORS_ORIGIN'),
        '',
    ].join('\n');

    // Comprobación de seguridad: al volver a leer el contenido, cada valor debe ser idéntico
    const leido = dotenv.parse(contenido);
    for (const clave of Object.keys(config) as (keyof Configuracion)[]) {
        if ((leido[clave] ?? '') !== config[clave]) {
            throw new Error(`El valor de ${clave} tiene caracteres que no se pueden guardar en el .env. Elige otro valor.`);
        }
    }

    if (fs.existsSync(rutaEnv)) {
        fs.copyFileSync(rutaEnv, rutaEnvRespaldo);
        aviso('El .env anterior se respaldó como .env.bak');
    }

    fs.writeFileSync(rutaEnv, contenido, 'utf8');
    exito(`Archivo guardado en ${rutaEnv}`);
}

// -----------------------------------------------------------------------------
// Programa principal
// -----------------------------------------------------------------------------
async function main(): Promise<void> {
    console.log('\n==============================================================');
    console.log('  Control de Parqueo — Editorial Sol · Asistente de instalación');
    console.log('==============================================================');
    console.log('  Presiona Enter para aceptar el valor entre [corchetes].');
    console.log('  Presiona Ctrl + C en cualquier momento para cancelar.');

    const config = await pedirConfiguracion();
    mostrarResumen(config);

    const datosCorrectos = await confirmar('¿Los datos son correctos?');

    // Ya no se necesitan más respuestas: se cierra la lectura de la consola
    instalacionTerminada = true;
    consola.close();

    if (!datosCorrectos) {
        console.log('\n  Instalación cancelada. No se modificó nada.\n');
        return;
    }

    try {
        await prepararBaseDeDatos(config);
    } catch (error) {
        console.log('');
        fallo(explicarErrorMysql(error, config));
        console.log('\n  No se modificó el archivo .env. Corrige el problema y vuelve a ejecutar: pnpm run setup\n');
        process.exitCode = 1;
        return;
    }

    guardarEnv(config);

    titulo('¡Instalación completada!');
    console.log('  Siguientes pasos:');
    console.log('    1. Iniciar el backend : pnpm dev');
    console.log('    2. Iniciar el frontend: cd ../frontend && pnpm start');
    console.log('    3. Abrir el sistema   : http://localhost:4200');
    console.log(`       (usuario "${config.AUTH_USER}" y la contraseña que acabas de definir)\n`);
}

main().catch((error) => {
    fallo(`Error inesperado: ${error?.message || error}`);
    process.exitCode = 1;
});
