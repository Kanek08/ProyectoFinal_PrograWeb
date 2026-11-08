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

Comprobación de A1–A3 (con solo la semilla de verificación cargada; modifica datos):

```bash
# Git Bash
cd api
CLAVE_SEMILLA=Ventas2026 node --env-file=.env scripts/verificar-a1-a3.mjs
```

```powershell
# PowerShell
cd api
$env:CLAVE_SEMILLA = "Ventas2026"
node --env-file=.env scripts/verificar-a1-a3.mjs
```

| Método | Ruta | Estado |
|---|---|---|
| POST | /auth/login | Hecho |
| GET | /productos | Hecho |
| GET | /clientes?q= | Hecho |
| POST | /clientes | Hecho |
| GET | /clientes/disponibles | Hecho |
| POST | /clientes/:id/tomar | Hecho |
| GET | /clientes/:id | Hecho |
| PATCH | /clientes/:id | Hecho |
| POST | /clientes/:id/actividades | Pendiente |
| GET | /actividades?estado= | Pendiente |
| PATCH | /actividades/:id | Pendiente |
| GET | /oportunidades?etapa= | Pendiente |
| POST | /oportunidades | Pendiente |
| GET | /oportunidades/:id | Pendiente |
| PATCH | /oportunidades/:id | Pendiente |
| PATCH | /oportunidades/:id/etapa | Pendiente |
| POST | /oportunidades/:id/productos | Pendiente |
| PATCH | /oportunidades/:id/productos/:lineaId | Pendiente |
| DELETE | /oportunidades/:id/productos/:lineaId | Pendiente |
| GET | /reportes/resumen?mes= | Pendiente |

Cuerpos, respuestas y códigos de error: sección 5 de [docs/especificacion.md](docs/especificacion.md).

### 4. SPA

Pendiente. Lo que falta del proyecto está detallado en [docs/continuacion.md](docs/continuacion.md).

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
