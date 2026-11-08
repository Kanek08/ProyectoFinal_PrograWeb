# CRM CompuPartes Xela (computadoras y piezas) — reglas para el agente

Proyecto final de Programación Web (UMES, 6.º semestre, 2026, Ing. Fredy Ramírez Solano).
Pareja: Keneth López (panel Laravel, especificación) y Jaime Orozco (API y SPA). Todo texto visible al usuario va en español, tratando de usted.

## Fuente de verdad (en este orden)

1. El enunciado del catedrático (`Proyecto_Final_CRM_Enunciado.pdf`, fuera del repositorio). **Manda siempre.**
2. `docs/especificacion.md` — nuestra especificación: requisitos con criterios Dado/Cuando/Entonces, contrato de la API, modelo de datos con dónde se cumple cada regla y las decisiones D1–D6. Si algo no está ahí, **pregunta antes de decidir**.
3. La guía paso a paso del sector computadoras (fuera del repositorio): son sugerencias, no reglas.

`docs/verificacion.md` tiene la matriz de evidencia, las cifras de control obtenidas y la **Bitácora de IA**: cuando el agente se equivoque, agrega el caso ahí.

## Arquitectura (no negociable)

| Pieza | Carpeta | Quién | Tecnología |
|---|---|---|---|
| Panel | `laravel/` | administrador, supervisor | Laravel 13 + Breeze (Blade) + Eloquent |
| API REST | `api/` (A1–A3 hechos; A4–A8 pendientes) | vendedor (vía SPA) | Node 24 + Express 5 + mysql2 + jsonwebtoken + **bcryptjs** + cors |
| SPA | `frontend/` (pendiente) | vendedor | HTML + Bootstrap 5.3 + JS con módulos, sin framework |

- Una sola base **MySQL 8.4** (`crm_computadoras`). Solo Laravel crea o modifica tablas (migraciones); la API nunca ejecuta CREATE/ALTER. **Nunca edites una migración que ya está en Git: crea una nueva.**
- Solo el panel crea cuentas y genera hashes; no hay registro público. La API solo verifica con bcryptjs.
- Panel: Eloquent / constructor de consultas. API: SQL a mano con mysql2 y `?`; prohibido ORM o Knex.
- Fechas en UTC (`APP_TIMEZONE=UTC`, conexión MySQL con `time_zone +00:00`); se muestran en hora de Guatemala. Dinero en DECIMAL(10,2), nunca FLOAT.
- En mysql2: `decimalNumbers: true` y `timezone: 'Z'`.
- **No uses triggers ni procedimientos almacenados:** con el registro binario de MySQL 8.4 exigen SUPER y rompen `migrate:fresh` (bitácora, caso 1).

## Comandos del panel (desde `laravel/`)

En esta máquina `php` y `composer` son envoltorios en `~/bin` (PHP de XAMPP con `-d extension=zip -d extension=intl`). XAMPP MariaDB debe estar detenido: el puerto 3306 es de MySQL 8.4.

```bash
php artisan migrate:fresh --seed                       # verificación + sector
php artisan migrate:fresh --seeder=VerificacionSeeder  # solo verificación (cifras de control, defensa)
php artisan serve                                      # http://127.0.0.1:8000
npm run build                                          # tras cambiar clases Tailwind en las vistas
php artisan test                                       # pruebas unitarias
php artisan test --filter=IdentidadTest                # una sola prueba
```

Las pruebas de Feature con base de datos no se usan: phpunit trae SQLite y las migraciones usan SQL de MySQL (`REGEXP_LIKE`, CHECK).

## Estructura del panel

- `app/Support/Identidad.php` — NIT (compactar, módulo 11, CF → NULL) y teléfono. La API debe replicar exactamente esta lógica (tabla L7.2; pruebas en `tests/Unit/IdentidadTest.php`).
- `app/Support/Embudo.php` — etapas, abiertas/cerradas y probabilidades. `MesGuatemala.php` — mes de Guatemala → rango UTC. `Formato.php` — quetzales y fechas.
- `app/Services/AsignacionClientes.php` — asignar/reasignar/liberar en transacción con `lockForUpdate` (primero el asesor, luego el cliente), cartera máxima 10, decisiones D2 y D3.
- `app/Services/Reportes.php` — ventas, total y pronóstico por asesor, equipo y producto, calculados en SQL.
- Visibilidad: `Cliente::visiblePara($user)`, `Oportunidad::visiblePara($user)`, `User::vendedoresVisiblesPara($user)`. Los controladores **nunca** usan route model binding para clientes/cotizaciones: buscan dentro del scope y `findOrFail`, así lo ajeno responde 404.
- `app/Http/Middleware/CuentaPersonalActiva.php` (grupo web) expulsa a vendedores y cuentas desactivadas en cada petición. `TieneRol` (`rol:administrador,supervisor`).
- Las cotizaciones son de solo lectura en el panel.
- Vocabulario del sector en `lang/es/crm.php` (cotizaciones, seguimientos, asesor, jefe de tienda, etapas). Mensajes de validación en `lang/es/validation.php`.
- Capa de sector: columna `productos.categoria` (nullable). Regla propia **RS-1**: una cotización con equipos solo se gana con garantías ≥ equipos; se cumple en la API (409).

## API (desde `api/`)

```bash
npm run dev                                            # http://localhost:3000/api (node --env-file=.env --watch)
npm test                                               # node:test (NIT y teléfono, mismos casos que Laravel)
node --test test/identidad.test.js                     # un solo archivo de pruebas
CLAVE_SEMILLA=<ver README> node --env-file=.env scripts/verificar-a1-a3.mjs   # A1–A3 + concurrencia
```

- `src/app.js`: cors (origen exacto) → `express.json` → `/api/auth` → `autenticar` → rutas → 404 JSON → `manejadorErrores`.
- `src/db.js`: pool y `enTransaccion(fn)`. `src/util/http.js`: `errorHttp`, `errores422`, `exigirCuerpo`, `idDeRuta`. Lanza estos errores con `throw`; Express 5 los lleva al manejador.
- `src/validacion/identidad.js` replica `Identidad.php`; si cambias una, cambia la otra y sus pruebas.
- Concurrencia: transacción + `SELECT ... FOR UPDATE`, bloqueando primero la fila del asesor en `users`, luego `clientes`, luego `oportunidades` (mismo orden que el panel). Duplicados: `ER_DUP_ENTRY` → 409.
- Lo que falta y cómo hacerlo está en `docs/continuacion.md`.

## Seguridad

Nunca concatenes datos del usuario en SQL ni los pases a `DB::raw`/`selectRaw`. Nunca `{!! !!}` con datos del usuario. El dueño de un registro sale de la sesión o del token, nunca del cuerpo. `.env` nunca al repositorio. La contraseña pública de la semilla solo puede aparecer en los seeders, el README y la colección de Postman: no la escribas en ningún otro archivo.

## Proceso

Especificación → plan → implementación → verificación. La etiqueta `spec-v1` debe ir sobre el commit de `docs/especificacion.md` **antes** de los commits de implementación. Commits pequeños de ambos integrantes con mensajes que digan qué cambió. Habrá un cambio de requisito → `spec-v2` y migraciones nuevas.
