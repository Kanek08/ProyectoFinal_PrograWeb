# Plan · CRM CompuPartes Xela

Proyecto final de Programación Web · Universidad Mesoamericana · 2026
Pareja: Keneth López y Jaime Orozco · Agente: Claude Code

Este plan dice **cómo** se construye lo que describe [`especificacion.md`](especificacion.md): la arquitectura, la estructura del repositorio, las fases con sus tareas y responsables, y qué se le pidió al agente en cada fase. Se actualiza antes de empezar cada fase; la columna «Estado» refleja el avance real.

Última actualización: 2026-11-08 (antes de la fase 6).

---

## 1. Arquitectura

```
 Navegador                                   Servidores                         Base
┌──────────────────────────┐   HTML + cookie   ┌───────────────────────┐ Eloquent ┌─────────────────────┐
│ Panel (Blade)            │ ────────────────► │ Laravel 13 + Breeze   │ ───────► │ MySQL 8.4           │
│ administrador, jefe      │ ◄──────────────── │ :8000                 │          │ crm_computadoras    │
└──────────────────────────┘                   │ dueño del esquema     │          │                     │
                                               │ y de las cuentas      │          │ users, productos,   │
┌──────────────────────────┐   JSON + Bearer   ├───────────────────────┤ SQL con ? │ clientes,           │
│ SPA (frontend/)          │ ────────────────► │ API Express 5         │ ───────► │ oportunidades,      │
│ asesor de ventas         │ ◄──────────────── │ :3000/api             │  mysql2  │ oportunidad_        │
│ LocalStorage: solo token │   CORS: origen    │ JWT HS256, bcryptjs   │          │ productos,          │
└──────────────────────────┘   exacto :5500    │ nunca CREATE ni ALTER │          │ historial_etapas,   │
                                               └───────────────────────┘          │ actividades         │
                                                                                  └─────────────────────┘
```

| Decisión de arquitectura | Por qué |
|---|---|
| Una sola base para las dos puertas | La prueba central del proyecto: lo que el jefe asigna en el panel aparece en la SPA y lo que el asesor vende en la SPA aparece en el reporte del panel. |
| Solo Laravel crea o cambia tablas (migraciones nuevas, nunca editar las existentes) | Un único historial versionado del esquema; la API solo lee y escribe filas. |
| Solo el panel crea cuentas y genera hashes | Centraliza roles y contraseñas (S1); la API solo verifica con bcryptjs. |
| Las reglas también viven en la base (FK, UNIQUE, CHECK) | Dos aplicaciones escriben en las mismas tablas: una regla que solo vive en una no protege nada. |
| Sin triggers ni procedimientos almacenados | Con el registro binario de MySQL 8.4 exigen SUPER y rompen `migrate:fresh` (bitácora, caso 1). |
| Concurrencia con transacción + `SELECT ... FOR UPDATE`, siempre en el orden users → clientes → oportunidades | Toma de clientes, cartera máxima y cambio de etapa aguantan peticiones simultáneas (S8) sin bloqueos mutuos entre panel y API. |
| SPA sin framework: estado único → `render()`, un listener por evento en `#app`, plantilla `html` que escapa todo | Lo pide el enunciado (F6); la plantilla hace imposible olvidar escapar un dato de la API (S7). |

## 2. Estructura del repositorio

```
ProyectoFinal_PrograWeb/
├── README.md                 cómo levantar las tres piezas, endpoints, cuentas
├── CLAUDE.md                 reglas para el agente (P4)
├── docs/
│   ├── especificacion.md     P1 (etiqueta spec-v1)
│   ├── plan.md               P2 (este archivo)
│   ├── verificacion.md       P3 y bitácora de IA (P5)
│   ├── continuacion.md       traspaso del trabajo entre los integrantes
│   └── api.postman_collection.json
├── laravel/                  panel: app/, database/migrations, database/seeders, resources/views, tests/
├── api/                      src/ (app, db, middleware, rutas, util, validacion), scripts/ de verificación, test/
└── frontend/                 index.html, css/, js/ (main, estado, api, utilidades, etiquetas, vistas/)
```

## 3. Fases y tareas

| Fase | Tarea | Responsable | Estado | Evidencia |
|---|---|---|---|---|
| 0 · Entorno | PHP 8.3+, Composer, MySQL 8.4 (no MariaDB), Node 24; base `crm_computadoras` y usuario `crm` | Ambos, cada uno en su máquina | Hecho | `php artisan db:show` → MySQL 8.4 |
| 1 · Especificación | Sector, regla propia RS-1, requisitos con criterios Dado/Cuando/Entonces, contrato, modelo de datos, decisiones D1–D6 | Keneth | Hecho (sin etiqueta `spec-v1` separada, ver sección 5) | `docs/especificacion.md` |
| 1 · Especificación | Archivo de reglas del agente | Keneth | Hecho | `CLAUDE.md` |
| 2 · Panel | L1 migraciones y semillas (verificación y sector) | Keneth | Hecho | `verificacion.md` §1–3 |
| 2 · Panel | L2 cuentas y roles con Breeze; L3 catálogo | Keneth | Hecho | `verificacion.md` §2 |
| 2 · Panel | L4–L5 clientes, asignación con D2/D3, equipos y visibilidad | Keneth | Hecho | `verificacion.md` §2 |
| 2 · Panel | L6 cotizaciones (solo lectura) y reportes; L7 validación y pruebas unitarias | Keneth | Hecho | 24 pruebas de `php artisan test` |
| 3 · API base | A1 inicio de sesión JWT, A2 middleware, A3 clientes y cartera, A7 errores JSON | Keneth | Hecho | `verificar-a1-a3.mjs` (44/44) |
| 4 · API | A4 cotizaciones, productos, etapas (D1) y RS-1 | Jaime | Hecho | `verificar-a4.mjs` (62/62; 65/65 con las dos semillas) |
| 4 · API | A5 seguimientos | Jaime | Hecho | `verificar-a5.mjs` (37/37) |
| 4 · API | A6 resumen del mes | Jaime | Hecho | `verificar-a6.mjs` (21/21) |
| 4 · API | A8 README de la API y colección de Postman | Jaime | Hecho | newman: 152/152 con `--seed` |
| 5 · SPA | F1 sesión, F2 cartera | Jaime | Hecho | `verificacion.md` §7 |
| 5 · SPA | F3 embudo y detalle, F4 seguimientos, F5 resumen, F6 calidad | Jaime | Hecho | `verificacion.md` §7 |
| 6 · Verificación | Prueba central panel ↔ SPA, seguridad en la SPA, matriz de A4–F6, este plan | Jaime | Hecho | `verificacion.md` §6–8 |
| 6 · Verificación | Revisar la verificación completa y la bitácora; completar los commits pendientes de los casos 1–3 | Keneth | Pendiente | — |
| 7 · Cambio de requisito | Cuando el catedrático lo publique: actualizar la especificación (`spec-v2`), planificarlo aquí e implementarlo con migraciones nuevas | Ambos | Pendiente (sin publicar) | — |
| 8 · Entrega | Unir las ramas en `main` | Jaime | Hecho | merge `98cf489` |
| 8 · Entrega | Comprobar todo en `main`, etiqueta `entrega-final`, enviar enlace y `git rev-parse entrega-final` | Ambos | Pendiente | — |
| 8 · Defensa | Ensayar con la base solo con la semilla de verificación, Postman abierto y el repositorio en `entrega-final`; cada uno explica todo el código | Ambos | Pendiente | — |

## 4. Qué se le pidió al agente en cada fase

El agente siempre recibió el enunciado, `CLAUDE.md` y `docs/especificacion.md` antes de escribir código, con la instrucción de preguntar si algo no estaba especificado.

| Fase | Pedido al agente | Lo que revisamos nosotros |
|---|---|---|
| 0 | Revisar el entorno e instalar lo que faltara (PHP, Composer, MySQL 8.4), preparar los `.env` y comprobar que el panel y la API pasan sus pruebas. La contraseña de root de MySQL la puso cada integrante. | Que `db:show` diga MySQL 8.4 y no MariaDB (bitácora, caso 4). |
| 1 | Leer el enunciado y proponer la especificación: sector, regla propia con alternativas descartadas, criterios verificables, contrato y modelo de datos con dónde se cumple cada regla. | Que la regla propia no cambie las cifras de control; elegimos RS-1 entre las alternativas. |
| 2 | Implementar L1–L7 en orden, con migraciones y CHECK, `VerificacionSeeder` exacto y `SectorSeeder`; comprobar las cifras de control en la página de reportes. | Las cifras de control y los mensajes de cada criterio (bitácora, casos 1–3). |
| 3 | Implementar A1–A3 con SQL a mano, el mismo orden de bloqueo que el panel y un script que pruebe las peticiones simultáneas. | Que el script cubra S8 y que la validación de NIT y teléfono sea idéntica a la del panel (caso 5). |
| 4 | «Sigue con A4/A5/A6/A8»: implementar cada requisito siguiendo `docs/continuacion.md`, con un script de verificación por requisito, y commits pequeños con mensajes cortos. | Correr los scripts con la semilla recién cargada; revisar las decisiones menores que tomó el agente (números JSON estrictos, títulos recortados). |
| 5 | Construir la SPA (F1–F6) sin framework y probarla en el navegador: errores por campo, 409, 401, API apagada, S7 con `<img src=x onerror=alert(1)>`, 375 px. | La prueba central y el formato de montos (caso 7). |
| 6 | Escribir este plan y completar `verificacion.md` con evidencia real de A4–F6. | Que cada fila tenga una evidencia que se pueda repetir. |

## 5. Pendientes y riesgos

| Tema | Qué hacer | Responsable |
|---|---|---|
| Etiqueta `spec-v1` | **Decidido: se deja así.** El commit `p1` trae la especificación y el panel juntos; no se reescribe el historial compartido. En la defensa se explica que la especificación se escribió primero y se subió junto con el panel en el mismo commit. | Ambos |
| Ramas | `api-oportunidades` (A4–A8) y `spa-asesor` (F1–F6) ya están unidas en `main`. | Hecho |
| Cambio de requisito | Sin publicar todavía. Cuando llegue: primero la especificación (`spec-v2`), luego este plan, luego migraciones nuevas. | Ambos |
| `api/package-lock.json` | `npm install` lo cambió en una máquina; no subirlo sin revisar. | Jaime |
| Defensa | Cada uno debe poder explicar `clientes.js`, `oportunidades.js` y `AsignacionClientes.php` (orden de bloqueo) y la plantilla `html` de la SPA. | Ambos |
