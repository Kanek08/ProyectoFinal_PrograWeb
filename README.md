# CRM de ventas · CompuPartes Xela

Proyecto final de Programación Web (Universidad Mesoamericana, 2026) · Keneth López y Jaime Orozco.

CRM para una tienda de **computadoras y piezas** de Quetzaltenango. Tres piezas sobre una sola base MySQL 8.4:

| Pieza | Carpeta | Quién la usa | Tecnología |
|---|---|---|---|
| Panel | `laravel/` | Administrador y jefes de tienda | Laravel 13 + Breeze (Blade) + Eloquent |
| API REST | `api/` | La SPA del asesor de ventas | Node.js 24 + Express 5 + mysql2 + JWT |
| SPA | `frontend/` | Asesor de ventas | HTML + Bootstrap 5.3 + JavaScript con módulos |

La especificación completa está en [docs/especificacion.md](docs/especificacion.md).

## Levantar el proyecto desde cero

### Requisitos

PHP 8.3 o superior (con `pdo_mysql`, `mbstring`, `intl`, `zip`), Composer, MySQL 8.4, Node.js 24 y npm.

> **Importante:** el puerto 3306 debe ser de MySQL 8.4. Si también tiene XAMPP, detenga su MySQL/MariaDB: MariaDB no soporta las restricciones `REGEXP_LIKE` de las migraciones.

### 1. Base de datos

Como root de MySQL:

```sql
CREATE DATABASE crm_computadoras CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'crm'@'localhost' IDENTIFIED BY '<una-clave-local>';
CREATE USER 'crm'@'127.0.0.1' IDENTIFIED BY '<una-clave-local>';
GRANT ALL PRIVILEGES ON crm_computadoras.* TO 'crm'@'localhost';
GRANT ALL PRIVILEGES ON crm_computadoras.* TO 'crm'@'127.0.0.1';
FLUSH PRIVILEGES;
```

### 2. Panel Laravel

```bash
cd laravel
composer install
cp .env.example .env          # escriba DB_PASSWORD con la clave del usuario crm
php artisan key:generate
npm install
npm run build
php artisan migrate:fresh --seed
php artisan serve             # http://127.0.0.1:8000
```

- `php artisan migrate:fresh --seed` carga la semilla de verificación y la del sector.
- `php artisan migrate:fresh --seeder=VerificacionSeeder` carga **solo** la semilla de verificación (la que se usa en la defensa).
- `php artisan test` corre las pruebas unitarias de NIT, teléfono y mes de Guatemala.

### 3. API REST

```bash
cd api
npm install
cp .env.example .env          # DB_PASSWORD, JWT_SECRET (≥ 32 caracteres aleatorios) y CORS_ORIGIN
npm run dev                   # http://localhost:3000/api
npm test                      # pruebas de NIT y teléfono
```

#### Endpoints

Base `http://localhost:3000/api`. Todo viaja en JSON y todas las rutas exigen `Authorization: Bearer <token>`, salvo el inicio de sesión. Solo los asesores de ventas activos pueden usar la API.

| Método | Ruta | Cuerpo o parámetros | Respuesta correcta | Errores |
|---|---|---|---|---|
| POST | /auth/login | `{ correo, clave }` | 200 `{ token, usuario }` | 400, 401, 403, 422 |
| GET | /productos | — | 200, productos activos | 401 |
| GET | /clientes | `?q=` (contiene, en nombre o NIT) | 200, clientes de su cartera | 401 |
| POST | /clientes | `{ nombre, nit, telefono, correo }`; correo opcional | 201, el cliente, ya en su cartera | 400, 401, 409, 422 |
| GET | /clientes/disponibles | — | 200, `[{ id, nombre }]` | 401 |
| POST | /clientes/:id/tomar | — | 200, el cliente, ya en su cartera | 401, 404, 409 |
| GET | /clientes/:id | — | 200, el cliente | 401, 404 |
| PATCH | /clientes/:id | Los campos que cambian | 200, el cliente | 400, 401, 404, 409, 422 |
| POST | /clientes/:id/actividades | `{ tipo, descripcion, vence_en }`; vence_en opcional, con zona horaria | 201, la actividad | 400, 401, 404, 422 |
| GET | /actividades | `?estado=pendiente` o `completada` | 200, actividades de los clientes de su cartera | 400, 401 |
| PATCH | /actividades/:id | `{ completada }` (booleano) | 200, la actividad | 400, 401, 404, 422 |
| GET | /oportunidades | `?etapa=` | 200, resumen de sus cotizaciones | 400, 401 |
| POST | /oportunidades | `{ cliente_id, titulo }` | 201, detalle, en prospecto | 400, 401, 422 |
| GET | /oportunidades/:id | — | 200, detalle con productos e historial | 401, 404 |
| PATCH | /oportunidades/:id | `{ titulo }` | 200, detalle | 400, 401, 404, 409, 422 |
| PATCH | /oportunidades/:id/etapa | `{ etapa, motivo_perdida }`; motivo solo al perder | 200, detalle | 400, 401, 404, 409, 422 |
| POST | /oportunidades/:id/productos | `{ producto_id, cantidad }` | 201, detalle | 400, 401, 404, 409, 422 |
| PATCH | /oportunidades/:id/productos/:lineaId | `{ cantidad }` | 200, detalle | 400, 401, 404, 409, 422 |
| DELETE | /oportunidades/:id/productos/:lineaId | — | 204, sin cuerpo | 401, 404, 409 |
| GET | /reportes/resumen | `?mes=AAAA-MM`; por omisión, el mes actual de Guatemala | 200 `{ mes, ventas, total, pronostico, cartera }` | 400, 401 |

Formas de respuesta, transiciones de etapa (D1) y regla propia RS-1: secciones 2, 5 y 8 de [docs/especificacion.md](docs/especificacion.md).

#### Colección de Postman

[docs/api.postman_collection.json](docs/api.postman_collection.json): impórtela en Postman (*Import*) y córrala con el *Collection Runner*, en orden. El primer request guarda el token de la asesora en `{{token}}`. Trae una petición por endpoint, los errores 400/401/403/404/409/422, pruebas de seguridad (S3, S4, S5, A2) y la regla propia RS-1.

- Con `php artisan migrate:fresh --seeder=VerificacionSeeder` pasan todas las carpetas menos **Regla propia**.
- La carpeta **Regla propia** necesita las dos semillas: `php artisan migrate:fresh --seed`.
- La colección cambia datos: al terminar, vuelva a cargar la semilla.

#### Scripts de verificación

Con la API corriendo y **solo** la semilla de verificación cargada. Cada script cambia datos: vuelva a cargar la semilla antes de correr el siguiente.

| Script | Qué comprueba |
|---|---|
| `scripts/verificar-a1-a3.mjs` | Inicio de sesión, middleware, clientes y cartera, con peticiones simultáneas (S8) |
| `scripts/verificar-a4.mjs` | Cotizaciones, productos, etapas (D1), cambios simultáneos de etapa; con `--seed`, también RS-1 |
| `scripts/verificar-a5.mjs` | Seguimientos, fechas con zona horaria y `vencida` |
| `scripts/verificar-a6.mjs` | Resumen del mes con las cifras de control |

```bash
# Git Bash
cd api
CLAVE_SEMILLA=Ventas2026 node --env-file=.env scripts/verificar-a4.mjs
```

```powershell
# PowerShell
cd api
$env:CLAVE_SEMILLA = "Ventas2026"
node --env-file=.env scripts/verificar-a4.mjs
```

### 4. SPA del asesor

HTML, Bootstrap 5.3 (CDN) y JavaScript con módulos, sin framework ni compilación. Con la API corriendo, sirva la carpeta `frontend/` **exactamente** en `http://127.0.0.1:5500`, el origen de `CORS_ORIGIN` en `api/.env` (S6). Desde `localhost:5500` la API la rechaza.

- **VS Code:** clic derecho en `frontend/index.html` → *Open with Live Server* y abra `http://127.0.0.1:5500`.
- **Python:** desde la raíz del repositorio, `py -m http.server 5500 --bind 127.0.0.1 --directory frontend` (en Linux o macOS, `python3`).

Inicie sesión con un asesor de ventas (`valeria@crm.test`).

| Pantalla | Ruta | Qué hace |
|---|---|---|
| Inicio de sesión | `#/login` | F1. El token se guarda en LocalStorage (lo único que se guarda ahí); un 401 en plena sesión vuelve aquí con un aviso. |
| Cartera | `#/cartera` | F2. Clientes con búsqueda en el servidor, «n de 10», alta con errores por campo y clientes disponibles con «Tomar». |
| Cotizaciones | `#/embudo` | F3. Una columna por etapa abierta, lista de cerradas y alta de cotizaciones. |
| Detalle | `#/cotizacion/:id` | F3. Productos con precio cotizado y subtotal, total, historial y botones de etapa según D1; perder pide el motivo. |
| Seguimientos | `#/seguimientos` | F4. Pendientes y completados, vencidos resaltados; la fecha local se envía con `-06:00`. |
| Resumen | `#/resumen` | F5. Selector de mes; ventas, total, pronóstico y cartera en quetzales. |

Estructura: `js/main.js` (enrutador por hash y delegación de eventos), `js/estado.js` (estado único y `render()`), `js/api.js` (peticiones, token, indicador de carga, 401 y API apagada), `js/utilidades.js` (`html` que escapa todo dato, `formatoQ`, `fechaGT`, `aIsoConZona`), `js/etiquetas.js` (vocabulario del sector) y `js/vistas/`.

## Cuentas de prueba

Contraseña de todas las cuentas: `Ventas2026`.

| Correo | Rol | Puerta |
|---|---|---|
| admin@crm.test | Administrador | Panel |
| sergio@crm.test, sandra@crm.test | Jefe de tienda | Panel |
| valeria@crm.test, diego@crm.test, carlos@crm.test | Asesor de ventas | SPA |
| ivan@crm.test | Asesor de ventas (desactivado) | — |
| monica@compupartes.test | Jefe de tienda (semilla del sector) | Panel |
| andres@, lucia@, kevin@compupartes.test | Asesores (semilla del sector) | SPA |

## Panel: qué puede hacer cada rol

| Página | Administrador | Jefe de tienda |
|---|---|---|
| Cuentas (crear, editar, desactivar) | Sí | No (403) |
| Catálogo (crear, editar, desactivar) | Sí | No (403) |
| Clientes: lista, alta, edición, asignar/reasignar/liberar | Todos | Su equipo y disponibles |
| Eliminar cliente sin cotizaciones | Sí | No |
| Equipos (cartera n de 10 y ventas del mes) | Todos los equipos | Su equipo |
| Cotizaciones (solo lectura) | Todas | Su equipo |
| Reporte del mes (por asesor, equipo y producto) | Toda la empresa | Su equipo |
