# Verificación · CRM CompuPartes Xela

Evidencia de que cada criterio de `docs/especificacion.md` se cumple. Este documento cubre por ahora el **panel Laravel (L1–L7)**; las secciones de la API y la SPA se agregan cuando existan.

Entorno de las pruebas (2026-11-08): MySQL 8.4.8, PHP 8.5.12, Laravel 13.40.0, base cargada con `php artisan migrate:fresh --seeder=VerificacionSeeder` salvo donde se indica.

---

## 1. Cifras de control

Calculadas con el servicio `App\Services\Reportes` (el mismo que usa el panel) y confirmadas en la página **Reportes** del panel con la cuenta `admin@crm.test`.

| Quién | Mes | Ventas | Total vendido | Pronóstico | Cartera | Esperado | ¿Coincide? |
|---|---|---|---|---|---|---|---|
| Valeria López | oct 2026 | 2 | Q9,250.00 | Q2,512.88 | 3 de 10 | igual | Sí |
| Valeria López | nov 2026 | 1 | Q3,600.00 | Q2,512.88 | 3 de 10 | igual | Sí |
| Diego Castillo | oct 2026 | 1 | Q6,000.00 | Q112.50 | 2 de 10 | igual | Sí |
| Carlos Ajú | oct 2026 | 1 | Q7,200.00 | Q4,125.75 | 9 de 10 | igual | Sí |
| Equipo de Sergio Ruiz | oct 2026 | 3 | Q15,250.00 | Q2,625.38 | | igual | Sí |
| Equipo de Sandra Pérez | oct 2026 | 1 | Q7,200.00 | Q4,125.75 | | igual | Sí |
| Toda la empresa | oct 2026 | 4 | Q22,450.00 | Q6,751.13 | | igual | Sí |

| Producto · oct 2026 | Unidades | Total | Esperado | ¿Coincide? |
|---|---|---|---|---|
| Plan básico | 5 | Q6,000.00 | igual | Sí |
| Plan avanzado | 2 | Q5,200.00 | igual | Sí |
| Instalación | 1 | Q450.00 | igual | Sí |
| Soporte anual | 3 | Q10,800.00 | igual | Sí |

Conteos de la semilla: 7 cuentas, 5 productos, 21 clientes, 11 oportunidades, 13 líneas, **43 registros de historial**, 4 actividades.

---

## 2. Matriz de trazabilidad del panel

| Criterio | Evidencia | Resultado |
|---|---|---|
| L1.1 | `php artisan migrate:fresh --seed` termina sin errores (8 migraciones propias + 2 seeders) | Cumple |
| L1.2 | `migrate:fresh --seeder=VerificacionSeeder` → conteos de la sección 1 | Cumple |
| L1.3 | `2026_11_08_000001_add_crm_columns_to_users_table.php`; la migración original de users no se tocó | Cumple |
| L1.4 | Inserciones directas en MySQL rechazadas (sección 3) | Cumple |
| L1.5 | `SectorSeeder`: correos `@compupartes.test`, teléfonos `4800xxxx`, NIT calculados con módulo 11; máximo 5 clientes por asesor | Cumple |
| L2.1 | `GET /register` → 404; `php artisan route:list` no tiene register, forgot-password, reset-password, verify-email ni borrado de perfil | Cumple |
| L2.2 | `admin@crm.test` entra a `/inicio` | Cumple |
| L2.3 | `valeria@crm.test` → «Su cuenta es de asesor de ventas. Ingrese desde la aplicación de ventas.» | Cumple |
| L2.4 | `ivan@crm.test` → «Su cuenta está desactivada. Comuníquese con el administrador.» | Cumple |
| L2.5 | Sergio con sesión abierta; `UPDATE users SET activo=0`; su siguiente petición lo envía a `/login` con «Su cuenta fue desactivada…» | Cumple |
| L2.6–L2.7 | Formulario de cuentas; vendedor sin jefe → «Elija el jefe de tienda del asesor.»; jefe que no es supervisor activo → rechazo | Cumple |
| L2.8 | Admin intenta desactivarse → «No puede desactivar su propia cuenta.»; cambiarse el rol → «No puede cambiar su propio rol.» | Cumple |
| L2.9 | Desactivar a Sergio (tiene equipo) → «Reasigne primero a los asesores de su equipo.» | Cumple |
| L2.10 | Valeria (con clientes) a jefe de tienda → «El asesor tiene clientes u oportunidades: no puede cambiar de rol.» | Cumple |
| L2.11 | Sergio en `/usuarios` y `/productos` → 403 | Cumple |
| L3.2 | Precio `10.555` y `0` → «El precio debe ser mayor que cero y tener como máximo dos decimales.» | Cumple |
| L3.4 | Plan avanzado pasó de Q2,750.50 a Q3,999.99: «Renovación de planes» sigue con la línea a Q2,600.00 y total Q5,650.00 | Cumple |
| L4.2 | Cliente con NIT `cf` y teléfono `(502) 2233.4455` → guardado NULL / `22334455`, mostrado «CF» | Cumple |
| L4.3 | NIT `452 1817-k` y teléfono `+502 5555-1234` → «Ya existe un cliente con ese NIT.» / «…ese teléfono.» | Cumple |
| L4.4 | Carlos 9 → 10 al asignar; el siguiente → «La cartera de ese asesor ya tiene 10 clientes, el máximo permitido.» | Cumple |
| L4.5 | Ferretería Xela reasignada a Diego: «Capacitación de personal» (abierta) pasó a Diego; «Equipo para sucursal» (ganada) se quedó con Valeria | Cumple |
| L4.6 | Liberar Comercial El Quetzal → «El cliente tiene cotizaciones abiertas: ciérrelas o reasígnelo a otro asesor.» | Cumple |
| L5.1 | Sergio ve los clientes de Valeria, Diego y los disponibles; no ve los de Carlos ni el de Iván | Cumple |
| L5.2 | Sergio: `GET /clientes/8`, `GET /clientes/8/editar`, `PUT /clientes/8` (Taller El Volcán, equipo de Sandra) → 404 | Cumple |
| L5.3 | Sergio asigna Café Zunil a Carlos (id enviado a mano) → «Elija un asesor activo de su equipo.» | Cumple |
| L5.4 | «Mi equipo» de Sergio en oct 2026: Valeria 3 de 10, 2 ventas, Q9,250.00; Diego 2 de 10, 1 venta, Q6,000.00 | Cumple |
| L6.1 | «Equipo para sucursal» muestra cierre 31/10/2026 21:30; Sergio en `/cotizaciones/11` (de Carlos) → 404 | Cumple |
| L6.3–L6.4 | Página Reportes = cifras de control (sección 1) | Cumple |
| L7.1 | Formulario de cliente con NIT inválido vuelve con lo escrito y el error junto al campo | Cumple |
| L7.2 | `php artisan test`: 24 pruebas de NIT, teléfono y mes (tabla L7.2) | Cumple (falta la misma tabla en la API) |

---

## 3. Restricciones en la base (L1.4)

Inserciones directas como usuario `crm`, sin pasar por el panel:

| Intento | Respuesta de MySQL |
|---|---|
| Teléfono `1234567` / `15551234` | `Check constraint 'chk_clientes_telefono' is violated` |
| NIT `4521817-K` (no compacto) | `Check constraint 'chk_clientes_nit' is violated` |
| NIT `4521817K` repetido | `Duplicate entry ... 'clientes_nit_unique'` |
| Teléfono `55551234` repetido | `Duplicate entry ... 'clientes_telefono_unique'` |
| Producto con precio 0 | `Check constraint 'chk_productos_precio' is violated` |
| Línea con cantidad 1000 | `Check constraint 'chk_linea_cantidad' is violated` |
| Mismo producto dos veces en una oportunidad | `Duplicate entry ... 'oportunidad_productos_oportunidad_id_producto_id_unique'` |
| `perdida` sin motivo | `Check constraint 'chk_op_motivo' is violated` |
| Motivo de solo espacios | `Check constraint 'chk_op_motivo_no_vacio' is violated` |
| `ganada` sin fecha de cierre | `Check constraint 'chk_op_cierre' is violated` |
| Vendedor sin supervisor / administrador con supervisor | `Check constraint 'chk_users_supervisor' is violated` |

---

## 4. Seguridad en el panel

| Regla | Prueba | Resultado |
|---|---|---|
| S1 | `SELECT DISTINCT LEFT(password,4) FROM users` → solo `$2y$` | Cumple |
| S2 | `laravel/.env` ignorado; `laravel/.env.example` sin clave de base | Cumple (revisar `git log` al hacer el primer commit) |
| S3 | Búsquedas con `where(..., 'like', ...)` de Eloquent (parámetros); `DB::raw`/`selectRaw` solo con expresiones fijas | Cumple |
| S5 | Supervisor con cliente y cotización de otro equipo → 404 (L5.2, L6.1) | Cumple |
| S7 | Cliente `<img src=x onerror=alert(1)>` se muestra como texto en la lista y el detalle; las vistas no usan `{!! !!}` | Cumple |
| S8 | Asignación con `lockForUpdate` sobre el asesor y el cliente; duplicados: el controlador captura el error 1062 del índice único | Implementado; falta prueba de peticiones simultáneas |

---

## 5. Bitácora de IA (P5)

Casos en que el agente (Claude Code) propuso algo incorrecto o distinto de la especificación.

### Caso 1 · Trigger para la regla propia que rompía las migraciones
- **Qué propuso el agente:** reforzar RS-1 con un trigger `BEFORE UPDATE` creado desde una migración de Laravel.
- **Por qué está mal:** MySQL 8.4 trae el registro binario activado por omisión; en ese modo crear un trigger exige SUPER. `migrate:fresh --seed` fallaba con el error 1419, y L1 exige que funcione sin pasos manuales.
- **Cómo lo detectamos:** al correr `php artisan migrate:fresh --seed` por primera vez sobre MySQL 8.4.
- **Corrección:** se quitó la migración del trigger; RS-1 se cumple en la transacción de la API y la especificación explica por qué en la base no aplica. Commit: _pendiente_.

### Caso 2 · Semilla de clientes leída con el orden equivocado
- **Qué propuso el agente:** al extraer el texto del PDF del enunciado con formato de columnas, asignó a Carlos solo 6 clientes, a Iván «Tienda La Bendición» y dejó 9 disponibles.
- **Por qué está mal:** las cifras de control dicen «Carlos Ajú 9 de 10». El orden correcto (extracción en orden de lectura) es: Carlos con 9 clientes, Iván con Hotel Los Pinos y 6 disponibles.
- **Cómo lo detectamos:** comparando la cartera de la semilla con las cifras de control antes de escribir el `VerificacionSeeder`.
- **Corrección:** `VerificacionSeeder` con el orden correcto; la cartera de Carlos da 9 de 10. Commit: _pendiente_.

### Caso 3 · Mensaje equivocado para una cuenta desactivada
- **Qué propuso el agente:** en el inicio de sesión del panel revisaba primero si la cuenta era de vendedor y después si estaba activa.
- **Por qué está mal:** Iván es vendedor **y** está desactivado; veía «Su cuenta es de asesor de ventas…», que lo invita a usar la SPA, donde tampoco puede entrar. L2.4 pide el mensaje de cuenta desactivada.
- **Cómo lo detectamos:** probando el inicio de sesión con `ivan@crm.test`.
- **Corrección:** se invirtió el orden en `LoginRequest` y en `CuentaPersonalActiva`. Commit: _pendiente_.

### Caso 4 · El panel se conectó a MariaDB en lugar de MySQL 8.4
- **Qué pasó:** en la máquina corrían a la vez MariaDB de XAMPP y el servicio MySQL 8.4, ambos en el puerto 3306. La base y el usuario quedaron creados en MariaDB.
- **Por qué está mal:** el enunciado exige MySQL 8.4; MariaDB no tiene `REGEXP_LIKE`, que usan los CHECK de clientes, y el panel y la API podrían terminar en bases distintas.
- **Cómo lo detectamos:** `php artisan db:show` mostró «MariaDB 10.11».
- **Corrección:** se detuvo MariaDB, se creó la base en MySQL 8.4 y el README advierte el problema.
