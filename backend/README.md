# Control de Parqueo (Editorial Sol) — Backend API

API REST que contiene **toda la lógica del negocio** del parqueo: calcula los cobros, valida los datos, registra las correcciones y anulaciones, genera el reporte Excel y cierra la jornada de forma segura. Está preparada para que **varios operadores trabajen al mismo tiempo** sobre los mismos datos.

> Documentación general: [README de la raíz](../README.md) · Interfaz de usuario: [README del frontend](../frontend/README.md)

---

## Tabla de contenido

1. [Tecnologías](#1-tecnologías)
2. [Instalación y ejecución](#2-instalación-y-ejecución)
3. [Variables de entorno](#3-variables-de-entorno)
4. [Estructura del código](#4-estructura-del-código)
5. [Reglas de negocio](#5-reglas-de-negocio)
6. [Base de datos](#6-base-de-datos)
7. [Endpoints REST](#7-endpoints-rest)
8. [Cierre transaccional seguro](#8-cierre-transaccional-seguro)
9. [Seguridad](#9-seguridad)
10. [Validaciones](#10-validaciones)
11. [Códigos de respuesta HTTP](#11-códigos-de-respuesta-http)

---

## 1. Tecnologías

| Tecnología | Uso |
|---|---|
| **Node.js** | Entorno que ejecuta JavaScript/TypeScript en el servidor |
| **Express 5** | Framework para crear el servidor y las rutas de la API |
| **TypeScript** (modo `strict`) | Agrega tipos al código para detectar errores antes de ejecutarlo |
| **MySQL 8** + `mysql2/promise` | Base de datos y conexión desde Node.js |
| **ExcelJS** | Creación del reporte `.xlsx` |
| **cors** | Control de qué dominios pueden consumir la API |
| **dotenv** | Lectura de las variables del archivo `.env` |
| **tsx** | Ejecución en modo desarrollo con recarga automática |

## 2. Instalación y ejecución

```bash
# 1. Instalar dependencias
pnpm install

# 2. Crear la base de datos (4 tablas + configuración inicial)
mysql -u <usuario> -p < src/script.sql

# 3. Crear el archivo de configuración y completarlo (ver sección 3)
cp .env.example .env

# 4. Iniciar en modo desarrollo
pnpm dev
```

Al iniciar, el servidor primero comprueba la conexión con MySQL. Si todo está correcto, verás:

```text
Conexión a la base de datos establecida correctamente.
Servidor backend corriendo exitosamente en el puerto 3000
```

### Scripts disponibles

| Script | Comando | Descripción |
|---|---|---|
| `pnpm dev` | `tsx watch src/index.ts` | Desarrollo con recarga automática al guardar cambios |
| `pnpm build` | `tsc` | Compila el proyecto a JavaScript en la carpeta `dist/` |
| `pnpm start` | `node dist/index.js` | Ejecuta la versión compilada (producción) |

### Prueba rápida

```bash
curl -u usuario:clave http://localhost:3000/sol/acceso/verificar
# {"success":true,"message":"Credenciales válidas. Acceso concedido."}
```

## 3. Variables de entorno

Crea un archivo `.env` dentro de `backend/` a partir de la plantilla `.env.example`:

```env
# Servidor
PORT=3000

# Credenciales de los operadores
AUTH_USER=
AUTH_PASS=

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=control_parqueo_sol

# CORS (dominio de producción autorizado)
CORS_ORIGIN=https://parqueo.editorialsol.com
```

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `DB_HOST` | Servidor de MySQL | `localhost` |
| `DB_PORT` | Puerto de MySQL | `3306` |
| `DB_USER` | Usuario de MySQL | `root` |
| `DB_PASSWORD` | Contraseña de MySQL | *(vacía)* |
| `DB_NAME` | Nombre de la base de datos | `control_parqueo_sol` |
| `AUTH_USER` | Usuario compartido de Basic Auth | — *(debe definirse)* |
| `AUTH_PASS` | Contraseña compartida de Basic Auth | — *(debe definirse)* |
| `CORS_ORIGIN` | Dominio adicional permitido por CORS | — |

> 🔐 El archivo `.env` contiene contraseñas: **nunca** debe subirse al repositorio (ya está en `.gitignore`). Evita usar el carácter `:` en la contraseña, porque Basic Auth lo usa para separar usuario y clave.

## 4. Estructura del código

El backend sigue una **arquitectura por capas**: cada carpeta tiene una sola responsabilidad, lo que hace el código más ordenado y fácil de mantener.

```text
backend/
├── src/
│   ├── config/
│   │   ├── env.ts                  # Lectura de variables de entorno
│   │   └── db.ts                   # Conexión (pool) a MySQL, zona horaria -06:00
│   ├── controllers/                # Reciben la petición y devuelven la respuesta HTTP
│   ├── dtos/                       # Forma (tipos) de los datos que entran y salen
│   ├── middlewares/
│   │   ├── auth.middleware.ts              # Verifica usuario y contraseña
│   │   ├── verificar-jornada.middleware.ts # Bloquea cambios si la jornada ya se cerró
│   │   ├── not-found.middleware.ts         # Respuesta 404 para rutas inexistentes
│   │   └── error.middleware.ts             # Manejo central de errores
│   ├── models/                     # Consultas SQL y transacciones
│   ├── routes/                     # Definición de los endpoints
│   ├── services/                   # Reglas de negocio (tarifas, tickets, jornada, Excel, cierre)
│   ├── utils/                      # Validadores y funciones de apoyo
│   ├── app.ts                      # Configuración de Express, CORS y rutas
│   ├── index.ts                    # Punto de entrada del servidor
│   └── script.sql                  # Script de creación de la base de datos
├── .env.example
├── package.json
└── tsconfig.json
```

**Recorrido de una petición:**

```text
Petición HTTP → routes → middlewares → controllers → services → models → MySQL
```

| Capa | Responsabilidad |
|---|---|
| `routes` | Declarar las rutas y rechazar métodos no permitidos (`405`) |
| `middlewares` | Autenticación, protección de la jornada y manejo de errores |
| `controllers` | Validar la entrada y traducir el resultado a un código HTTP |
| `services` | Aplicar las reglas del negocio |
| `models` | Ejecutar las consultas SQL en la base de datos |

## 5. Reglas de negocio

### 5.1. Conceptos básicos

| Concepto | Significado |
|---|---|
| **Fecha de operación** | Fecha escrita en el ticket físico. Puede ser anterior a hoy, pero nunca futura. |
| **Fecha de captura** | Fecha y hora en que el operador digitó el ticket (se guarda sola). |
| **Jornada activa** | Conjunto de tickets que aún no se han archivado. |
| **Fase de la jornada** | `REGISTRO` (captura de tickets) o `AUDITORIA` (revisión). Se guarda en la base de datos. |
| **Balance** | Corrección de la hora de entrada y/o salida de un ticket. |
| **Anulación** | Eliminación de un ticket con motivo; se conserva una copia para auditoría. |

### 5.2. Cálculo del tiempo cobrable

- El horario de atención del parqueo es de **04:30 a 17:30**.
- Solo se cobra el tiempo que el vehículo estuvo **dentro de ese horario**. El periodo en que el parqueo está cerrado (17:30 a 04:30) no se suma como tiempo cobrable.
- Si la hora de salida es menor que la de entrada, el sistema entiende que el vehículo **pasó la noche** y salió al día siguiente.

**Ejemplo de una estancia que cruza la noche:**

```text
Entrada 16:00  →  Salida 07:10 (día siguiente)

Tiempo cobrable = (16:00 a 17:30) + (04:30 a 07:10)
                =     90 min      +     160 min      = 250 min
```

### 5.3. Tarifas por tipo de vehículo

| Vehículo | Tiempo cobrable | Importe |
|---|---|---:|
| **Carro** | Hasta 30 minutos | Q5 |
| **Carro** | De 31 minutos a 1 hora | Q10 |
| **Carro** | Cada bloque de 30 minutos (o fracción) después de la primera hora | +Q5 |
| **Moto** | Hasta 1 hora | Q5 |
| **Moto** | Cada bloque de 30 minutos (o fracción) después de la primera hora | +Q5 |

Las fracciones **se redondean hacia arriba**: si un bloque de 30 minutos ya empezó, se cobra completo.

| Tiempo cobrable | Carro | Moto |
|---|---:|---:|
| 30 min | Q5 | Q5 |
| 31 min | Q10 | Q5 |
| 1 h | Q10 | Q5 |
| 1 h 30 min | Q15 | Q10 |
| 1 h 31 min | Q20 | Q15 |
| 2 h | Q20 | Q15 |

### 5.4. Tarifa nocturna (recargo de Q150)

Se cobra un recargo fijo de **Q150** cuando ocurre cualquiera de estos casos:

- El operador marca la casilla **“Aplica tarifa noche”**.
- La hora de salida es **mayor a las 17:30** (el vehículo seguía dentro al cerrar).
- La hora de entrada es **igual o mayor a las 17:30**.
- La hora de salida es **menor o igual** a la de entrada (el vehículo pasó la noche).

### 5.5. Ticket perdido (recargo de Q25)

Si el cliente perdió su ticket, el operador marca la casilla **“Ticket perdido”** y se suma un recargo fijo de **Q25**.

### 5.6. Fórmula final

Los recargos **se acumulan** entre sí:

```text
Total = cobro por tiempo + Q150 (si aplica tarifa nocturna) + Q25 (si es ticket perdido)
```

**Ejemplos:**

| Caso | Cálculo | Total |
|---|---|---:|
| Carro de 12:00 a 13:30 | 90 min → Q15 | **Q15** |
| Carro que entra 17:00 y sigue dentro al cierre | 30 min (Q5) + noche (Q150) | **Q155** |
| Moto de 08:00 a 08:45 con ticket perdido | 45 min (Q5) + perdido (Q25) | **Q30** |

> El importe **siempre lo calcula el backend**. Aunque el frontend muestre una vista previa, nunca se acepta un monto enviado por el cliente.

### 5.7. Corrección de horario (balance)

- Solo se pueden cambiar la **hora de entrada**, la **hora de salida** y el **motivo**.
- Debe cambiar al menos una de las dos horas.
- El backend **recalcula** el tiempo, la tarifa nocturna y el importe con el nuevo horario. El recargo por ticket perdido se mantiene.
- El motivo de la corrección queda guardado en el ticket.

### 5.8. Anulación de tickets

1. Se copia el ticket completo a la tabla `auditoria_borrados`, junto con el motivo.
2. Solo si esa copia se guardó correctamente, se elimina de la jornada activa.
3. El ticket deja de sumar en los totales y aparece en la hoja **Tickets Eliminados** del Excel.

Todo esto ocurre dentro de una **transacción** (ver [sección 8](#8-cierre-transaccional-seguro)), por lo que nunca queda un ticket “a medio borrar”.

## 6. Base de datos

Base de datos `control_parqueo_sol`, motor **InnoDB** y codificación `utf8mb4` (admite tildes y la letra ñ). El script de creación está en [`src/script.sql`](src/script.sql).

### 6.1. Vista general

El sistema separa claramente los datos **del día** (registro operativo) de los datos **permanentes** (histórico):

| Tabla | Tipo | Contenido | ¿Se vacía al cerrar? |
|---|---|---|---|
| `registro_tickets` | **Operativa** | Tickets de la jornada actual | ✅ Sí |
| `auditoria_borrados` | Permanente | Tickets anulados con su motivo | ❌ No |
| `auditoria_tickets_registrados` | **Histórico permanente** | Tickets de todas las jornadas cerradas | ❌ No |
| `configuracion_jornada` | Configuración | Fase actual de la jornada y contador de cambios | ❌ No (se actualiza) |

```text
                 Anular ticket
registro_tickets ──────────────► auditoria_borrados
      │
      │ Cierre de jornada (copia + vaciado)
      ▼
auditoria_tickets_registrados

configuracion_jornada  →  fase (REGISTRO / AUDITORIA) + version
```

### 6.2. `registro_tickets` — registro operativo

| Campo | Tipo | Descripción |
|---|---|---|
| `id_registro` | `INT` PK, autoincremental | Identificador interno |
| `fecha_operacion` | `DATE` | Fecha del ticket físico |
| `numero_ticket` | `VARCHAR(20)` **UNIQUE** | Número del talonario (no se puede repetir) |
| `tipo_vehiculo` | `ENUM('CARRO','MOTO')` | Tipo de vehículo |
| `hora_entrada`, `hora_salida` | `TIME` | Horas escritas en el ticket |
| `minutos_estacionado` | `INT` (columna calculada) | Duración total; MySQL la calcula sola, incluso si salió después de medianoche |
| `costo` | `INT` | Importe total en quetzales |
| `es_ticket_perdido` | `BOOLEAN` | Indica si el ticket se perdió |
| `aplica_tarifa_noche` | `BOOLEAN` | Indica si se cobró tarifa nocturna |
| `motivo_edicion` | `TEXT NULL` | Motivo de la última corrección (vacío si nunca se editó) |
| `fecha_captura` | `TIMESTAMP` | Momento en que se digitó |

### 6.3. `auditoria_borrados` — tickets anulados

Guarda una **copia exacta** del ticket anulado (número, fecha, vehículo, horas, minutos, costo e indicadores), más:

- `id_registro_original`: el ID que tenía en la jornada.
- `motivo_eliminacion`: motivo obligatorio de la anulación.
- `fecha_captura_original` y `fecha_eliminacion`: para saber cuándo se capturó y cuándo se anuló.

### 6.4. `auditoria_tickets_registrados` — histórico permanente

Al cerrar cada jornada, todos los tickets activos se copian aquí con todos sus datos (incluido el motivo de edición) y la fecha `fecha_cierre_sistema`. Esta tabla **nunca se vacía**: es el respaldo oficial de todas las jornadas.

> Un mismo número de ticket puede aparecer varias veces en el histórico (en jornadas distintas), pero **nunca dos veces** en la jornada activa.

### 6.5. `configuracion_jornada` — estado de la jornada

Tabla de **una sola fila** (`id = 1`) que guarda el estado compartido por todos los operadores:

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `INT` PK | Siempre vale `1` |
| `fase` | `ENUM('REGISTRO','AUDITORIA')` | Etapa actual de la jornada |
| `version` | `INT` | Contador que aumenta con cada cambio |

El contador `version` aumenta cada vez que se **registra, corrige o anula** un ticket, cuando **cambia la fase** y cuando se **cierra la jornada**. El frontend lo usa para saber si otro operador hizo un cambio y debe refrescar su pantalla.

Como este estado vive en MySQL y no en la memoria del servidor, **sobrevive a reinicios**: si el backend se apaga y se vuelve a encender, la jornada continúa en la misma fase en la que estaba. Además, si la jornada no tiene tickets, el sistema la regresa automáticamente a la fase `REGISTRO`.

### 6.6. Índices

Para que las búsquedas sean rápidas se crearon índices sobre `fecha_operacion` y `numero_ticket` en las tablas de tickets.

## 7. Endpoints REST

Todas las rutas comienzan con `/sol` y requieren autenticación **HTTP Basic Auth** (cabecera `Authorization: Basic ...`). Los datos se envían y reciben en formato **JSON**. Si se usa un método no permitido, la API responde `405` e indica los métodos aceptados.

### 7.1. Resumen

| Método | Endpoint | Descripción | Respuestas |
|---|---|---|---|
| `GET` | `/sol/acceso/verificar` | Verifica las credenciales | `200`, `401` |
| `POST` | `/sol/tarifas/calcular` | Calcula el cobro sin guardar nada (vista previa) | `200`, `400` |
| `POST` | `/sol/tickets` | Registra un ticket | `201`, `400`, `409` |
| `GET` | `/sol/tickets/activos` | Lista los tickets activos y los totales (`?numero=` para buscar) | `200` |
| `GET` | `/sol/tickets/buscar/:numero` | Busca un ticket por su número físico | `200`, `400`, `404` |
| `PATCH` | `/sol/tickets/:id/balance` | Corrige el horario y recalcula el cobro | `200`, `400`, `404`, `409` |
| `DELETE` | `/sol/tickets/:id` | Anula un ticket con motivo | `200`, `400`, `404`, `409` |
| `GET` | `/sol/jornada/estado` | Consulta la fase, totales y versión de la jornada | `200` |
| `POST` | `/sol/jornada/finalizar-registro` | Cambia la jornada a la fase `AUDITORIA` | `200` |
| `GET` | `/sol/reportes/excel` | Genera y descarga el reporte Excel | `200`, `500` |
| `POST` | `/sol/cierre/confirmar` | Archiva la jornada en el histórico y la vacía | `200`, `409`, `500` |
| `GET` | `/sol/cierre/historico` | Consulta el histórico (`?fecha=YYYY-MM-DD`) | `200` |

> `:id` es el identificador interno del ticket (`idRegistro`); `:numero` es el número impreso en el talonario.

### 7.2. Formato de las respuestas

```jsonc
// Respuesta exitosa
{ "ok": true, "mensaje": "…", "data": { … } }

// Respuesta con error
{ "ok": false, "mensaje": "…", "codigo": "JORNADA_CERRADA" }  // "codigo" solo en algunos casos
```

### 7.3. Ejemplos

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

Respuesta:

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

Respuesta `201` con el ticket creado (incluye `idRegistro`, `minutosEstacionado`, `tiempoLegible` como `"1 hr 30 min"` y `costo`).

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

### 7.4. Reporte Excel

`GET /sol/reportes/excel` descarga un archivo llamado `Reporte_Parqueo_DD_MM_YYYY.xlsx` con dos hojas:

| Hoja | Contenido |
|---|---|
| **Tickets Registrados** | Todos los tickets activos con horas, tiempo, recargos, cobro, estado de edición y motivo |
| **Tickets Eliminados** | Tickets anulados de esa fecha de operación, con su cobro original y motivo de anulación |

Generar el reporte **no modifica ningún dato** ni cierra la jornada.

## 8. Cierre transaccional seguro

### 8.1. ¿Qué es una transacción?

Una **transacción** agrupa varias operaciones en la base de datos para que se ejecuten **todas o ninguna**. Si algo falla a la mitad, MySQL deshace los cambios (`ROLLBACK`) y los datos quedan exactamente como estaban. Si todo sale bien, los cambios se guardan de forma definitiva (`COMMIT`).

### 8.2. Pasos del cierre (`POST /sol/cierre/confirmar`)

```text
 1. BEGIN TRANSACTION
 2. Leer y BLOQUEAR los tickets activos (SELECT … FOR UPDATE)
 3. ¿Hay tickets?
      └─ No → ROLLBACK y responder 409 (otro operador ya cerró)
 4. Copiar todos los tickets al histórico permanente
 5. ¿Se copiaron todos?
      └─ No → ROLLBACK (no se borra nada)
 6. Vaciar la tabla de tickets activos
 7. COMMIT
 8. Regresar la fase de la jornada a REGISTRO
```

**Garantías:**

- **Ningún ticket se pierde:** los tickets solo se borran de la jornada si la copia al histórico fue completa.
- **No hay cierres duplicados:** el bloqueo `FOR UPDATE` hace que, si dos operadores presionan “Cerrar” al mismo tiempo, el segundo espere al primero. Cuando le toca su turno ya no encuentra tickets y recibe un `409 JORNADA_YA_CERRADA`, sin duplicar el histórico.
- **Nueva jornada lista:** al terminar, la fase vuelve a `REGISTRO` y la `version` aumenta, por lo que todas las pantallas conectadas se enteran del cierre.

### 8.3. Protección de otras operaciones simultáneas

| Situación | Cómo se protege |
|---|---|
| Dos operadores registran el **mismo número de ticket** | La columna `numero_ticket` es `UNIQUE`: el segundo recibe `409` |
| Un operador intenta **editar o anular** después de que otro cerró la jornada | El middleware `verificarJornadaActivaMiddleware` responde `409` con código `JORNADA_CERRADA` |
| Dos operadores **anulan el mismo ticket** a la vez | La fila se bloquea con `FOR UPDATE`; el segundo recibe `404` porque el ticket ya no existe |

## 9. Seguridad

- **Autenticación HTTP Basic Auth:** todas las rutas `/sol/*` piden usuario y contraseña, definidos en `AUTH_USER` y `AUTH_PASS`. Si faltan o son incorrectos, la API responde `401`.
- **CORS restrictivo:** la API solo acepta peticiones del navegador que provengan de los orígenes autorizados: `http://localhost:4200` (desarrollo) y el dominio definido en `CORS_ORIGIN` (producción). Cualquier otro origen es rechazado.
- **Consultas parametrizadas:** todas las consultas SQL usan parámetros (`?`), lo que evita ataques de inyección SQL.
- **Cálculos en el servidor:** los importes nunca se aceptan desde el cliente.
- **Recomendación para producción:** publicar la API detrás de **HTTPS**, ya que Basic Auth envía las credenciales codificadas, pero no cifradas.

## 10. Validaciones

| Campo | Regla |
|---|---|
| `numeroTicket` | Obligatorio, solo números, máximo 20 dígitos (se guarda como texto para conservar ceros iniciales) |
| `tipoVehiculo` | `CARRO` o `MOTO` |
| `horaEntrada`, `horaSalida` | Formato de 24 horas `HH:mm`; no pueden ser iguales |
| `fechaOperacion` | `YYYY-MM-DD` o `DD/MM/YYYY`; debe ser una fecha válida y no futura |
| `aplicaTarifaNoche`, `esTicketPerdido` | Verdadero o falso; si no se envían, se toman como `false` |
| `motivoEdicion`, `motivoEliminacion` | Obligatorios, entre **4 y 255** caracteres |

**Caracteres permitidos en los motivos:** letras (incluidas `á é í ó ú ñ ü`), números, espacios y los signos `. , ; : ( ) # - _ /`. Se rechazan emojis y otros símbolos.

## 11. Códigos de respuesta HTTP

| Código | Significado | Ejemplo |
|---|---|---|
| `200` | Operación correcta | Consultas, correcciones, anulaciones, cierre |
| `201` | Recurso creado | Registro de un ticket |
| `400` | Datos inválidos | Hora con formato incorrecto, motivo vacío |
| `401` | Sin autorización | Usuario o contraseña incorrectos |
| `404` | No encontrado | Ticket o ruta inexistente |
| `405` | Método no permitido | Usar `GET` en una ruta que solo acepta `POST` |
| `409` | Conflicto | Ticket duplicado o jornada ya cerrada |
| `500` | Error interno | Falla inesperada del servidor |

**Códigos de conflicto (`codigo`) que el frontend reconoce:**

| `codigo` | Cuándo ocurre |
|---|---|
| `JORNADA_CERRADA` | Se intenta editar o anular un ticket, pero la jornada ya no tiene tickets activos |
| `JORNADA_YA_CERRADA` | Se intenta cerrar una jornada que otro operador ya cerró |
| `ERROR_CIERRE` | Falla inesperada durante el cierre (no se pierde ningún dato) |
