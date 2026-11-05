# Control de Parqueo (Editorial Sol) — Frontend

Aplicación web de una sola página (**SPA**) con la que los operadores **transcriben los tickets físicos**, revisan y corrigen la jornada, descargan el reporte Excel y confirman el cierre del día. Se comunica con la API del [backend](../backend/README.md), que es la **fuente de verdad** de los importes, los totales y el estado de la jornada.

> Documentación general: [README de la raíz](../README.md) · API y reglas de negocio: [README del backend](../backend/README.md)

---

## Tabla de contenido

1. [Tecnologías](#1-tecnologías)
2. [Instalación y ejecución](#2-instalación-y-ejecución)
3. [Vistas de la aplicación](#3-vistas-de-la-aplicación)
4. [Flujo de pantallas protegido por Guards](#4-flujo-de-pantallas-protegido-por-guards)
5. [Manejo de estado con Signals](#5-manejo-de-estado-con-signals)
6. [Sincronización multisesión](#6-sincronización-multisesión)
7. [Manejo de errores y conexión](#7-manejo-de-errores-y-conexión)
8. [Diseño responsivo para tablets](#8-diseño-responsivo-para-tablets)
9. [Estructura del proyecto](#9-estructura-del-proyecto)
10. [Configuración y despliegue](#10-configuración-y-despliegue)

---

## 1. Tecnologías

| Tecnología | Versión | Uso |
|---|---|---|
| **Angular** | 22 | Framework principal (componentes *standalone*, Signals, `@if` / `@for`) |
| **TypeScript** | ~6.0 | Lenguaje de programación con tipos |
| **RxJS** | ~7.8 | Peticiones HTTP, consultas periódicas y esperas (*debounce*) |
| **Tailwind CSS** | 4 | Estilos mediante clases utilitarias, con paleta propia `sol-*` |
| **pnpm** | 12 | Gestor de paquetes |

> **¿Qué es un componente *standalone*?** Es un componente de Angular que declara por sí mismo lo que necesita (otros componentes, pipes, formularios), sin depender de un `NgModule`. Esto hace el proyecto más simple y ordenado.

## 2. Instalación y ejecución

### Requisitos

- **Node.js** en una versión LTS compatible con Angular 22.
- **pnpm**.
- El [backend](../backend/README.md) funcionando en `http://localhost:3000`.

### Pasos

```bash
cd frontend
pnpm install
pnpm start
```

La aplicación queda disponible en `http://localhost:4200`. Al abrirla, el navegador muestra su cuadro de **inicio de sesión**; ingresa las credenciales `AUTH_USER` / `AUTH_PASS` configuradas en el backend.

### Scripts

| Script | Comando | Descripción |
|---|---|---|
| `pnpm start` | `ng serve --proxy-config proxy.conf.json` | Servidor de desarrollo con proxy hacia el backend |
| `pnpm build` | `ng build` | Compilación para producción en `dist/frontend/browser` |
| `pnpm watch` | `ng build --watch --configuration development` | Compilación continua en modo desarrollo |
| `pnpm test` | `ng test` | Ejecuta las pruebas unitarias |

## 3. Vistas de la aplicación

### 3.1. Registro de tickets (`/registro`)

Formulario para transcribir cada boleta física.

![Registro de tickets](docs/screenshots/01-registro.png)

- **Campos:** fecha de operación (hoy por defecto, no permite fechas futuras), número de ticket, tipo de vehículo (Carro / Moto), hora de entrada, hora de salida y las casillas *Aplica tarifa noche* y *Ticket perdido*.
- **Cobro total:** campo de solo lectura. Se pide al backend automáticamente **350 ms** después de que el operador deja de escribir, y muestra *Calculando…* mientras espera la respuesta.
- **Guardar boleta y agregar otra:** guarda el ticket y limpia el formulario, pero **conserva la fecha y el tipo de vehículo** para capturar más rápido. Si hay un error (por ejemplo, número duplicado), los datos no se borran.
- **Finalizar registro del día y ver auditoría:** cambia la jornada a la fase de auditoría sin borrar nada.

### 3.2. Auditoría de tickets (`/auditoria`)

Revisión completa de la jornada antes de generar el reporte.

![Auditoría de tickets](docs/screenshots/02-auditoria.png)

- **Tarjetas de resumen:** total de carros, motos, tickets perdidos y total recaudado.
- **Búsqueda por número de ticket** (espera de 300 ms): filtra la tabla, pero los totales siempre muestran toda la jornada.
- **Tabla de tickets:** fecha, número, tipo, horario, tiempo, avisos (*Ticket perdido* / *Tarifa noche*), estado (*Sin editar* o *Editado* con su motivo), total y botones **Editar** / **Eliminar**.
- **Generar reporte Excel (.xlsx):** descarga el archivo y lleva a la pantalla de cierre.

### 3.3. Editar horario (modal *Balance de horario*)

![Editar horario](docs/screenshots/03-editar-horario.png)

- Muestra el horario anterior y el cobro actual, y permite indicar la nueva entrada y la nueva salida.
- El **cobro recalculado** se pide al backend mientras se editan las horas.
- **Motivo obligatorio** (mínimo 6 caracteres).
- No permite guardar si el horario no cambió.

### 3.4. Anular boleta (modal)

![Anular boleta](docs/screenshots/04-anular-ticket.png)

- Muestra el número, tipo de vehículo, horario y **monto a descartar**.
- Advierte que la anulación quedará registrada en la hoja *Tickets Eliminados* del Excel.
- **Motivo obligatorio** con las mismas reglas que la edición.

### 3.5. Confirmación de cierre (`/cierre`)

![Confirmación de cierre](docs/screenshots/05-cierre.png)

- Muestra la fecha, los totales, el **total recaudado** y el nombre del archivo descargado (por ejemplo `Reporte_Parqueo_04_11_2026.xlsx`).
- El botón **Confirmar cierre definitivo** solo se habilita cuando el operador marca la casilla que confirma que el Excel se descargó y los montos cuadran con la caja.
- **Volver a auditoría** permite regresar sin cerrar nada (por ejemplo, para volver a descargar el archivo).
- Tras la confirmación del servidor, la aplicación regresa a `/registro` con una jornada vacía.

## 4. Flujo de pantallas protegido por Guards

### 4.1. ¿Qué es un Guard?

Un **Guard** es una función de Angular que se ejecuta **antes de entrar a una ruta** y decide si el usuario puede pasar o si debe ser redirigido a otra pantalla. Funciona como un “guardia de seguridad” en la puerta de cada vista.

En este sistema, los Guards garantizan que el operador siga el orden correcto de la jornada: **no se puede auditar sin haber terminado el registro, ni cerrar sin haber descargado el Excel**, aunque se escriba la ruta directamente en la barra del navegador.

### 4.2. Rutas

| Ruta | Pantalla | Carga | Guard |
|---|---|---|---|
| `/` | Redirige a `/registro` | — | — |
| `/registro` | Registro de tickets | Inmediata | `registroGuard` |
| `/auditoria` | Auditoría de tickets | *Lazy* (bajo demanda) | `auditoriaGuard` |
| `/cierre` | Confirmación de cierre | *Lazy* (bajo demanda) | `cierreGuard` |
| `**` | Cualquier otra ruta → `/registro` | — | — |

> **Carga *lazy*:** las pantallas de auditoría y cierre solo se descargan cuando el operador las necesita, lo que hace que la aplicación inicie más rápido.

### 4.3. Reglas de cada Guard

| Guard | Permite entrar si… | Si no, redirige a |
|---|---|---|
| `registroGuard` | La jornada está vacía o en fase `REGISTRO` | `/auditoria` |
| `auditoriaGuard` | Hay tickets activos **y** la fase en el backend es `AUDITORIA` | `/registro` |
| `cierreGuard` | La fase es `AUDITORIA` **y** ya se generó el reporte Excel | `/registro` o `/auditoria` |

`registroGuard` y `auditoriaGuard` consultan el estado real en el backend (`GET /sol/jornada/estado`) antes de decidir, por lo que siempre respetan la fase guardada en la base de datos.

```text
                ┌─────────────┐  Finalizar registro   ┌──────────────┐  Generar Excel  ┌────────────┐
  Inicio  ───►  │  /registro  │ ────────────────────► │  /auditoria  │ ──────────────► │  /cierre   │
                └─────────────┘                       └──────────────┘                 └─────┬──────┘
                       ▲                                                                    │
                       └──────────────────────── Cierre confirmado ─────────────────────────┘
```

## 5. Manejo de estado con Signals

### 5.1. ¿Qué es un Signal?

Un **Signal** es una variable especial de Angular que **avisa automáticamente a la pantalla cuando su valor cambia**. Si un Signal se actualiza, Angular vuelve a dibujar solo la parte de la vista que lo usa, sin que el programador tenga que hacerlo manualmente.

```ts
// Crear un signal con valor inicial
public cargando = signal<boolean>(true);

// Cambiar su valor
this.cargando.set(false);

// Leerlo en la plantilla HTML
@if (cargando()) { <p>Cargando…</p> }
```

### 5.2. Uso en el proyecto

| Dónde | Signals principales | Para qué |
|---|---|---|
| `JornadaPollingService` | `faseActual`, `estadoJornada`, `jornadaCerradaModalVisible` | Estado global de la jornada compartido por toda la aplicación |
| `ReportesService` | `ultimoReporteDescargado` | Saber si ya se descargó el Excel (lo usa `cierreGuard`) |
| Registro | `cobroCalculado`, `calculandoTarifa` | Vista previa del cobro |
| Auditoría | `tickets`, `resumen`, `cargando`, `ticketParaEditar`, `ticketParaAnular` | Tabla, totales y apertura de modales |
| Modales | `nuevoCosto`, `procesando`, `errorMensaje` | Estado de la corrección o anulación |
| Cierre | `checkConfirmado`, `procesandoCierre` | Habilitar el botón de cierre y evitar envíos repetidos |

Gracias a los Signals, los botones se deshabilitan mientras se procesa una acción, los mensajes de error aparecen al instante y los totales se actualizan solos cuando cambian los datos.

## 6. Sincronización multisesión

El sistema permite que varios operadores trabajen al mismo tiempo (por ejemplo, uno en computadora y otro en tablet). Para que todas las pantallas muestren siempre la misma información, se combinan **tres mecanismos**:

### 6.1. Polling al backend (entre dispositivos)

**Polling** significa “preguntar periódicamente”. El servicio `JornadaPollingService` consulta `GET /sol/jornada/estado` cada **2 segundos** desde que se abre la aplicación.

En cada consulta compara la respuesta con la anterior (número de tickets, fase, fecha, total recaudado, tickets editados y el contador `version`). Según lo que encuentre:

| Lo que detecta | Lo que hace |
|---|---|
| Otro operador registró, editó o anuló un ticket (`version` cambió) | Recarga la tabla y los totales de la auditoría |
| Otro operador finalizó el registro (fase pasó a `AUDITORIA`) | Lleva esta pantalla a `/auditoria` |
| La jornada se quedó sin tickets mientras este operador estaba en auditoría o cierre | Muestra el **modal de Jornada Reiniciada** |

### 6.2. Modal global de *Jornada Reiniciada*

Cuando el operador **A** cierra la jornada, el operador **B** (por ejemplo, en la tablet) podría seguir viendo datos que ya fueron archivados. Para evitarlo:

1. El polling de la pantalla de **B** detecta que los tickets activos bajaron a **0**.
2. Se activa el Signal `jornadaCerradaModalVisible`.
3. El componente raíz (`app.component.ts`) muestra un modal que **cubre toda la pantalla** (`z-100`, fondo oscurecido y desenfocado) con el aviso *“Jornada Reiniciada — El sistema ha sido archivado y cerrado por otro operador”*.
4. El operador **B** no puede seguir trabajando hasta presionar **“Entendido, recargar jornada”**, que recarga la aplicación y lo lleva al registro vacío.

Como el modal vive en el componente raíz, funciona **en cualquier pantalla** en la que se encuentre el operador. El mismo aviso se muestra si la API responde `409` con los códigos `JORNADA_CERRADA` o `JORNADA_YA_CERRADA`.

### 6.3. BroadcastChannel y localStorage (entre pestañas)

Si un mismo operador tiene **varias pestañas abiertas en el mismo navegador**, estas se sincronizan al instante, sin esperar al siguiente polling:

| Mecanismo | Qué comunica |
|---|---|
| **`BroadcastChannel`** (`sol_parqueo_channel`) | Mensajes entre pestañas: `FASE_CAMBIADA` y `TICKETS_MODIFICADOS` |
| **`localStorage`** (`sol_fase_jornada`, `sol_tickets_sync`) | Respaldo para navegadores que no soportan `BroadcastChannel` |

> **`BroadcastChannel`** es una herramienta del navegador que permite enviar mensajes entre pestañas del mismo sitio, como si fuera un “canal de radio” interno.

### 6.4. Resumen

| Mecanismo | Alcance | Velocidad |
|---|---|---|
| Polling (`/sol/jornada/estado`) | Entre **dispositivos distintos** | Cada 2 segundos |
| `BroadcastChannel` + `localStorage` | Entre **pestañas del mismo navegador** | Inmediata |
| Recarga tras cada acción | La **pantalla actual** | Inmediata |

## 7. Manejo de errores y conexión

Todas las peticiones pasan por un **interceptor HTTP** (`basic-auth.interceptor.ts`). Un interceptor es una función que “intercepta” cada petición y cada respuesta, para agregar datos o reaccionar ante errores en un solo lugar.

| Situación | Comportamiento |
|---|---|
| Cualquier petición | Se envía con `withCredentials: true` para incluir las credenciales de Basic Auth |
| Respuesta `409` con `JORNADA_CERRADA` o `JORNADA_YA_CERRADA` | Se muestra el modal de *Jornada Reiniciada* |
| **Pérdida de conexión** (error con estado `0`) | Se muestra una **alerta del navegador** avisando de la pérdida temporal de conexión. El operador **permanece en su pantalla** y no pierde los datos que estaba escribiendo |
| Otros errores (`400`, `404`, `500`) | Cada pantalla muestra el `mensaje` que devuelve el backend |

Además, cuando una operación falla, los datos del formulario se conservan, y el mensaje de éxito solo aparece después de que el servidor confirma la operación.

## 8. Diseño responsivo para tablets

La interfaz está diseñada para usarse cómodamente en **computadora y tablet**.

### 8.1. Adaptación con Tailwind CSS

Tailwind permite cambiar el diseño según el ancho de la pantalla usando prefijos como `sm:`, `md:` y `lg:`:

| Elemento | En tablet / pantallas pequeñas | En computadora |
|---|---|---|
| Tarjetas de resumen | 2 columnas (`grid-cols-2`) | 4 columnas (`md:grid-cols-4`) |
| Encabezado de auditoría | Elementos apilados | Elementos en una fila (`md:flex-row`) |
| Botones del cierre | Ocupan todo el ancho | Tamaño automático (`sm:w-auto`) |
| Márgenes | Reducidos (`px-4`) | Amplios (`sm:px-6`, `lg:px-8`) |

### 8.2. Tabla con scroll horizontal

La tabla de auditoría tiene muchas columnas. En lugar de comprimirlas hasta volverlas ilegibles, la tabla se coloca dentro de un contenedor con **desplazamiento horizontal** (`overflow-x-auto`). En tablets, el operador puede deslizar la tabla con el dedo para ver todas las columnas.

La clase `.tabla-scroll` muestra una **barra de desplazamiento delgada y visible**, para que el operador sepa que hay más contenido a la derecha:

```css
.tabla-scroll {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
}
```

### 8.3. Diseño limpio

- Estilo administrativo: fondo claro, tarjetas blancas, bordes sutiles y textos claros.
- **Colores con significado:** verde para acciones principales, azul para edición y navegación, rojo para anulaciones, errores y cierre.
- Paleta propia definida en `src/styles.css` (`sol-green`, `sol-blue`, `sol-red`, `sol-bg`, `sol-surface`, `sol-border`).
- Etiquetas visibles en todos los campos, errores junto al campo correspondiente y estados indicados con **texto además de color** (por ejemplo *Ticket perdido* o *Editado*).
- Botones con indicador de carga, deshabilitados mientras se procesa una acción.

## 9. Estructura del proyecto

```text
frontend/
├── docs/screenshots/               # Capturas usadas en la documentación
├── public/                         # Recursos estáticos (favicon)
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── guards/             # registro, auditoria y cierre
│   │   │   ├── interceptors/       # basic-auth.interceptor.ts
│   │   │   └── services/           # jornada-polling, reportes, auth
│   │   ├── features/
│   │   │   ├── registro/           # Pantalla de registro + servicio
│   │   │   ├── auditoria/          # Pantalla, servicio y modales
│   │   │   │   └── components/     # balance-modal, anular-modal
│   │   │   └── cierre/             # Pantalla de cierre + servicio
│   │   ├── models/                 # Interfaces TypeScript de la API
│   │   ├── shared/
│   │   │   ├── pipes/              # quetzal, ticket-duration
│   │   │   └── validators/         # Validador del texto de los motivos
│   │   ├── app.component.ts        # Raíz: inicia el polling y contiene el modal global
│   │   ├── app.config.ts           # Router, HttpClient e interceptor
│   │   └── app.routes.ts           # Rutas y Guards
│   ├── environments/               # Configuración de la URL de la API y el polling
│   ├── index.html
│   ├── main.ts
│   └── styles.css                  # Tailwind + paleta de colores
├── proxy.conf.json
├── angular.json
└── package.json
```

La carpeta `core/` contiene lo que se usa en **toda la aplicación** (servicios globales, Guards, interceptor); `features/` agrupa cada **pantalla** con su propio servicio; y `shared/` guarda piezas **reutilizables** (pipes y validadores).

### Validaciones del formulario

| Campo | Regla |
|---|---|
| Fecha de operación | Obligatoria; no puede ser futura |
| Número de ticket | Obligatorio; solo números (máximo 20) |
| Hora de entrada / salida | Obligatorias; la salida debe ser distinta de la entrada |
| Motivo (edición y anulación) | Obligatorio; mínimo 6 caracteres; solo letras (con tildes, `ñ`, `ü`), números, espacios y `. , ; : ( ) # - _ /` |

El backend vuelve a validar todos los datos, por lo que la información siempre se revisa dos veces.

## 10. Configuración y despliegue

### 10.1. URL de la API y frecuencia del polling

Se configuran en `src/environments/environment.ts`:

```ts
export const environment = {
  production: true,
  apiUrl: '/sol',           // Ruta relativa: la API se sirve en el mismo dominio
  pollingIntervalMs: 2000,  // Consultar el estado de la jornada cada 2 segundos
};
```

### 10.2. Proxy de desarrollo

Con `pnpm start`, el archivo `proxy.conf.json` redirige las peticiones `/sol/*` al backend:

```json
{
  "/sol": { "target": "http://localhost:3000", "secure": false, "changeOrigin": true }
}
```

### 10.3. Despliegue en producción

`pnpm build` genera archivos estáticos en `dist/frontend/browser`. En producción, un servidor web (por ejemplo **Nginx**) entrega el frontend y redirige `/sol` hacia el backend:

```nginx
server {
    listen 80;
    server_name parqueo.editorialsol.com;

    root /var/www/parqueo/browser;
    index index.html;

    # API del backend
    location /sol/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Rutas de la SPA (Angular)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

> Se recomienda publicar el sistema con **HTTPS** y registrar el dominio de producción en la variable `CORS_ORIGIN` del backend.
