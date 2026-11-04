# Control de Parqueo (Editorial Sol) — Backend API

API REST que digitaliza los tickets físicos de un parqueo: calcula los cobros según las reglas del negocio, audita correcciones y anulaciones, genera el reporte Excel y cierra la jornada de forma transaccional. Está pensada para que **varios operadores trabajen a la vez** sobre los mismos datos.

> Documentación general del proyecto: [README de la raíz](../README.md) · Interfaz: [README del frontend](../frontend/README.md)

---

## Tabla de contenido

1. [Características](#1-características)
2. [Tecnologías y requisitos](#2-tecnologías-y-requisitos)
3. [Instalación y ejecución](#3-instalación-y-ejecución)
4. [Variables de entorno](#4-variables-de-entorno)
5. [Estructura del código](#5-estructura-del-código)
6. [Conceptos clave y flujo de la jornada](#6-conceptos-clave-y-flujo-de-la-jornada)
7. [Reglas de negocio](#7-reglas-de-negocio)
8. [API REST](#8-api-rest)
9. [Reporte Excel](#9-reporte-excel)
10. [Cierre de jornada y concurrencia](#10-cierre-de-jornada-y-concurrencia)
11. [Base de datos](#11-base-de-datos)
12. [Validaciones](#12-validaciones)
13. [Códigos HTTP y errores](#13-códigos-http-y-errores)
14. [Limitaciones y notas técnicas](#14-limitaciones-y-notas-técnicas)

---

## 1. Características

- Registro de tickets con **cálculo automático** del tiempo facturable y del importe.
- Tarifas diferenciadas para **carros y motos**, con recargos por **tarifa nocturna** y **ticket perdido**.
- Consulta de tickets activos con **totales de auditoría** y búsqueda por número.
- **Balance** de horarios (corrección de entrada/salida) con motivo obligatorio.
- **Anulación auditada**: el ticket se conserva en `auditoria_borrados`.
- **Reporte Excel** con tickets activos y eliminados.
- **Cierre transaccional** que archiva la jornada en un histórico permanente.
- Protección frente a **duplicados, ediciones y cierres concurrentes**.
- Autenticación **HTTP Basic Auth** con credenciales compartidas.

## 2. Tecnologías y requisitos

| Tecnología | Uso |
|---|---|
| Node.js | Entorno de ejecución (módulos ES) |
| Express 5 | Servidor y enrutamiento HTTP |
| TypeScript (modo `strict`) | Tipado estático |
| MySQL + `mysql2/promise` | Base de datos y pool de conexiones |
| ExcelJS | Generación del reporte `.xlsx` |
| dotenv | Variables de entorno |
| tsx | Ejecución en desarrollo con recarga |

**Requisitos:** Node.js 18 o superior (se recomienda una LTS reciente), pnpm y MySQL 8.0 o superior.

## 3. Instalación y ejecución

```bash
# 1. Instalar dependencias
pnpm install

# 2. Crear la base de datos (crea control_parqueo_sol y sus 3 tablas)
mysql -u <usuario> -p < src/script.sql

# 3. Configurar el entorno
cp .env.example .env     # y completar los valores (ver sección 4)

# 4. Ejecutar en desarrollo (recarga automática)
pnpm dev
```

Al iniciar, el servidor prueba la conexión a MySQL; si falla, termina con un error. Si todo va bien verás:

```text
Conexión a la base de datos establecida correctamente.
Servidor backend corriendo exitosamente en el puerto 3000
```

### Scripts disponibles

| Script | Comando real | Descripción |
|---|---|---|
| `pnpm dev` | `tsx watch src/index.ts` | Desarrollo con recarga automática |
| `pnpm build` | `tsc` | Compila a `dist/` |
| `pnpm start` | `node dist/index.js` | Ejecuta la versión compilada (producción) |
| `pnpm setup` | `tsx src/setup.ts` | Reservado: `src/setup.ts` está vacío actualmente |

### Probar que funciona

```bash
curl -u usuario:clave http://localhost:3000/sol/acceso/verificar
# {"success":true,"message":"Credenciales válidas. Acceso concedido."}
```

## 4. Variables de entorno

Crea un archivo `.env` en la raíz de `backend/` (hay una plantilla en `.env.example`):

```env
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=control_parqueo_sol

AUTH_USER=
AUTH_PASS=
```

| Variable | Descripción | Valor por defecto si falta |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `DB_HOST` | Host de MySQL | `localhost` |
| `DB_PORT` | Puerto de MySQL | `3306` |
| `DB_USER` | Usuario de MySQL | `root` |
| `DB_PASSWORD` | Contraseña de MySQL | *(vacía)* |
| `DB_NAME` | Nombre de la base de datos | `control_parqueo_sol` |
| `AUTH_USER` | Usuario compartido de Basic Auth | `admin` |
| `AUTH_PASS` | Contraseña compartida de Basic Auth | `admin123` |

> ⚠️ **Seguridad:** define siempre `AUTH_USER` y `AUTH_PASS`; los valores por defecto son públicos en el código. No subas `.env` al repositorio (ya está en `.gitignore`). Evita `:` en la contraseña: el middleware separa usuario y clave por ese carácter.

## 5. Estructura del código

```text
backend/
├── src/
│   ├── config/
│   │   ├── env.ts                  # Lectura de variables de entorno
│   │   └── db.ts                   # Pool de MySQL (zona horaria -06:00)
│   ├── controllers/                # req/res y códigos HTTP
│   │   ├── ticket.controller.ts
│   │   ├── tarifa.controller.ts
│   │   ├── jornada.controller.ts
│   │   ├── reporte.controller.ts
│   │   └── cierre.controller.ts
│   ├── dtos/                       # Tipado de entradas y salidas
│   ├── middlewares/
│   │   ├── auth.middleware.ts              # Basic Auth
│   │   ├── verificar-jornada.middleware.ts # 409 si la jornada ya fue cerrada
│   │   ├── not-found.middleware.ts         # 404 de rutas inexistentes
│   │   └── error.middleware.ts             # Manejador global de errores
│   ├── models/                     # Consultas SQL y transacciones
│   ├── routes/                     # Endpoints y control de métodos (405)
│   ├── services/                   # Lógica de negocio (tarifas, tickets, jornada, Excel, cierre)
│   ├── utils/                      # Validadores y formato de tiempo
│   ├── app.ts                      # Configuración de Express y montaje de rutas
│   ├── index.ts                    # Punto de entrada
│   ├── setup.ts                    # (vacío)
│   └── script.sql                  # Esquema de la base de datos
├── .env.example
├── package.json
└── tsconfig.json
```

| Capa | Responsabilidad |
|---|---|
| `routes` | Declarar endpoints y rechazar verbos no soportados con `405` |
| `controllers` | Validar la entrada, invocar servicios y traducir errores a códigos HTTP |
| `services` | Reglas del dominio: cálculo de tarifas, edición, anulación, Excel, cierre |
| `models` | SQL parametrizado y transacciones |
| `utils` | Validación y normalización de datos |
| `middlewares` | Autenticación, protección de jornada, errores |

## 6. Conceptos clave y flujo de la jornada

| Concepto | Descripción |
|---|---|
| **Fecha de operación** | Fecha del ticket físico. Puede ser anterior a hoy, nunca futura. |
| **Fecha de captura** | Fecha y hora en que se digitó el ticket (automática). |
| **Jornada activa** | Tickets presentes en `registro_tickets`, aún no archivados. |
| **Ticket activo / eliminado** | En el registro operativo / anulado y conservado en `auditoria_borrados`. |
| **Balance** | Corrección de la hora de entrada y/o salida de un ticket. |
| **Casos especiales** | Ticket perdido y tarifa nocturna. |
| **Cierre de jornada** | Archiva los tickets activos en el histórico y vacía el registro operativo. |

**Flujo:**

1. **Registro** de tickets → 2. **Finalizar registro** (pasa la jornada a fase `AUDITORIA`, sin borrar nada) → 3. **Auditoría** (editar o anular) → 4. **Generar Excel** → 5. El operador **verifica el archivo** → 6. **Cierre** (archivar y vaciar).

Generar o descargar el Excel **no** cierra la jornada.

## 7. Reglas de negocio

### 7.1. Horario y tiempo facturable

- Horario regular: **04:30 a 17:30**.
- El tiempo facturable se acumula **solo dentro de ese horario**. El periodo cerrado (17:30–04:30) no se cobra como tiempo adicional.
- Si el vehículo continúa dentro a las 17:30, se aplica la **tarifa nocturna**.
- Estancia hasta el día siguiente: se suma el tiempo facturable antes del cierre y después de la reapertura, más el recargo nocturno.
- No se permiten estancias de varios días; solo se captura una fecha y no se infiere una duración mayor a partir de dos horas.

### 7.2. Tarifas

| Vehículo | Tiempo | Importe |
|---|---|---:|
| Carro | Hasta 30 min | Q5 |
| Carro | De 31 min a 1 h | Q10 |
| Carro | Cada bloque de 30 min iniciado después de la primera hora | +Q5 |
| Moto | Hasta 1 h | Q5 |
| Moto | Cada bloque de 30 min iniciado después de la primera hora | +Q5 |

Las fracciones se **redondean hacia arriba** al intervalo aplicable.

| Tiempo facturable | Carro | Moto |
|---|---:|---:|
| 30 min | Q5 | Q5 |
| 31 min | Q10 | Q5 |
| 40 min | Q10 | Q5 |
| 1 h | Q10 | Q5 |
| 1 h 30 min | Q15 | Q10 |
| 1 h 31 min | Q20 | Q15 |

### 7.3. Recargos (acumulables)

| Caso | Recargo | Cuándo aplica |
|---|---:|---|
| Tarifa nocturna | Q150 | La casilla está marcada **o** la estancia cruza el cierre (salida ≤ entrada, salida > 17:30 o entrada ≥ 17:30) |
| Ticket perdido | Q25 | La casilla está marcada |

```text
Total = cobro por tiempo + Q150 (tarifa nocturna) + Q25 (ticket perdido)
```

**Ejemplos**

- Carro, entra 17:00 y sigue dentro al cierre: Q5 (30 min) + Q150 = **Q155**.
- Carro, entra 16:00 y sale 07:10 del día siguiente: tiempo 16:00–17:30 + Q150 + tiempo 04:30–07:10.

### 7.4. Balance (edición de horarios)

- Solo se pueden modificar **hora de entrada, hora de salida y motivo**.
- Debe cambiar al menos una hora (no se acepta el mismo horario).
- El backend recalcula minutos e importe y guarda el motivo en el ticket (solo se conserva el **motivo de la última edición**).
- Al recalcular, el indicador de **tarifa nocturna se vuelve a determinar** según el nuevo horario (ver [limitaciones](#14-limitaciones-y-notas-técnicas)).

### 7.5. Anulación

1. Se copia el ticket completo a `auditoria_borrados` junto con el motivo.
2. Solo si esa copia se guardó, se elimina de `registro_tickets` (todo en una transacción con bloqueo de fila).
3. El ticket deja de sumar en los totales y aparece en la hoja **Tickets Eliminados** del Excel.

### 7.6. Orden y búsqueda

- Orden: fecha de operación **descendente** y, a igual fecha, número de ticket **ascendente numérico**.
- La búsqueda por número es **parcial** (`LIKE %valor%`) y filtra solo la lista; los **totales** siempre se calculan sobre todos los tickets activos.

## 8. API REST

Todas las rutas `/sol/...` requieren `Authorization: Basic <base64(usuario:clave)>`. Los cuerpos son JSON y los verbos no soportados responden `405` con la cabecera `Allow`.

### 8.1. Resumen de endpoints

| Método | Endpoint | Descripción | Respuestas |
|---|---|---|---|
| `GET` | `/sol/acceso/verificar` | Valida las credenciales | `200`, `401` |
| `POST` | `/sol/tarifas/calcular` | Simula el cobro (no guarda nada) | `200`, `400` |
| `POST` | `/sol/tickets` | Registra un ticket | `201`, `400`, `409` |
| `GET` | `/sol/tickets/activos` | Lista tickets activos y totales (`?numero=`) | `200` |
| `GET` | `/sol/tickets/buscar/:numero` | Detalle por número físico | `200`, `400`, `404` |
| `PATCH` | `/sol/tickets/:id/balance` | Corrige horarios y recalcula | `200`, `400`, `404`, `409` |
| `DELETE` | `/sol/tickets/:id` | Anula el ticket con motivo | `200`, `400`, `404`, `409` |
| `GET` | `/sol/jornada/estado` | Estado de la jornada | `200` |
| `POST` | `/sol/jornada/finalizar-registro` | Pasa la jornada a fase `AUDITORIA` | `200` |
| `GET` | `/sol/reportes/excel` | Genera y descarga el Excel | `200` (binario), `500` |
| `POST` | `/sol/cierre/confirmar` | Archiva y vacía la jornada | `200`, `409`, `500` |
| `GET` | `/sol/cierre/historico` | Consulta el histórico (`?fecha=YYYY-MM-DD`) | `200` |

> `:id` es el identificador interno (`idRegistro`); `:numero` es el número impreso en el ticket. El histórico es de **solo lectura**.

### 8.2. Formato de las respuestas

Las rutas operativas responden con este formato:

```jsonc
// Éxito
{ "ok": true, "mensaje": "…", "data": { … } }

// Error
{ "ok": false, "mensaje": "…", "codigo": "JORNADA_CERRADA" }   // "codigo" solo en algunos conflictos
```

`/sol/acceso/verificar` y el middleware de autenticación usan `{ "success": …, "message": … }`.

### 8.3. Ejemplos

**Calcular tarifa** — `POST /sol/tarifas/calcular`

```json
{
  "horaEntrada": "12:00",
  "horaSalida": "13:30",
  "tipoVehiculo": "CARRO",
  "aplicaTarifaNoche": false,
  "esTicketPerdido": false
}
```

```json
{
  "ok": true,
  "data": {
    "minutosEstacionado": 90,
    "costo": 15,
    "desglose": {
      "minutosTotales": 90,
      "minutosFacturables": 90,
      "costoBase": 15,
      "recargoNoche": 0,
      "recargoPerdido": 0
    }
  }
}
```

**Registrar ticket** — `POST /sol/tickets`

```json
{
  "fechaOperacion": "2026-11-04",
  "numeroTicket": "160455",
  "tipoVehiculo": "CARRO",
  "horaEntrada": "12:00",
  "horaSalida": "13:30",
  "aplicaTarifaNoche": false,
  "esTicketPerdido": false
}
```

Respuesta `201`: `data` contiene el ticket creado:

```json
{
  "idRegistro": 1,
  "fechaOperacion": "2026-11-04",
  "numeroTicket": "160455",
  "tipoVehiculo": "CARRO",
  "horaEntrada": "12:00:00",
  "horaSalida": "13:30:00",
  "minutosEstacionado": 90,
  "tiempoLegible": "1 hr 30 min",
  "costo": 15,
  "esTicketPerdido": false,
  "aplicaTarifaNoche": false,
  "motivoEdicion": null,
  "fechaCaptura": "2026-11-04T18:20:11.000Z"
}
```

**Listar tickets activos** — `GET /sol/tickets/activos?numero=1604`

```json
{
  "ok": true,
  "data": {
    "resumen": {
      "totalTickets": 42,
      "totalCarros": 30,
      "totalMotos": 12,
      "totalPerdidos": 2,
      "totalRecaudado": 1385
    },
    "tickets": [ { "idRegistro": 1, "numeroTicket": "160455", "…": "…" } ]
  }
}
```

`resumen` siempre refleja **todos** los tickets activos; `tickets` está filtrado por `?numero=`.

**Corregir horario** — `PATCH /sol/tickets/:id/balance`

```json
{
  "horaEntrada": "12:00",
  "horaSalida": "13:45",
  "motivoEdicion": "Correccion por digitacion erronea en la hora de salida"
}
```

**Anular ticket** — `DELETE /sol/tickets/:id`

```json
{ "motivoEliminacion": "Numero de ticket digitado incorrectamente" }
```

**Estado de la jornada** — `GET /sol/jornada/estado`

```json
{
  "ok": true,
  "data": {
    "activa": true,
    "totalTicketsActivos": 42,
    "fechaOperacionActual": "2026-11-04",
    "fase": "REGISTRO",
    "totalRecaudado": 1385,
    "totalEditados": 3,
    "version": 17,
    "mensaje": "Jornada activa en captura."
  }
}
```

- `fase`: `REGISTRO` o `AUDITORIA`.
- `version`: contador que aumenta con cada cambio (registro, edición, anulación, cambio de fase, cierre). Permite a los clientes detectar cambios de otros operadores.
- `fechaOperacionActual`: la fecha de operación **más reciente** entre los tickets activos (`null` si no hay).

**Confirmar cierre** — `POST /sol/cierre/confirmar` (sin cuerpo)

```json
{
  "ok": true,
  "mensaje": "Cierre de jornada completado.",
  "data": {
    "fechaCierre": "2026-11-04T22:05:00.000Z",
    "totalTicketsArchivados": 42,
    "totalRecaudado": 1385,
    "mensaje": "Jornada cerrada exitosamente. …"
  }
}
```

**Descargar Excel**

```bash
curl -u usuario:clave -OJ http://localhost:3000/sol/reportes/excel
```

## 9. Reporte Excel

`GET /sol/reportes/excel` devuelve un archivo binario `.xlsx` con las cabeceras `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` y `Content-Disposition: attachment; filename="…"`.

**Nombre del archivo:** `Reporte_Parqueo_DD_MM_YYYY.xlsx`. La fecha es la fecha de operación **más reciente de los tickets activos** (o la fecha actual si no hay tickets).

| Hoja | Contenido | Columnas |
|---|---|---|
| **Tickets Registrados** | Tickets activos | No. Ticket, Fecha Operación, Vehículo, Hora Entrada, Hora Salida, Tiempo Estacionado, Minutos, Tarifa Noche, Ticket Perdido, Cobro Total (Q), Estado Edición, Motivo Edición, Fecha Captura Digital |
| **Tickets Eliminados** | Tickets anulados de esa fecha de operación | No. Ticket, Fecha Operación, Vehículo, Hora Entrada, Hora Salida, Tiempo Estacionado, Minutos, Cobro Original (Q), Motivo Anulación, Captura Original, Fecha Anulación |

Notas:

- Los encabezados tienen color (gris azulado oscuro en la hoja de activos, rojo oscuro en la de eliminados).
- Los importes se escriben como texto con formato `Q 15.00`; las fechas de captura y anulación usan el formato regional `es-GT`.
- Generar el reporte **no modifica** ningún dato.
- El estado “Archivo emitido” solo significa que el servidor produjo el archivo; el operador debe comprobar manualmente que se guardó y se abre.

## 10. Cierre de jornada y concurrencia

### 10.1. Cierre seguro (`POST /sol/cierre/confirmar`)

Se ejecuta en **una sola transacción**:

1. `SELECT * FROM registro_tickets FOR UPDATE` (bloquea los registros).
2. Si no hay tickets → `409 JORNADA_YA_CERRADA` (otro operador ya cerró).
3. `INSERT … SELECT` hacia `auditoria_tickets_registrados`.
4. Verifica que las filas copiadas coincidan con las activas; si no, `ROLLBACK` (`FALLO_RESPALDO_HISTORICO`).
5. `DELETE FROM registro_tickets`.
6. `COMMIT` y la fase vuelve a `REGISTRO`.

Si algo falla, no se borra ningún ticket activo. Repetir la confirmación no duplica el histórico.

### 10.2. Registro duplicado

`numero_ticket` tiene restricción `UNIQUE` en `registro_tickets`. Antes de insertar se comprueba si existe (`409`), y el índice único protege el caso de dos operadores guardando el mismo número a la vez.

### 10.3. Ediciones y anulaciones concurrentes

`PATCH /:id/balance` y `DELETE /:id` pasan por `verificarJornadaActivaMiddleware`: si ya no hay tickets activos responden `409` con `codigo: "JORNADA_CERRADA"` y el mensaje *“El sistema fue reiniciado para una nueva jornada por otro operador.”* La anulación además bloquea la fila (`FOR UPDATE`); si el ticket ya no existe, responde `404`.

## 11. Base de datos

Base `control_parqueo_sol`, motor InnoDB, `utf8mb4` / `utf8mb4_unicode_ci`. El script está en [`src/script.sql`](src/script.sql).

El sistema maneja los tickets mediante dos tablas principales, dependiendo de su estado:

- **`registro_tickets`:** almacena los tickets de la jornada activa. Cuando un operador anula un ticket, este se traslada a la tabla `auditoria_borrados`, junto con el motivo de la anulación.

- **`auditoria_tickets_registrados`:** almacena los tickets de las jornadas que han sido cerradas y confirmadas. Esta tabla funciona como histórico permanente de los tickets registrados.

De esta manera, el sistema conserva tanto los tickets anulados como los tickets de las jornadas finalizadas, permitiendo mantener un registro de las operaciones realizadas.

### `registro_tickets` — registro operativo (se vacía al cerrar)

| Campo | Tipo | Descripción |
|---|---|---|
| `id_registro` | `INT` PK autoincremental | Identificador interno |
| `fecha_operacion` | `DATE` | Fecha del ticket físico |
| `numero_ticket` | `VARCHAR(20)` **UNIQUE** | Número del talonario |
| `tipo_vehiculo` | `ENUM('CARRO','MOTO')` | Tipo de vehículo |
| `hora_entrada`, `hora_salida` | `TIME` | Horas del ticket |
| `minutos_estacionado` | `INT` *(columna generada, STORED)* | Duración; contempla salida pasada la medianoche |
| `costo` | `INT` | Importe en quetzales enteros (lo calcula el backend) |
| `es_ticket_perdido` | `BOOLEAN` | Ticket perdido |
| `aplica_tarifa_noche` | `BOOLEAN` | Tarifa nocturna |
| `motivo_edicion` | `TEXT NULL` | Motivo de la última edición |
| `fecha_captura` | `TIMESTAMP` | Fecha/hora de digitación |

Índices: `idx_tickets_fecha_operacion`, `idx_tickets_numero`.

### `auditoria_borrados` — tickets anulados

Copia fiel del ticket (`id_registro_original`, fecha, número, vehículo, horas, minutos, costo, indicadores) más `motivo_eliminacion` (obligatorio), `fecha_captura_original` y `fecha_eliminacion`. Índice: `idx_borrados_fecha_operacion`.

### `auditoria_tickets_registrados` — histórico permanente

Copia de los tickets activos al cerrar (`id_historico`, `id_registro_original`, datos del ticket, `motivo_edicion`, `fecha_captura`) más `fecha_cierre_sistema`. Índices: `idx_historico_fecha_operacion`, `idx_historico_numero`.

### Consideraciones del modelo

- La unicidad de `numero_ticket` existe solo en la tabla operativa: un mismo número puede repetirse en jornadas distintas dentro del histórico.
- No existe una tabla de jornadas, de historial de ediciones ni de exportaciones. Del historial solo se conserva el motivo de la **última** edición.
- La zona horaria del pool de MySQL está fijada en `-06:00` (Guatemala).

## 12. Validaciones

| Campo | Regla |
|---|---|
| `numeroTicket` | Obligatorio, solo dígitos, máximo 20 (se conserva como texto) |
| `tipoVehiculo` | `CARRO` o `MOTO` (no distingue mayúsculas) |
| `horaEntrada`, `horaSalida` | Formato 24 h `HH:mm` o `HH:mm:ss` (se normaliza a `HH:mm`); no pueden ser iguales |
| `fechaOperacion` | `YYYY-MM-DD` o `DD/MM/YYYY`, fecha real de calendario, no futura |
| `aplicaTarifaNoche`, `esTicketPerdido` | Booleanos; si no vienen, se toman como `false` |
| `motivoEdicion`, `motivoEliminacion` | Obligatorios, entre **4 y 255** caracteres |

**Caracteres permitidos en los motivos:** letras (incluye `á é í ó ú ñ ü`), números, espacios y `. , ; : ( ) # - _ /`. Se rechazan emojis, caracteres de control y otros símbolos (por ejemplo `¿ ? ¡ ! % @ + & " '`).

El importe **nunca** se toma del cliente: se calcula siempre en el backend. Todas las consultas usan parámetros (`?`) y el texto del usuario se trata siempre como dato.

## 13. Códigos HTTP y errores

| Código | Significado | Dónde ocurre |
|---|---|---|
| `200` | Operación correcta | Consultas, balance, anulación, reporte, cierre |
| `201` | Creado | Registro de ticket |
| `400` | Datos inválidos | Validaciones, horarios, motivos, ID inválido |
| `401` | Credenciales ausentes o incorrectas | Cualquier ruta `/sol/*` (incluye `WWW-Authenticate`) |
| `404` | No encontrado | Ticket inexistente o ruta inexistente |
| `405` | Método no permitido | Verbo no soportado (incluye `Allow`) |
| `409` | Conflicto | Número duplicado, jornada cerrada o cierre repetido |
| `500` | Error interno | Fallos inesperados (reporte, cierre, consultas) |

**Códigos de conflicto identificables (`codigo`):**

| `codigo` | Cuándo |
|---|---|
| `JORNADA_CERRADA` | `PATCH`/`DELETE` sobre una jornada que ya no tiene tickets activos |
| `JORNADA_YA_CERRADA` | `POST /sol/cierre/confirmar` cuando otro operador ya cerró |
| `ERROR_CIERRE` | Fallo inesperado durante el cierre (`500`) |

## 14. Notas técnicas

Observaciones basadas en el código actual:

1. **El balance recalcula la tarifa nocturna** según el nuevo horario, por lo que puede reemplazar el indicador que se marcó manualmente al registrar. El indicador de ticket perdido sí se conserva.
2. **`auditoria_borrados` no se vacía al cerrar la jornada.** El Excel solo incluye los eliminados cuya fecha de operación coincide con la fecha de referencia del reporte.
3. **El nombre del Excel** usa la fecha de operación más reciente de los tickets activos, no una fecha fija guardada al iniciar la jornada.