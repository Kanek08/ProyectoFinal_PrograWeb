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

### 3. API y 4. SPA

Pendientes (los pasos se agregarán cuando existan `api/` y `frontend/`).

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
