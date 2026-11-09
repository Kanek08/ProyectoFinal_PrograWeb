# Continuación del proyecto · traspaso a Jaime (y a su agente)

Este documento explica **qué está hecho, cómo levantarlo y qué falta**, con el detalle suficiente para que otra persona (o su agente de IA) siga el trabajo sin repetir decisiones. Léelo junto con:

1. **El enunciado del catedrático** — manda siempre.
2. [`docs/especificacion.md`](especificacion.md) — nuestra especificación: contrato, criterios Dado/Cuando/Entonces y decisiones D1–D6. **Todo lo que falta ya está especificado ahí.**
3. [`CLAUDE.md`](../CLAUDE.md) — reglas que cualquier agente debe respetar.
4. [`docs/verificacion.md`](verificacion.md) — evidencia de lo ya probado y la bitácora de IA.

> **Para el agente:** antes de escribir código, lee completos `CLAUDE.md` y `docs/especificacion.md`. Si algo no está en la especificación, pregunta al usuario; no decidas por tu cuenta. Cada vez que te equivoques y el usuario lo detecte, agrega el caso a la «Bitácora de IA» de `docs/verificacion.md`.

---

## 1. Estado al 2026-11-08

| Código | Qué es | Estado | Dónde |
|---|---|---|---|
| P1 | Especificación | **Hecho** (falta la etiqueta `spec-v1`, ver sección 6) | `docs/especificacion.md` |
| P4 | Archivo del agente | **Hecho** | `CLAUDE.md` |
| L1–L7 | Panel Laravel completo | **Hecho y verificado** | `laravel/` |
| A1 | Inicio de sesión con JWT | **Hecho y verificado** | `api/src/rutas/auth.js` |
| A2 | Middleware de autenticación | **Hecho y verificado** | `api/src/middleware/auth.js` |
| A3 | Clientes y cartera (con concurrencia) | **Hecho y verificado** | `api/src/rutas/clientes.js` |
| — | `GET /productos` | **Hecho** | `api/src/rutas/productos.js` |
| A7 | Errores en JSON (400/404/500) | **Base hecha**; aplicarla en las rutas nuevas | `api/src/middleware/errores.js`, `api/src/util/http.js` |
| A4 | Oportunidades, productos, etapas y RS-1 | **Pendiente** | — |
| A5 | Actividades | **Pendiente** | — |
| A6 | Resumen del mes | **Pendiente** | — |
| A8 | README de la API + colección de Postman | **Pendiente** | — |
| F1–F6 | SPA del asesor | **Pendiente** | `frontend/` (no existe) |
| P2 | `docs/plan.md` | **Pendiente** | — |
| P3/P5 | Verificación de API y SPA, bitácora ≥ 3 casos | **Parcial** (la bitácora ya tiene 5 casos) | `docs/verificacion.md` |

Con la semilla de verificación, el panel ya muestra **todas las cifras de control** y la API ya pasa 44 comprobaciones de A1–A3, incluidas las de peticiones simultáneas.

---

## 2. Levantar todo en tu máquina

### Requisitos
PHP 8.3+ (con `pdo_mysql`, `mbstring`, `intl`, `zip`), Composer, **MySQL 8.4** (no MariaDB), Node.js 24.

> **Trampa que ya nos pasó:** si tienes XAMPP, su MariaDB también escucha en el puerto 3306 y Laravel se conecta a ella sin avisar. Detén el MySQL de XAMPP y confirma con `php artisan db:show` que diga **MySQL 8.4**.

### Pasos
1. Base de datos y usuario `crm`: ver el [README](../README.md#1-base-de-datos).
2. Panel:
   ```bash
   cd laravel
   composer install && npm install && npm run build
   cp .env.example .env        # DB_PASSWORD
   php artisan key:generate
   php artisan migrate:fresh --seeder=VerificacionSeeder
   php artisan serve           # http://127.0.0.1:8000
   ```
3. API:
   ```bash
   cd api
   npm install
   cp .env.example .env        # DB_PASSWORD y un JWT_SECRET aleatorio (el comando está en el archivo)
   npm run dev                 # http://localhost:3000/api (se reinicia al guardar)
   npm test                    # 22 pruebas de NIT y teléfono (los mismos casos que Laravel)
   ```
4. Comprobar A1–A3 (con la API corriendo y **solo** la semilla de verificación cargada):
   ```bash
   # Git Bash
   cd api
   CLAVE_SEMILLA=<contraseña pública del README> node --env-file=.env scripts/verificar-a1-a3.mjs
   ```
   ```powershell
   # PowerShell (la sintaxis VARIABLE=valor de bash no funciona aquí)
   cd api
   $env:CLAVE_SEMILLA = "<contraseña pública del README>"
   node --env-file=.env scripts/verificar-a1-a3.mjs
   ```
   El script modifica datos: después vuelve a correr `php artisan migrate:fresh --seeder=VerificacionSeeder`.

---

## 3. Cómo está construida la API (úsalo igual en lo que falta)

```
api/
├── .env.example            variables (nunca subas .env)
├── package.json            type: module; scripts dev, start, test (sin dotenv: Node 24 usa --env-file)
├── scripts/verificar-a1-a3.mjs
├── test/identidad.test.js  node:test
└── src/
    ├── server.js           valida la configuración (JWT_SECRET ≥ 32, CORS_ORIGIN ≠ *) y arranca
    ├── app.js              cors → express.json → /api/auth → autenticar → rutas → 404 → errores
    ├── db.js               pool mysql2 (decimalNumbers: true, timezone: 'Z') + enTransaccion(fn)
    ├── middleware/
    │   ├── auth.js         verifica JWT HS256 y RELEE al usuario en cada petición → req.usuario
    │   └── errores.js      400 JSON mal formado, 404 de ruta, errores esperados, 500 genérico
    ├── util/http.js        errorHttp(status, msg), errores422({campo: msg}), exigirCuerpo(req),
    │                       idDeRuta(valor) (no numérico → 404), MAXIMO_CARTERA
    ├── validacion/identidad.js   NIT, teléfono, nitVisible (misma lógica que Laravel)
    └── rutas/
        ├── auth.js         POST /login
        ├── productos.js    GET /
        └── clientes.js     GET /, GET /disponibles, POST /, POST /:id/tomar, GET /:id, PATCH /:id
```

**Convenciones que ya siguen las rutas hechas:**
- Express 5 captura los errores de funciones `async`: basta con `throw errorHttp(409, '...')` o `throw errores422({...})`.
- Toda consulta lleva `?` y un arreglo de parámetros. Nunca concatenes datos del usuario. Los únicos fragmentos dinámicos de SQL salen de listas fijas del código (ver el `PATCH /clientes/:id`).
- El dueño **siempre** es `req.usuario.id`; lo ajeno se filtra en el `WHERE` y responde **404**.
- Primero se valida (422), después se revisa el estado (409).
- Los campos que el contrato no lista se ignoran (decisión D5): lee solo los campos permitidos del cuerpo.
- Respuestas sin `vendedor_id`, `user_id`, `supervisor_id` ni `password` (R8).
- Para cambios que deben ser atómicos usa `enTransaccion(async (cx) => { ... })` y `SELECT ... FOR UPDATE`.
- **Orden de bloqueo:** primero la fila de `users` del asesor, luego `clientes`, luego `oportunidades`. El panel usa el mismo orden; cambiarlo puede provocar bloqueos mutuos (deadlocks).
- Mensajes en español, tratando de usted.

**Esquema:** la API **nunca** crea ni altera tablas. Si necesitas una columna nueva, se agrega con una migración **nueva** en `laravel/database/migrations/` (nunca edites una que ya está en Git).

---

## 4. Lo que falta, en orden sugerido

### 4.1 A4 · Oportunidades (`api/src/rutas/oportunidades.js`)

Contrato en la sección 5 de la especificación. Puntos que no se pueden olvidar:

| Endpoint | Detalle |
|---|---|
| `GET /oportunidades?etapa=` | Resumen de **sus** oportunidades: `{ id, cliente: {id, nombre}, titulo, etapa, probabilidad, total, fecha_cierre }`. `etapa` que no existe → **400**. |
| `POST /oportunidades {cliente_id, titulo}` | El cliente debe estar en **su** cartera; si no → **422** `errores.cliente_id` (el contrato no lista 404 aquí). Nace en `prospecto`. En la **misma transacción**, `INSERT` en `historial_etapas` con `etapa_anterior = NULL`. Responde 201 con el **detalle**. |
| `GET /oportunidades/:id` | Detalle (forma en la especificación 5.1): productos con `id` de la línea, `producto_id`, `nombre`, `cantidad`, `precio_unitario`, `subtotal`; `historial` con `usuario` (nombre) y `fecha`. |
| `PATCH /oportunidades/:id {titulo}` | Cerrada → 409. Título vacío o > 150 → 422. |
| `PATCH /oportunidades/:id/etapa {etapa, motivo_perdida}` | Ver la tabla D1 abajo. Transacción con `SELECT ... FOR UPDATE` sobre la oportunidad; `UPDATE` + `INSERT` en el historial; `fecha_cierre = UTC_TIMESTAMP()` al ganar o perder. |
| `POST /oportunidades/:id/productos {producto_id, cantidad}` | El precio se copia del catálogo **en el INSERT** (`INSERT ... SELECT precio FROM productos WHERE id = ? AND activo = 1`). Nunca leas `precio_unitario` del cuerpo. Producto inactivo o inexistente → 422; ya presente → 409 (captura `ER_DUP_ENTRY`); cantidad no entera o fuera de 1–999 → 422. 201 con el detalle. |
| `PATCH /oportunidades/:id/productos/:lineaId {cantidad}` | La línea debe ser de esa oportunidad (si no → 404). |
| `DELETE /oportunidades/:id/productos/:lineaId` | 204 sin cuerpo. |

**Transiciones permitidas (decisión D1):**

| Desde | Puede ir a |
|---|---|
| prospecto | calificado, perdida |
| calificado | propuesta, prospecto, perdida |
| propuesta | negociacion, calificado, perdida |
| negociacion | ganada, propuesta, perdida |
| ganada / perdida | nada → **409** (cerrada) |

Cualquier otra (incluida la misma etapa) → **422** `errores.etapa`. Ganar sin productos → 422 `errores.etapa`. Perder sin motivo, o con más de 255 caracteres tras `trim()` → 422 `errores.motivo_perdida`. `motivo_perdida` solo se guarda al perder.

**Regla propia RS-1** (sección 2 de la especificación), dentro de la transacción del cambio de etapa y antes del `UPDATE`:

```sql
SELECT COALESCE(SUM(CASE WHEN p.categoria = 'equipo'   THEN l.cantidad END), 0) AS equipos,
       COALESCE(SUM(CASE WHEN p.categoria = 'garantia' THEN l.cantidad END), 0) AS garantias
  FROM oportunidad_productos l JOIN productos p ON p.id = l.producto_id
 WHERE l.oportunidad_id = ?
```

Si `equipos > garantias` → **409** `{ "error": "Cada equipo necesita su garantía: hay N equipos y M garantías." }`. Con la semilla de verificación nunca se activa (categorías NULL). Para probarla, carga `php artisan migrate:fresh --seed` e inicia sesión como `andres@compupartes.test`: su cotización «Renovación de PCs del café» tiene 4 equipos y 2 garantías y está en negociación.

**No hay trigger en la base para RS-1** a propósito (bitácora, caso 1): la regla vive solo en la API.

### 4.2 A5 · Actividades (`api/src/rutas/actividades.js`)

- `POST /clientes/:id/actividades {tipo, descripcion, vence_en}`: cliente de su cartera (si no → 404). `tipo` ∈ llamada, reunion, tarea; `descripcion` 1–500. `vence_en` opcional; si viene, **debe** traer zona horaria. Expresión sugerida: `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/`; sin zona (`2026-12-01T10:00`) → 422. Con mysql2 en `timezone: 'Z'`, un `Date` se guarda en UTC.
- `GET /actividades?estado=pendiente|completada`: las de los clientes **de su cartera** (no las que él registró). Otro `estado` → 400.
- `PATCH /actividades/:id {completada}`: booleano estricto (si no → 422).
- Forma: `{ id, cliente: {id, nombre}, tipo, descripcion, vence_en, completada, vencida }`; `vencida = !completada && vence_en !== null && vence_en < ahora`, calculada al responder.

### 4.3 A6 · Resumen del mes (`api/src/rutas/reportes.js`)

- `GET /reportes/resumen?mes=AAAA-MM`; sin `mes`, el mes actual de Guatemala; formato inválido (`2026-13`, `octubre`) → 400.
- Rango UTC del mes de Guatemala: `[AAAA-MM-01 06:00:00, primer día del mes siguiente 06:00:00)`.
- Ventas y total: oportunidades `ganada` del asesor con `fecha_cierre` en ese rango; total = `SUM(cantidad * precio_unitario)` de las líneas (precio **guardado**, no el del catálogo).
- Pronóstico: `ROUND(SUM(total × probabilidad), 2)` de **todas** sus abiertas, sin filtro de mes; redondea solo al final.
- Respuesta: `{ mes, ventas, total, pronostico, cartera: { clientes, maximo: 10 } }` con **números**.
- Cifras que debe dar (sección 7 de la especificación): Valeria 2026-10 → `{ ventas: 2, total: 9250, pronostico: 2512.88, cartera: { clientes: 3 } }`; 2026-11 → `1, 3600, 2512.88`; Diego 2026-10 → `1, 6000, 112.5`; Carlos 2026-10 → `1, 7200, 4125.75, 9`.
- El panel ya tiene la misma lógica con el constructor de consultas en `laravel/app/Services/Reportes.php`: úsala como referencia.

### 4.4 A8 · Documentación de la API
- Tabla de endpoints y pasos de la API en el `README.md` (ya hay una sección «3. API y 4. SPA» pendiente).
- `docs/api.postman_collection.json`: variables `base` y `token`; script que guarda el token al iniciar sesión; carpetas Auth · Productos · Clientes · Actividades · Oportunidades · Reportes · Errores · Seguridad · Regla propia; al menos una petición por endpoint, los errores 400/401/403/404/409/422 y RS-1 (aceptado y rechazado).
- Haz un script de concurrencia para A4 (dos cambios de etapa simultáneos → un solo registro nuevo en `historial_etapas`), copiando el estilo de `scripts/verificar-a1-a3.mjs`.

### 4.5 F1–F6 · SPA (`frontend/`)
Estructura sugerida: `index.html` (Bootstrap 5.3 por CDN, `<main id="app">`), `css/estilos.css`, `js/main.js` (enrutador por hash), `js/api.js` (fetch con token, manejo de 401, indicador de carga, mensaje si la API está apagada), `js/estado.js` (estado único + `render()`), `js/utilidades.js` (`escapar`, `formatoQ`, `fechaGT`, `aIsoConZona`), `js/etiquetas.js` (vocabulario: copiar de `laravel/lang/es/crm.php`), `js/vistas/*.js`.

Obligatorio:
- LocalStorage **solo** guarda el token.
- Escapa **todo** texto de la API antes de usar `innerHTML`; prueba con el cliente `<img src=x onerror=alert(1)>` (S7).
- Fechas con `Intl.DateTimeFormat('es-GT', { timeZone: 'America/Guatemala' })`; montos con `Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' })`.
- `datetime-local` da `2026-12-01T10:00` sin zona → envía `2026-12-01T10:00:00-06:00`.
- Patrón estado → render y delegación de eventos (un solo listener en `#app`).
- Usable a 375 px sin desplazamiento horizontal.
- Sirve la SPA **exactamente** en el origen de `CORS_ORIGIN` (`http://127.0.0.1:5500`, no `localhost:5500`).
- Botones de etapa según la tabla D1.

### 4.6 Proceso
- `docs/plan.md` (P2): arquitectura, fases, tareas con responsable y qué se le pidió al agente en cada fase.
- `docs/verificacion.md`: agrega las secciones de A4–A8 y F1–F6, las cifras de control obtenidas **desde la API**, las pruebas de seguridad S4/S6/S7/S8 en la SPA, y completa los commits de la bitácora (hoy dicen «pendiente»).
- Prueba central del proyecto: un cliente que el jefe de tienda asigna en el panel aparece en la cartera del asesor en la SPA, y una venta ganada en la SPA aparece en el reporte del panel.

---

## 5. Datos útiles

**Cuentas de la semilla de verificación** (contraseña pública en el README): `admin@crm.test` (admin), `sergio@crm.test` y `sandra@crm.test` (jefes de tienda), `valeria@`, `diego@`, `carlos@crm.test` (asesores; Carlos tiene 9 de 10), `ivan@crm.test` (asesor desactivado).

**Semilla del sector** (`php artisan migrate:fresh --seed`): jefa `monica@compupartes.test`; asesores `andres@`, `lucia@`, `kevin@compupartes.test`; catálogo de computadoras y piezas con categorías; cotizaciones en todas las etapas.

**Ids con solo la semilla de verificación:** usuarios 1 Alicia, 2 Sergio, 3 Sandra, 4 Valeria, 5 Diego, 6 Carlos, 7 Iván. Productos 1 Plan básico … 5 Licencia anterior (inactivo). Oportunidades 1–11 en el orden del enunciado.

**Problemas típicos:**
- La API devuelve `"9250.00"` entre comillas → falta `decimalNumbers: true` (ya está en `db.js`).
- Fechas corridas 6 horas → falta `timezone: 'Z'` (ya está).
- Valeria con Q5,650.00 en octubre → se agrupó por mes UTC en vez de Guatemala.
- Valeria con Q9,551.00 → se multiplicó por el precio del catálogo en vez del de la línea.
- El inicio de sesión siempre falla → se instaló `bcrypt` en lugar de `bcryptjs`.

---

## 6. Avisos importantes para la entrega

1. **Etiqueta `spec-v1`.** El enunciado pide que el historial muestre la especificación etiquetada **antes** del código. Hoy el commit `p1` trae la especificación **y** el panel juntos. Decidan entre los dos cómo resolverlo antes de seguir: por ejemplo, rehacer ese commit en dos (especificación + etiqueta, luego el panel) si todavía no se compartió, o explicarlo en la defensa. Con un historial ya compartido, no reescriban sin ponerse de acuerdo.
2. **Commits de ambos y repartidos en el tiempo**, con mensajes que digan qué cambió (no «p1»). La etiqueta final es `entrega-final`.
3. **Cambio de requisito:** cuando el catedrático lo publique, actualicen la especificación (`spec-v2`) y usen migraciones **nuevas**.
4. La contraseña pública de la semilla solo puede aparecer en los seeders, el README y la colección de Postman.
5. En la defensa, cada uno responde por todo, incluido lo que hizo el compañero o el agente: lean `clientes.js` y `AsignacionClientes.php` hasta poder explicar por qué se bloquea primero al asesor.
