# Control de Parqueo — Editorial Sol

Sistema web para **digitalizar los tickets físicos del parqueo de Editorial Sol**. Los operadores transcriben las boletas del talonario, el sistema calcula el cobro de forma automática, permite revisar y corregir la jornada, genera un reporte en Excel y guarda todo en un histórico permanente al cerrar el día.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/Licencia-MIT-green)

---

## Tabla de contenido

1. [Visión general del negocio](#1-visión-general-del-negocio)
2. [Funcionalidades principales](#2-funcionalidades-principales)
3. [Capturas de pantalla](#3-capturas-de-pantalla)
4. [Arquitectura del monorepositorio](#4-arquitectura-del-monorepositorio)
5. [Tecnologías utilizadas](#5-tecnologías-utilizadas)
6. [Flujo de una jornada](#6-flujo-de-una-jornada)
7. [Guía rápida de puesta en marcha](#7-guía-rápida-de-puesta-en-marcha)
8. [Trabajo con varios operadores](#8-trabajo-con-varios-operadores)
9. [Documentación detallada](#9-documentación-detallada)
10. [Licencia](#10-licencia)

---

## 1. Visión general del negocio

El parqueo de Editorial Sol entrega a cada vehículo un **ticket físico de talonario** con su hora de entrada y de salida. Antes, al final del día alguien debía revisar cada boleta a mano, calcular cuánto se cobró, cuadrar la caja y guardar un respaldo en papel. Ese proceso era lento y se prestaba a errores de cálculo.

Este sistema reemplaza ese trabajo manual por un proceso digital que:

- **Calcula el cobro** con las tarifas oficiales del parqueo, sin errores humanos.
- **Registra quién corrige qué y por qué**: toda edición o anulación de un ticket exige un motivo.
- Permite que **dos o más operadores trabajen al mismo tiempo** (por ejemplo, uno en computadora y otro en tablet) sobre los mismos datos.
- Genera un **reporte en Excel** y solo archiva la jornada cuando el operador confirma que el archivo se descargó correctamente.
- **Conserva la información** aunque el servidor se reinicie: todo el estado de la jornada vive en la base de datos.

## 2. Funcionalidades principales

| Módulo | Qué permite hacer |
|---|---|
| **Registro de tickets** | Capturar fecha, número de ticket, tipo de vehículo, horas y casos especiales, con vista previa del cobro. |
| **Cálculo automático** | Calcular el tiempo cobrable y la tarifa de carros y motos, con recargos por **tarifa nocturna** y **ticket perdido**. |
| **Auditoría** | Ver los totales del día, buscar tickets por número, **corregir horarios** y **anular tickets** con motivo obligatorio. |
| **Reporte Excel** | Descargar un archivo `.xlsx` con dos hojas: tickets registrados y tickets eliminados. |
| **Cierre de jornada** | Copiar todos los tickets al histórico permanente y dejar el sistema listo para un nuevo día. |
| **Multioperador** | Sincronizar automáticamente las pantallas de todos los operadores conectados. |
| **Seguridad** | Acceso con usuario y contraseña (HTTP Basic Auth) y CORS restringido a los dominios autorizados. |

## 3. Capturas de pantalla

| Registro de tickets | Auditoría de la jornada |
|---|---|
| ![Registro de tickets](frontend/docs/screenshots/01-registro.png) | ![Auditoría de tickets](frontend/docs/screenshots/02-auditoria.png) |

> El recorrido completo de pantallas se encuentra en el [README del frontend](frontend/README.md#3-vistas-de-la-aplicación).

## 4. Arquitectura del monorepositorio

El proyecto está organizado como un **monorepositorio**: un solo repositorio de Git que contiene dos proyectos independientes, cada uno con sus propias dependencias administradas con **pnpm**.

```text
control-parqueo-editorial-sol/
├── backend/                 # API REST (Node.js + Express + TypeScript + MySQL)
│   ├── src/
│   │   ├── script.sql       # Script que crea la base de datos y sus tablas
│   │   └── ...
│   ├── .env.example         # Plantilla de variables de entorno
│   └── README.md            # Documentación del backend
├── frontend/                # Aplicación web (Angular 22 + Tailwind CSS 4)
│   ├── src/
│   ├── docs/screenshots/    # Capturas usadas en la documentación
│   └── README.md            # Documentación del frontend
├── LICENSE                  # Licencia MIT
└── README.md                # Este archivo
```

### ¿Cómo se comunican las partes?

```text
 ┌────────────────────┐        ┌────────────────────┐
 │  Operador 1 (PC)   │        │ Operador 2 (Tablet)│
 └─────────┬──────────┘        └─────────┬──────────┘
           │                             │
           └──────────────┬──────────────┘
                          ▼
              ┌───────────────────────┐
              │  Frontend (Angular)   │   Pantallas, validaciones
              │  Rutas /registro,     │   y sincronización
              │  /auditoria, /cierre  │
              └───────────┬───────────┘
                          │  Peticiones HTTP a /sol/*  (Basic Auth)
                          ▼
              ┌───────────────────────┐
              │  Backend (Express)    │   Reglas de negocio, cálculos,
              │  API REST             │   reporte Excel y cierre
              └───────────┬───────────┘
                          │  mysql2
                          ▼
              ┌───────────────────────┐
              │  MySQL 8              │   Tickets activos, anulados,
              │  control_parqueo_sol  │   histórico y estado de jornada
              └───────────────────────┘
```

**Principios de diseño:**

- El **backend es la fuente de verdad**: valida los datos, calcula los cobros y guarda el estado de la jornada. El frontend nunca decide un importe por su cuenta.
- La **base de datos guarda todo**, incluida la fase de la jornada (`REGISTRO` o `AUDITORIA`). Si el servidor se apaga y se vuelve a encender, el sistema continúa exactamente donde se quedó.
- El **frontend** se encarga de la experiencia del operador: formularios, avisos, navegación protegida y sincronización entre pantallas.

## 5. Tecnologías utilizadas

| Capa | Tecnología | Para qué se usa |
|---|---|---|
| Backend | **Node.js** + **Express 5** | Servidor web y API REST |
| Backend | **TypeScript** (modo `strict`) | Código con tipos, más fácil de mantener |
| Backend | **MySQL 8** + `mysql2` | Base de datos y conexión desde Node.js |
| Backend | **ExcelJS** | Generación del reporte `.xlsx` |
| Backend | **cors** + **dotenv** | Seguridad de orígenes y variables de entorno |
| Frontend | **Angular 22** (componentes *standalone*) | Aplicación web de una sola página (SPA) |
| Frontend | **Signals** + **RxJS** | Estado reactivo de las pantallas y consultas periódicas |
| Frontend | **Tailwind CSS 4** | Estilos y diseño adaptable a PC y tablet |
| General | **pnpm** | Gestor de paquetes |
| General | **Git / GitHub** | Control de versiones |

## 6. Flujo de una jornada

La jornada de trabajo se divide en **tres etapas**, y cada una corresponde a una pantalla del sistema:

```text
  ① REGISTRO  ──►  ② AUDITORÍA  ──►  ③ CIERRE  ──►  Histórico permanente
  (captura)        (revisión y        (confirmar        + nueva jornada vacía
                    reporte Excel)     descarga)
```

1. **Registro:** los operadores capturan los tickets del día. Al terminar, presionan *Finalizar registro del día*, y la jornada pasa a la fase de auditoría (no se borra nada).
2. **Auditoría:** se revisan los tickets, se corrigen horarios o se anulan tickets (siempre con motivo). Al final se genera el **reporte Excel**.
3. **Cierre:** el operador confirma que el Excel se descargó y que los montos cuadran con la caja. Al confirmar, todos los tickets pasan al **histórico permanente** y el sistema queda listo para un nuevo día.

> Ni *Finalizar registro* ni *Generar Excel* cierran la jornada. Solo la **confirmación de cierre** archiva y vacía los tickets activos.

## 7. Guía rápida de puesta en marcha

### Requisitos previos

- **Node.js** 18 o superior (se recomienda la versión LTS más reciente compatible con Angular 22).
- **pnpm** instalado de forma global (`npm install -g pnpm`).
- **MySQL 8.0** o superior.

### Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/josecoy-2025161/control-parqueo-editorial-sol.git
cd control-parqueo-editorial-sol
```

### Paso 2 — Crear la base de datos

```bash
mysql -u <usuario> -p < backend/src/script.sql
```

El script crea la base `control_parqueo_sol` con sus **cuatro tablas** y el registro inicial de configuración de la jornada.

### Paso 3 — Configurar y levantar el backend

```bash
cd backend
cp .env.example .env
pnpm install
pnpm dev
```

Antes de ejecutar `pnpm dev`, abre el archivo `.env` y completa al menos `DB_USER`, `DB_PASSWORD`, `AUTH_USER` y `AUTH_PASS`. El servidor queda disponible en `http://localhost:3000`.

### Paso 4 — Levantar el frontend (en otra terminal)

```bash
cd frontend
pnpm install
pnpm start
```

La aplicación queda disponible en `http://localhost:4200`. En desarrollo, un *proxy* redirige automáticamente las peticiones `/sol/*` hacia el backend.

### Paso 5 — Ingresar al sistema

Abre <http://localhost:4200> en el navegador. Se mostrará un cuadro de inicio de sesión: ingresa el usuario y la contraseña definidos en `AUTH_USER` y `AUTH_PASS`.

### Variables de entorno del backend

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `DB_HOST` | Servidor de MySQL | `localhost` |
| `DB_PORT` | Puerto de MySQL | `3306` |
| `DB_USER` | Usuario de MySQL | `parqueo_app` |
| `DB_PASSWORD` | Contraseña de MySQL | — |
| `DB_NAME` | Nombre de la base de datos | `control_parqueo_sol` |
| `AUTH_USER` | Usuario compartido de los operadores | — |
| `AUTH_PASS` | Contraseña compartida de los operadores | — |
| `CORS_ORIGIN` | Dominio de producción autorizado | `https://parqueo.editorialsol.com` |

> 🔐 **Importante:** nunca subas el archivo `.env` al repositorio (ya está incluido en `.gitignore`) y define siempre credenciales propias en `AUTH_USER` y `AUTH_PASS`.

## 8. Trabajo con varios operadores

El sistema está pensado para que varios operadores trabajen al mismo tiempo sin pisarse:

- **Estado guardado en la base de datos:** la fase de la jornada y un contador de cambios (`version`) se guardan en la tabla `configuracion_jornada`. Todos los operadores leen siempre el mismo estado, y este sobrevive a reinicios del servidor.
- **Actualización automática:** cada pantalla consulta el estado de la jornada cada **2 segundos**. Si otro operador registra, corrige o anula un ticket, la información se refresca sola.
- **Aviso de jornada reiniciada:** si un operador cierra la jornada, las demás pantallas muestran un aviso que bloquea la vista e invita a recargar hacia un registro vacío. Así nadie sigue trabajando sobre datos que ya fueron archivados.
- **Tickets únicos:** la base de datos impide registrar dos veces el mismo número de ticket en la jornada activa.
- **Operaciones seguras:** anular un ticket y cerrar la jornada se hacen como **transacciones** (todo o nada): si algo falla a la mitad, no se pierde ningún dato.
- **Tolerancia a fallas de red:** si se pierde la conexión por un momento, el operador recibe un aviso y permanece en su pantalla sin perder lo que estaba escribiendo.

## 9. Documentación detallada

| Documento | Contenido |
|---|---|
| [`backend/README.md`](backend/README.md) | Reglas de negocio, estructura de la base de datos, endpoints REST, cierre transaccional y configuración |
| [`frontend/README.md`](frontend/README.md) | Pantallas, guards, Signals, sincronización entre operadores y diseño responsivo |

## 10. Licencia

Distribuido bajo la licencia **MIT**. Consulta el archivo [`LICENSE`](LICENSE) para más información.
