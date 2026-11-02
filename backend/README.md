# Control de Parqueo (Editorial Sol) — Backend API

Backend para digitalizar los tickets físicos de un parqueo, calcular los cobros según las reglas del negocio, mantener trazabilidad de correcciones y anulaciones, generar reportes en Excel y cerrar jornadas de forma segura.

El sistema permite que varios operadores trabajen simultáneamente desde distintos dispositivos sobre los mismos datos. La consistencia de la información, la auditoría y la protección frente a operaciones concurrentes son requisitos centrales.

---

## 1. Características principales

- Registro digital de tickets físicos de parqueo.
- Cálculo automático del tiempo facturable y del importe.
- Tarifas diferenciadas para carros y motocicletas.
- Aplicación de recargos por ticket perdido y tarifa nocturna.
- Consulta, búsqueda y revisión de tickets activos.
- Corrección de horarios mediante un proceso de balance con justificación obligatoria.
- Anulación de tickets con conservación de sus datos originales.
- Auditoría de eliminaciones y almacenamiento histórico de tickets registrados.
- Generación de reportes Excel con hojas separadas para tickets activos y eliminados.
- Cierre transaccional de jornada.
- Protección para el trabajo simultáneo de varios operadores.
- Autenticación mediante HTTP Basic Auth.

## 2. Tecnologías y requisitos

### Tecnologías

La documentación del proyecto identifica las siguientes tecnologías:

- **Node.js:** entorno de ejecución.
- **Express:** servidor y enrutamiento HTTP.
- **TypeScript:** tipado estático.
- **MySQL:** sistema gestor de base de datos.
- **mysql2/promise:** conexión y consultas a MySQL mediante promesas.
- **ExcelJS:** generación de archivos Excel.

### Requisitos

- Node.js 18 o superior.
- MySQL 8.0 o superior.
- pnpm como gestor de paquetes.
- Un gestor de base de datos compatible con MySQL, como MySQL Workbench, DBeaver o la CLI de MySQL.

## 3. Configuración del entorno

Crear un archivo `.env` en la raíz del backend con las variables necesarias:

```env
PORT=3000

DB_HOST=localhost
DB_USER=
DB_PASSWORD=
DB_NAME=control_parqueo_sol
DB_PORT=3306

AUTH_USER=trabajador_sol
AUTH_PASS=clave_segura_aqui
```

### Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Puerto en el que se ejecuta el servidor. |
| `DB_HOST` | Host del servidor MySQL. |
| `DB_USER` | Usuario de conexión a MySQL. |
| `DB_PASSWORD` | Contraseña del usuario de MySQL. |
| `DB_NAME` | Nombre de la base de datos. |
| `DB_PORT` | Puerto de conexión a MySQL. |
| `AUTH_USER` | Usuario compartido para HTTP Basic Auth. |
| `AUTH_PASS` | Contraseña compartida para HTTP Basic Auth. |

No publicar el archivo `.env` ni almacenar credenciales reales en el repositorio. Se deben mantener los valores privados y utilizar una plantilla `.env.example` sin contraseñas reales.

## 4. Instalación y ejecución

### 4.1. Instalar dependencias

```bash
pnpm install
```

### 4.2. Crear la base de datos

Ejecuta el script SQL del proyecto desde MySQL Workbench, DBeaver o la terminal.

El script crea la base de datos `control_parqueo_sol` y sus tres tablas principales.

### 4.3. Ejecutar en desarrollo

```bash
pnpm dev
```

### 4.4. Compilar y ejecutar en producción

```bash
pnpm build
pnpm start
```

## 5. Funcionamiento general

### 5.1. Conceptos principales

| Concepto | Descripción |
|---|---|
| **Fecha de operación** | Fecha que aparece en el ticket físico y a la que corresponde el servicio de parqueo. |
| **Fecha de captura** | Fecha y hora en que el ticket se ingresó digitalmente al sistema. Se genera automáticamente. |
| **Jornada activa** | Conjunto de tickets que se están registrando o revisando y que todavía no se han archivado mediante el cierre. |
| **Ticket activo** | Ticket que permanece en el registro operativo de la jornada. |
| **Ticket eliminado** | Ticket retirado del registro activo mediante una anulación justificada y conservado en la auditoría de eliminaciones. |
| **Ticket histórico registrado** | Ticket activo que se copia al histórico permanente cuando se cierra la jornada. |
| **Balance** | Corrección de la hora de entrada y/o salida de un ticket para ajustar el cobro a la información física. |
| **Casos especiales** | Indicadores de ticket perdido y aplicación de tarifa nocturna. |
| **Cierre de jornada** | Operación que archiva los tickets activos y limpia el registro operativo después de la confirmación del reporte. |

La fecha de operación y la fecha de captura son datos diferentes y deben conservarse por separado. Un ticket puede corresponder a una fecha física anterior y ser capturado digitalmente después.

### 5.2. Flujo de trabajo

El proceso se organiza alrededor de una jornada activa:

1. **Registro:** los operadores transcriben los datos de los tickets físicos.
2. **Finalización del registro:** se pasa a la revisión de la jornada sin eliminar ni archivar los tickets.
3. **Auditoría:** se consultan los tickets activos, se corrigen horarios o se anulan registros con su respectiva justificación.
4. **Reporte:** se genera un archivo Excel con los tickets activos y los eliminados.
5. **Confirmación:** el operador verifica manualmente que el archivo se descargó y puede abrirse.
6. **Cierre:** se archivan los tickets activos y se vacía el registro operativo únicamente después de completar correctamente el respaldo histórico.

Generar o descargar el reporte no cierra la jornada. Los datos deben permanecer disponibles hasta que el operador confirme el cierre.

### 5.3. Acceso y autenticación

Las rutas operativas bajo `/sol/...` requieren autenticación HTTP Basic Auth mediante el encabezado:

```http
Authorization: Basic <base64>
```

El proyecto utiliza credenciales compartidas para los operadores. El navegador puede ofrecer guardar las credenciales para evitar introducirlas en cada acceso.

### 5.4. Comportamiento general esperado

- Mostrar mensajes claros de éxito, validación, error y confirmación.
- Conservar los datos del formulario cuando una validación falle.
- Diferenciar las acciones principales de las acciones destructivas.
- Permitir cancelar una edición o eliminación sin modificar el ticket.
- Evitar registros, anulaciones o cierres duplicados por doble clic o reenvío accidental.
- Mostrar importes en quetzales (`Q`) y tiempos de forma legible.
- Informar éxito únicamente cuando la operación haya terminado correctamente.
- Mantener una interfaz utilizable en computadoras y tabletas.

## 6. Reglas de negocio

### 6.1. Horario de operación

El horario regular del parqueo es de **04:30 a 17:30**.

El tiempo facturable se acumula únicamente dentro de ese horario. El periodo durante el cual el parqueo permanece cerrado no se cobra como tiempo adicional.

Si un vehículo continúa dentro del parqueo al llegar las 17:30, corresponde aplicar la tarifa nocturna. Si sale al día siguiente, se suman los periodos facturables anteriores al cierre y posteriores a la reapertura, además del recargo nocturno.

### 6.2. Tarifas regulares

| Tipo de vehículo | Tiempo | Importe |
|---|---:|---:|
| Carro | Hasta 30 minutos | Q5 |
| Carro | Más de 30 minutos y hasta 1 hora | Q10 |
| Carro | Cada bloque adicional de 30 minutos iniciado, después de la primera hora | Q5 |
| Moto | Hasta 1 hora | Q5 |
| Moto | Cada bloque adicional de 30 minutos iniciado, después de la primera hora | Q5 |

Las fracciones de tiempo se redondean hacia arriba al siguiente intervalo aplicable.

#### Ejemplos de cobro

| Tiempo facturable | Carro | Moto |
|---|---:|---:|
| 30 minutos | Q5 | Q5 |
| 31 minutos | Q10 | Q5 |
| 40 minutos | Q10 | Q5 |
| 1 hora | Q10 | Q5 |
| 1 hora y 30 minutos | Q15 | Q10 |
| 1 hora y 31 minutos | Q20 | Q15 |

### 6.3. Recargos especiales

| Caso | Recargo | Regla |
|---|---:|---|
| Tarifa nocturna | Q150 | Se aplica si el vehículo permanece dentro al llegar las 17:30 o si el operador activa manualmente el indicador. |
| Ticket perdido | Q25 | Se suma al cobro por tiempo que corresponda. |

Los recargos son acumulables. Cuando coinciden ambos casos especiales, el importe se calcula así:

```text
Total = Cobro por tiempo + Q150 (tarifa nocturna) + Q25 (ticket perdido)
```

#### Ejemplo de tarifa nocturna

Si un carro entra a las 17:00 y permanece dentro cuando el parqueo cierra a las 17:30:

- Tiempo facturable: 30 minutos = Q5.
- Tarifa nocturna: Q150.
- Total: **Q155**, sin incluir un eventual recargo por ticket perdido.

No se cobra tiempo adicional durante el periodo nocturno de cierre.

### 6.4. Estancias que continúan al día siguiente

Ejemplo: un carro entra a las 16:00 y sale a las 07:10 del día siguiente.

El cálculo considera:

1. El tiempo facturable entre las 16:00 y las 17:30.
2. El recargo nocturno de Q150.
3. El tiempo facturable entre las 04:30 y las 07:10 del día siguiente.

El periodo entre las 17:30 y las 04:30 no se suma como tiempo facturable.

**Importante:** la duración total transcurrida no equivale al tiempo facturable. El periodo de cierre nocturno no se cobra como tiempo adicional, aunque sí puede activar el recargo nocturno.

El parqueo no permite estancias de varios días. El formulario captura una sola fecha de operación; no debe inferirse una estancia de varios días a partir de dos horas.

### 6.5. Registro de tickets

El formulario debe capturar:

- Fecha de operación.
- Número de ticket.
- Tipo de vehículo (`CARRO` o `MOTO`).
- Hora de entrada.
- Hora de salida.
- Indicador de ticket perdido.
- Indicador de tarifa nocturna.

El cobro se calcula automáticamente y es de solo lectura. El backend no debe aceptar como confiable un importe enviado por el cliente.

Reglas de validación:

- El número de ticket es obligatorio y no puede repetirse dentro de la jornada activa.
- El número debe conservarse como texto para no alterar su representación.
- El tipo de vehículo es obligatorio y solo admite `CARRO` o `MOTO`.
- Las horas deben ser válidas.
- La fecha de operación es obligatoria, permite fechas anteriores y no permite fechas futuras.
- La hora de salida no puede ser idéntica a la hora de entrada.
- Los indicadores de casos especiales deben registrarse explícitamente, incluso cuando estén desactivados.
- Un ticket solo se considera guardado cuando la operación se confirma correctamente.

El ticket físico se registra digitalmente después de que el vehículo ha salido. La hora de entrada debe corresponder a la anotada en el ticket físico; solo debe corregirse cuando exista un error de digitación u otro error de captura.

### 6.6. Balance o edición de horarios

El balance permite corregir únicamente la hora de entrada y/o la hora de salida.

No se permite modificar desde esta operación:

- Fecha de operación.
- Número de ticket.
- Tipo de vehículo.
- Indicador de ticket perdido.
- Indicador de tarifa nocturna.

Reglas:

- Debe cambiarse al menos una de las horas.
- No se permite guardar exactamente el mismo horario que ya tenía el ticket.
- Ambas horas deben ser válidas.
- El motivo de edición es obligatorio.
- El backend recalcula el tiempo y el importe.
- El motivo y los valores actualizados se guardan junto con el ticket.
- Un ticket puede editarse más de una vez.
- La auditoría muestra el motivo de la última edición.
- Cancelar no debe guardar cambios.

La estructura actual conserva el motivo de edición vigente, no un historial completo de todas las versiones del ticket.

### 6.7. Anulación de tickets

La eliminación es una anulación justificada, no una eliminación silenciosa.

Antes de confirmar se debe identificar claramente el ticket mediante, como mínimo:

- Número de ticket.
- Tipo de vehículo.
- Importe calculado.
- Motivo de eliminación.

Al confirmar:

1. Se copia a `auditoria_borrados` la información original del ticket.
2. Se conserva su identificador original, fecha de captura y motivo de eliminación.
3. La copia de auditoría debe completarse correctamente.
4. Solo entonces se retira el ticket del registro activo.

Si falla la escritura de auditoría, el ticket debe permanecer activo. Después de una anulación exitosa, deja de contribuir a los totales activos y aparece en la hoja **Tickets eliminados** del Excel.

Cancelar la operación no debe modificar ningún dato.

### 6.8. Orden y consulta

- Los tickets se ordenan por fecha de operación descendente.
- Cuando la fecha sea igual, se ordenan por número de ticket ascendente en orden numérico.
- La búsqueda por número filtra los registros mostrados, pero no modifica los totales globales.
- Los totales de auditoría se calculan únicamente con tickets activos.

## 7. Estructura de la base de datos

La base de datos se llama `control_parqueo_sol` y utiliza `utf8mb4` con la intercalación `utf8mb4_unicode_ci`.

El script SQL define tres tablas principales.

### 7.1. `registro_tickets`

Tabla operativa que contiene los tickets de la jornada activa. Se limpia después de un cierre exitoso.

| Campo | Tipo | Descripción |
|---|---|---|
| `id_registro` | `INT` | Identificador interno y clave primaria autoincremental. |
| `fecha_operacion` | `DATE` | Fecha del ticket físico. |
| `numero_ticket` | `VARCHAR(20)` | Número del talonario; único en esta tabla. |
| `tipo_vehiculo` | `ENUM('CARRO', 'MOTO')` | Tipo de vehículo. |
| `hora_entrada` | `TIME` | Hora de entrada del ticket físico. |
| `hora_salida` | `TIME` | Hora de salida del ticket físico. |
| `minutos_estacionado` | `INT` | Duración calculada por la base de datos; contempla una salida posterior a medianoche. |
| `costo` | `INT` | Importe calculado en quetzales enteros. |
| `es_ticket_perdido` | `BOOLEAN` | Indicador de ticket perdido. |
| `aplica_tarifa_noche` | `BOOLEAN` | Indicador de tarifa nocturna. |
| `motivo_edicion` | `TEXT` | Motivo de la última edición; `NULL` si no se ha editado. |
| `fecha_captura` | `TIMESTAMP` | Fecha y hora de creación del registro digital. |

`minutos_estacionado` es una columna generada y almacenada. El importe `costo` debe ser calculado por la lógica de negocio.

Índices definidos:

- `idx_tickets_fecha_operacion` sobre `fecha_operacion`.
- `idx_tickets_numero` sobre `numero_ticket`.

### 7.2. `auditoria_borrados`

Conserva una copia de los tickets anulados.

| Campo | Tipo | Descripción |
|---|---|---|
| `id_borrado` | `INT` | Identificador del evento de eliminación. |
| `id_registro_original` | `INT` | Identificador que tenía el ticket en la tabla operativa. |
| `fecha_operacion` | `DATE` | Fecha del ticket físico. |
| `numero_ticket` | `VARCHAR(20)` | Número del ticket. |
| `tipo_vehiculo` | `ENUM('CARRO', 'MOTO')` | Tipo de vehículo. |
| `hora_entrada` | `TIME` | Hora de entrada original. |
| `hora_salida` | `TIME` | Hora de salida original. |
| `minutos_estacionado` | `INT` | Duración original. |
| `costo` | `INT` | Importe original. |
| `es_ticket_perdido` | `BOOLEAN` | Indicador original de ticket perdido. |
| `aplica_tarifa_noche` | `BOOLEAN` | Indicador original de tarifa nocturna. |
| `motivo_eliminacion` | `TEXT` | Justificación obligatoria de la anulación. |
| `fecha_captura_original` | `TIMESTAMP` | Fecha y hora de captura del ticket original. |
| `fecha_eliminacion` | `TIMESTAMP` | Fecha y hora de eliminación. |

Esta tabla no debe utilizarse como registro de errores generales de la aplicación ni de fallos de descarga.

Índice definido:

- `idx_borrados_fecha_operacion` sobre `fecha_operacion`.

### 7.3. `auditoria_tickets_registrados`

Histórico permanente de los tickets activos que se archivan al cerrar una jornada.

| Campo | Tipo | Descripción |
|---|---|---|
| `id_historico` | `INT` | Identificador del registro histórico. |
| `id_registro_original` | `INT` | Identificador que tenía el ticket en la tabla operativa. |
| `fecha_operacion` | `DATE` | Fecha del ticket físico. |
| `numero_ticket` | `VARCHAR(20)` | Número del ticket. |
| `tipo_vehiculo` | `ENUM('CARRO', 'MOTO')` | Tipo de vehículo. |
| `hora_entrada` | `TIME` | Hora de entrada. |
| `hora_salida` | `TIME` | Hora de salida. |
| `minutos_estacionado` | `INT` | Duración registrada. |
| `costo` | `INT` | Importe calculado. |
| `es_ticket_perdido` | `BOOLEAN` | Indicador de ticket perdido. |
| `aplica_tarifa_noche` | `BOOLEAN` | Indicador de tarifa nocturna. |
| `motivo_edicion` | `TEXT` | Motivo de la última edición, si existe. |
| `fecha_captura` | `TIMESTAMP` | Fecha y hora de captura original. |
| `fecha_cierre_sistema` | `TIMESTAMP` | Fecha y hora en que se archivó el ticket. |

Índices definidos:

- `idx_historico_fecha_operacion` sobre `fecha_operacion`.
- `idx_historico_numero` sobre `numero_ticket`.

### 7.4. Consideraciones del modelo de datos

- Las tablas de auditoría conservan el identificador que tenía el registro original.
- El histórico conserva el motivo de edición vigente al momento del cierre, pero no registra cada versión de las ediciones.
- La estructura actual no incluye una tabla específica para controlar el estado o identificador de la jornada.
- Tampoco incluye entidades específicas para registrar exportaciones, resultados de descarga o errores generales.
- La unicidad de `numero_ticket` está definida en `registro_tickets`, no en las tablas de auditoría. Esto permite conservar números repetidos en jornadas distintas sin exigir unicidad histórica global.
- Los registros históricos no deben volver a aparecer como tickets activos en una jornada nueva.
- Si una regla requiere información que el modelo actual no conserva, debe señalarse y evaluarse el cambio necesario antes de implementarla.

## 8. Arquitectura y estructura del código

La organización documentada del backend es modular:

```text
backend/
├── src/
│   ├── config/        # Variables de entorno y pool de conexión MySQL
│   ├── controllers/   # Controladores Express: req, res y códigos HTTP
│   ├── dtos/          # Tipado de entradas y salidas
│   ├── middlewares/   # Basic Auth, 404, errores y protección de jornada
│   ├── models/        # Consultas SQL y transacciones
│   ├── routes/        # Rutas y control de métodos HTTP
│   ├── services/      # Lógica de negocio, tarifas y generación de Excel
│   ├── utils/         # Sanitización, validaciones y formato de tiempo
│   ├── app.ts         # Configuración central de Express
│   └── index.ts       # Punto de entrada del servidor
├── .env.example       # Plantilla de variables de entorno
├── package.json
└── tsconfig.json
```

### Responsabilidades por capa

| Capa | Responsabilidad |
|---|---|
| `config` | Configuración del entorno y conexión con MySQL. |
| `controllers` | Recibir solicitudes, invocar servicios y responder con códigos HTTP. |
| `dtos` | Definir la estructura y tipado de los datos de entrada y salida. |
| `middlewares` | Autenticación, manejo de errores, rutas no encontradas y protección de jornada. |
| `models` | Ejecutar consultas SQL y operaciones transaccionales. |
| `routes` | Declarar endpoints y restringir los métodos HTTP permitidos. |
| `services` | Implementar las reglas del dominio, cálculos y generación de Excel. |
| `utils` | Funciones auxiliares de validación, sanitización y formato. |

## 9. API REST

Todas las rutas operativas bajo `/sol/...` requieren HTTP Basic Auth.

Las rutas deben responder con `405 Method Not Allowed` cuando se utilice un verbo HTTP no soportado.

### 9.1. Autenticación y verificación

| Método | Endpoint | Descripción | Respuestas principales |
|---|---|---|---|
| `GET` | `/sol/acceso/verificar` | Valida las credenciales Basic Auth y confirma el acceso. | `200 OK`, `401 Unauthorized` |

### 9.2. Cálculo de tarifas

| Método | Endpoint | Descripción | Datos principales |
|---|---|---|---|
| `POST` | `/sol/tarifas/calcular` | Simula el cobro sin guardar información en la base de datos. | `horaEntrada`, `horaSalida`, `tipoVehiculo`, `aplicaTarifaNoche`, `esTicketPerdido` |

Respuestas principales: `200 OK`, `400 Bad Request`.

Ejemplo de estructura del cuerpo:

```json
{
  "horaEntrada": "12:00",
  "horaSalida": "13:30",
  "tipoVehiculo": "CARRO",
  "aplicaTarifaNoche": false,
  "esTicketPerdido": false
}
```

### 9.3. Registro y consulta de tickets

| Método | Endpoint | Descripción | Datos / parámetros | Respuestas principales |
|---|---|---|---|---|
| `POST` | `/sol/tickets` | Registra un ticket y valida la unicidad del número en la jornada activa. | `fechaOperacion`, `numeroTicket`, `tipoVehiculo`, `horaEntrada`, `horaSalida` e indicadores especiales. | `201 Created`, `400 Bad Request`, `409 Conflict` |
| `GET` | `/sol/tickets/activos` | Lista los tickets activos y los totales de auditoría. | Query opcional: `?numero=...` | `200 OK` |
| `GET` | `/sol/tickets/buscar/:numero` | Devuelve el detalle de un ticket activo por su número físico. | Parámetro de ruta `:numero`. | `200 OK`, `404 Not Found` |
| `PATCH` | `/sol/tickets/:id/balance` | Corrige horarios y recalcula el importe. | `horaEntrada`, `horaSalida`, `motivoEdicion`. | `200 OK`, `400 Bad Request`, `409 Conflict` |
| `DELETE` | `/sol/tickets/:id` | Anula el ticket y lo conserva en `auditoria_borrados`. | `motivoEliminacion`. | `200 OK`, `404 Not Found`, `409 Conflict` |

### 9.4. Estado de jornada

| Método | Endpoint | Descripción | Respuestas principales |
|---|---|---|---|
| `GET` | `/sol/jornada/estado` | Devuelve el estado de la jornada, la fecha operativa y la cantidad de tickets activos. | `200 OK` |

### 9.5. Reportes Excel

| Método | Endpoint | Descripción | Salida |
|---|---|---|---|
| `GET` | `/sol/reportes/excel` | Genera y descarga el reporte sin vaciar la jornada. | Archivo `.xlsx` en flujo binario. |

Nombre de archivo documentado:

```text
Reporte_Parqueo_DD_MM_YYYY.xlsx
```

Respuesta principal: `200 OK`.

### 9.6. Cierre e histórico

| Método | Endpoint | Descripción | Parámetros | Respuestas principales |
|---|---|---|---|---|
| `POST` | `/sol/cierre/confirmar` | Archiva permanentemente los tickets activos y vacía la jornada. | Sin parámetros documentados. | `200 OK`, `409 Conflict` |
| `GET` | `/sol/cierre/historico` | Consulta tickets archivados. | Query opcional: `?fecha=YYYY-MM-DD` | `200 OK` |

> **Nota sobre los contratos:** Para conocer todos los campos opcionales, formatos exactos, estructuras de respuesta y códigos de error específicos, consulta los DTO, validadores y controladores implementados.

## 10. Reportes de Excel

El reporte contiene dos hojas:

### Hoja 1: Tickets registrados

Incluye los tickets que continúan activos al momento de generar el archivo.

Campos esperados:

- Fecha de operación.
- Número de ticket.
- Tipo de vehículo.
- Hora de entrada y hora de salida.
- Minutos estacionados o duración legible.
- Indicador de ticket perdido.
- Indicador de tarifa nocturna.
- Motivo de edición, cuando exista.
- Importe cobrado.
- Fecha y hora de captura.

### Hoja 2: Tickets eliminados

Incluye los tickets anulados durante la jornada y conservados en la auditoría.

Campos esperados:

- Fecha de operación.
- Número de ticket.
- Tipo de vehículo.
- Hora de entrada y hora de salida.
- Duración.
- Indicadores de casos especiales.
- Importe original.
- Motivo de eliminación.
- Fecha y hora de captura original.
- Fecha y hora de eliminación.

### Reglas del reporte

- Los encabezados deben ser claros y las columnas legibles.
- Las fechas y horas deben utilizar formatos consistentes.
- La presentación debe facilitar la lectura y revisión de la jornada.
- Se pueden utilizar colores moderadamente para diferenciar encabezados, totales y alertas.
- El reporte debe representar una misma instantánea lógica de la jornada.
- Si ocurre una edición o eliminación durante la generación, se debe evitar un archivo que mezcle estados inconsistentes.
- La generación del Excel no debe borrar ni archivar los datos activos.

La fecha usada en el nombre del archivo corresponde a la fecha de referencia de la jornada de captura, no necesariamente a la fecha de operación impresa en cada ticket. La fecha de referencia se establece al iniciar la jornada y se mantiene durante esa jornada, incluidos los reintentos de descarga.

La descarga preparada por el servidor no demuestra que el navegador haya guardado el archivo correctamente. El operador debe verificarlo manualmente.

## 11. Concurrencia y cierre de jornada

### 11.1. Trabajo simultáneo

Dos o más operadores pueden utilizar la aplicación desde dispositivos diferentes y trabajar sobre el mismo conjunto central de registros.

La consistencia debe garantizarse en el backend y en la base de datos; no basta con bloquear botones en la interfaz.

### 11.2. Registro duplicado

`numero_ticket` debe ser único dentro de la jornada activa.

Si dos operadores intentan registrar simultáneamente el mismo número:

- Solo una operación puede completarse.
- La otra debe recibir una respuesta de conflicto o duplicado.
- La validación debe realizarse al guardar, no únicamente cuando el operador escribe el número.

### 11.3. Ediciones y eliminaciones concurrentes

Si un ticket fue editado o eliminado por otro operador antes de confirmar una acción, el backend debe validar nuevamente su estado actual y evitar sobrescribir silenciosamente cambios más recientes.

### 11.4. Cierre seguro

El cierre debe realizarse como una operación transaccional:

1. Verificar que la jornada todavía contiene los registros que se van a cerrar.
2. Comprobar que no existe otro cierre completado.
3. Bloquear los registros necesarios para evitar modificaciones concurrentes.
4. Copiar los tickets activos a `auditoria_tickets_registrados`.
5. Comprobar que el archivado se completó correctamente.
6. Solo entonces retirar los tickets del registro operativo.
7. Marcar la jornada como cerrada y permitir iniciar una nueva.

Si falla el respaldo, no se deben borrar los registros activos. La confirmación repetida no debe duplicar el histórico ni provocar un segundo cierre.

### 11.5. Detección de una jornada cerrada por otro operador

Si un operador confirma el cierre mientras otro permanece en auditoría:

- Se deben impedir nuevas ediciones, eliminaciones o registros sobre la jornada cerrada.
- El backend debe detectar que la jornada fue cerrada o reiniciada por otro operador.
- La API debe responder con un conflicto identificable, como `JORNADA_CERRADA` o `JORNADA_YA_CERRADA`.
- La interfaz debe informar que otro operador reinició el sistema para una nueva jornada y ofrecer volver al formulario inicial.
- El segundo operador no debe repetir el cierre ni modificar los datos de la jornada anterior.

## 12. Validaciones e integridad

- Los importes se calculan en el backend y se vuelven a validar al guardar o editar.
- Las operaciones de edición y eliminación deben identificar inequívocamente el ticket.
- Los motivos de edición y eliminación son obligatorios.
- Los datos de auditoría deben conservar una copia fiel de los valores existentes al momento de la operación.
- Los registros activos no deben borrarse si falla la escritura de auditoría o del histórico.
- Las entradas deben validarse por tipo, formato, longitud y reglas de negocio.
- Los motivos deben aceptar texto claro, sin emojis ni caracteres de control. Se permite texto normal con letras, números, espacios y puntuación común.
- El texto del usuario debe tratarse como dato, nunca como una instrucción ejecutable.
- La validación no debe rechazar texto legítimo solo porque contenga una palabra que también pueda aparecer en una consulta.
- Los mensajes de error no deben exponer información interna innecesaria.
- Las operaciones críticas deben protegerse contra duplicaciones accidentales, solicitudes repetidas y cambios concurrentes.
- Los reportes deben generarse a partir de datos persistidos, no de cifras calculadas únicamente en la interfaz.
- Los totales deben derivarse de los tickets activos y excluir los eliminados.
- Se deben distinguir la fecha de operación, fecha de captura, fecha de eliminación y fecha de cierre.

## 13. Códigos de respuesta HTTP

Los siguientes códigos aparecen en los contratos documentados:

| Código | Significado | Uso en el sistema |
|---|---|---|
| `200 OK` | Solicitud procesada correctamente. | Consultas, balances, anulaciones, reportes y cierres exitosos. |
| `201 Created` | Recurso creado correctamente. | Registro de tickets. |
| `400 Bad Request` | Datos inválidos o solicitud que incumple una regla. | Validaciones y horarios inválidos. |
| `401 Unauthorized` | Credenciales ausentes o incorrectas. | Autenticación Basic Auth. |
| `404 Not Found` | Recurso no encontrado. | Búsqueda o modificación de un ticket inexistente. |
| `405 Method Not Allowed` | Método HTTP no permitido para la ruta. | Uso de un verbo no soportado. |
| `409 Conflict` | Conflicto con el estado actual de los datos. | Número duplicado, jornada cerrada o cierre concurrente. |

## 14. Consideraciones y límites actuales

- La base de datos actual no contiene una tabla específica de jornadas. El control del estado de la jornada debe resolverse mediante el diseño vigente del backend o evaluarse como una ampliación explícita del esquema.
- No existe una tabla específica para historial completo de cada edición. Actualmente se conserva el motivo de la última edición en el ticket activo y en el histórico al momento del cierre.
- No existe una tabla específica para registrar intentos o resultados de exportación y descarga.
- La base de datos calcula `minutos_estacionado` a partir de dos horas y contempla una salida posterior a medianoche. La regla operativa del parqueo no permite estancias de varios días y el formulario solo captura una fecha.
- El registro histórico es de solo lectura después del cierre.
- No se deben inventar reglas de negocio para situaciones que no estén definidas. Si aparece una contradicción entre los requisitos, las pantallas y la estructura de datos, debe documentarse antes de cambiar el comportamiento.
- La generación del reporte, la confirmación manual de descarga y el cierre de jornada son acciones distintas y no deben confundirse.

---

## Instrucciones para mantenimiento y desarrollo

Antes de implementar o modificar una función:

1. Revisar las reglas de negocio y el flujo operativo descritos en este README.
2. Identificar qué requisito funcional se está implementando y qué datos lo respaldan.
3. Aplicar las tarifas confirmadas; no inventar reglas para escenarios no definidos.
4. Si se detectan contradicciones entre el comportamiento esperado y la estructura de datos, explícarlas antes de cambiar la lógica.
5. Priorizar la integridad de los tickets, la trazabilidad de ediciones y eliminaciones, el cierre seguro y la consistencia entre operadores.
6. No confundir la generación del reporte con la confirmación de descarga ni con el cierre de jornada.
7. No borrar datos activos antes de confirmar que se archivaron correctamente.
8. Conservar los nombres actuales de campos y tablas cuando sean adecuados. Justificar cualquier modificación del esquema.
9. No asumir tecnologías o herramientas distintas de las definidas para el proyecto.

