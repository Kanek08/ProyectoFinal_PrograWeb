# Verificación · CRM CompuPartes Xela

Evidencia de que cada criterio de `docs/especificacion.md` se cumple: **panel Laravel (L1–L7)**, **API (A1–A8)**, **SPA (F1–F6)**, **seguridad (S1–S8)**, la **prueba central** entre las dos puertas y la **bitácora de IA**.

Entornos de las pruebas (2026-11-08), con la base cargada con `php artisan migrate:fresh --seeder=VerificacionSeeder` salvo donde se indica:

| Máquina | Usada para | Versiones |
|---|---|---|
| Keneth | Panel (§1–4) y A1–A3 (§5) | MySQL 8.4.8, PHP 8.5.12, Laravel 13.40.0 |
| Jaime | A1–A8 (§5–6), SPA (§7), prueba central (§8) y cifras desde la API | MySQL 8.4.9, PHP 8.4.27, Laravel 13.40.0, Node 24.19.0, newman 6.2.3, navegador Chromium del panel de Claude |

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

### Cifras de control desde la API (A6.1)

`GET /api/reportes/resumen` con el token de cada asesor (`api/scripts/verificar-a6.mjs`). Los montos llegan como números JSON (`9250`, no `"9250.00"`).

| Asesor | `?mes=` | Respuesta de la API | ¿Coincide? |
|---|---|---|---|
| Valeria | 2026-10 | `{"mes":"2026-10","ventas":2,"total":9250,"pronostico":2512.88,"cartera":{"clientes":3,"maximo":10}}` | Sí |
| Valeria | 2026-11 | `{"mes":"2026-11","ventas":1,"total":3600,"pronostico":2512.88,"cartera":{"clientes":3,"maximo":10}}` | Sí |
| Diego | 2026-10 | `{"mes":"2026-10","ventas":1,"total":6000,"pronostico":112.5,"cartera":{"clientes":2,"maximo":10}}` | Sí |
| Carlos | 2026-10 | `{"mes":"2026-10","ventas":1,"total":7200,"pronostico":4125.75,"cartera":{"clientes":9,"maximo":10}}` | Sí |

La venta «Equipo para sucursal» (cierre 2026-11-01 03:30 UTC) cuenta en **octubre** porque en Guatemala fue el 31 de octubre a las 21:30; por eso Valeria tiene Q9,250.00 y no Q5,650.00.

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
| L7.2 | `php artisan test`: 24 pruebas de NIT, teléfono y mes (tabla L7.2). En la API, `npm test` corre 22 pruebas con los mismos casos de NIT y teléfono (`api/test/identidad.test.js`) | Cumple |

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
| S2 | `laravel/.env` y `api/.env` ignorados; los `.env.example` no traen claves. `git log --all -- '*.env'` no devuelve ningún commit | Cumple |
| S3 | Búsquedas con `where(..., 'like', ...)` de Eloquent (parámetros); `DB::raw`/`selectRaw` solo con expresiones fijas | Cumple |
| S5 | Supervisor con cliente y cotización de otro equipo → 404 (L5.2, L6.1) | Cumple |
| S7 | Cliente `<img src=x onerror=alert(1)>` se muestra como texto en la lista y el detalle; las vistas no usan `{!! !!}` | Cumple |
| S8 | Asignación con `lockForUpdate` sobre el asesor y el cliente; duplicados: el controlador captura el error 1062 del índice único | Implementado; falta prueba de peticiones simultáneas |

---

## 5. API: A1, A2 y A3

Script `api/scripts/verificar-a1-a3.mjs` contra la API corriendo y solo la semilla de verificación. Resultado: **44 de 44 comprobaciones**, repetido 3 veces con la semilla recién cargada (las de concurrencia dieron lo mismo en las tres corridas). `npm test` en `api/`: 22 pruebas de NIT y teléfono, los mismos casos que Laravel. En la máquina de Jaime, con A4–A6 ya agregados, el script volvió a dar 44 de 44 (sin regresiones).

| Criterio | Evidencia | Resultado |
|---|---|---|
| A1.1 | Valeria → 200 `{ token, usuario: { id, nombre, correo } }` sin password ni rol | Cumple |
| A1.2 | admin, sergio e ivan con la contraseña correcta → 403 sin token | Cumple |
| A1.3 | Correo inexistente y contraseña incorrecta → 401 con cuerpo idéntico | Cumple |
| A1.4 | Sin `clave` → 422 `errores.clave`; JSON mal formado → 400; sin cuerpo → 400 | Cumple |
| A1.5 | JWT con `alg: HS256`, `sub` = id y `exp`; expiración en `JWT_EXPIRES_IN` | Cumple |
| A2.1 | Sin token, alterado, vencido, HS512, `none` y firmado con otro secreto → 401 | Cumple |
| A2.2 | Token bien firmado de Iván (desactivado) y de la administradora → 401 | Cumple |
| A3.1 | Valeria ve sus 3 clientes; `?q=quetzal` y `?q=4521817-k` lo encuentran | Cumple |
| A3.2 | Alta 201 en su cartera; 422 con un mensaje por campo; NIT o teléfono repetido → 409; `vendedor_id` del cuerpo ignorado | Cumple |
| A3.3 | Disponibles: 6, cada uno solo con `id` y `nombre` | Cumple |
| A3.4 | Tomar → 200; ya tomado → 409; inexistente → 404 | Cumple |
| A3.5 | 10 tomas simultáneas del mismo cliente → 1 × 200 y 9 × 409 | Cumple |
| A3.6 | Carlos (9 de 10): 4 tomas + 1 alta simultáneas → 1 éxito, cartera 10; la siguiente alta → 409 | Cumple |
| A3.7 | Valeria lee y modifica un cliente de Diego → 404; id inexistente o no numérico → 404 | Cumple |
| A3.8 | NIT NULL → `"CF"`; ninguna respuesta contiene `vendedor_id` | Cumple |
| S3 | `?q=' OR 1=1 -- ` → 200 sin clientes; `?q=%` → solo los suyos | Cumple |
| S6 | Preflight desde `http://127.0.0.1:8080`: la API responde `Access-Control-Allow-Origin: http://127.0.0.1:5500`, que no coincide, y el navegador bloquea. `server.js` no arranca si `CORS_ORIGIN` es `*` | Cumple |
| S8 | Dos altas simultáneas con el mismo teléfono (asesores distintos) → una 201 y una 409 | Cumple |

---

## 6. API: A4 a A8

Cada script corre contra la API encendida con la semilla recién cargada; todos terminaron con «Todas las pruebas pasaron.» y la consola de la API no registró ningún 500.

| Script | Semilla | Comprobaciones |
|---|---|---|
| `api/scripts/verificar-a4.mjs` | verificación | 62 de 62 |
| `api/scripts/verificar-a4.mjs` | `--seed` (agrega RS-1.5) | 65 de 65 |
| `api/scripts/verificar-a5.mjs` | verificación | 37 de 37 |
| `api/scripts/verificar-a6.mjs` | verificación | 21 de 21 |

| Criterio | Evidencia | Resultado |
|---|---|---|
| A4.1 | `POST /oportunidades` → 201 en `prospecto` con un registro de historial (`etapa_anterior: null`), aunque el cuerpo traiga `etapa: "ganada"` y `vendedor_id: 5`; cliente de Diego → 422 `errores.cliente_id`; título vacío o de 151 → 422 | Cumple |
| A4.2 | Plan avanzado agregado con `precio_unitario: 1` en el cuerpo → la línea guarda 2750.50 (catálogo); producto inactivo (Licencia anterior) o inexistente → 422; repetido → 409; cantidad `0`, `1000`, `1.5`, `"2"`, `null` → 422 | Cumple |
| A4.3 | «Renovación de planes»: total 5650, Plan avanzado a 2600 (precio cotizado, no el actual 2750.50), subtotal 5200; probabilidad 100 | Cumple |
| A4.4 | 10 `PATCH /etapa` simultáneos a `calificado` → 1 × 200 y 9 × 422; el historial tiene un solo registro nuevo. Un cambio a `propuesta` y otro a `perdida` a la vez → el historial queda encadenado (cada `etapa_anterior` es la `etapa_nueva` del registro previo) | Cumple |
| A4.5 | Salto prospecto → propuesta, misma etapa, ganar desde prospecto y etapa inventada → 422 `errores.etapa`; ganar sin productos → 422 `errores.etapa`; perder sin motivo, con solo espacios o con 256 caracteres → 422 `errores.motivo_perdida`; retroceder calificado → prospecto → 200; perder con «  Sin presupuesto este año  » → motivo recortado y fecha de cierre | Cumple |
| A4.6 | Cotización ganada: cambiar título, etapa, agregar, cambiar cantidad o quitar producto → 409 «La cotización está cerrada…»; el intento no deja registro en el historial | Cumple |
| A5.1 | Seguimiento con `vence_en: "2030-12-01T10:00:00-06:00"` → 201 y se devuelve `"2030-12-01T16:00:00.000Z"`; sin zona (`2026-12-01T10:00`), solo fecha, fecha inexistente (`2026-02-30…`), hora 25 o un número → 422 `errores.vence_en`; cliente de Diego → 404; `vendedor_id` y `completada` del cuerpo ignorados | Cumple |
| A5.2 | Valeria ve 3 (2 pendientes, 1 completada) y Diego solo la suya; `?estado=vencida` → 400 | Cumple |
| A5.3 | El seguimiento de María Coyoy (2026-09-01, sin completar) → `vencida: true`; el completado → `false`; uno creado con fecha de 2020 → `true` al responder | Cumple |
| A5.4 | `completada` con `"true"`, `1`, `null`, `"sí"` o ausente → 422; `true` → 200 y deja de estar vencido; `false` → vuelve a estar vencido; el de Diego → 404 | Cumple |
| A6.1 | Cifras de control de la tabla de §1 (Valeria, Diego, Carlos) como números | Cumple |
| A6.2 | Sin `mes` → mes actual de Guatemala (2026-11); `2026-13`, `octubre`, `2026-1`, `26-10`, `2026-00`, `2026-10-01`, `2026/10` y `mes` repetido → 400; `2026-12` funciona (cambio de año) | Cumple |
| A7.1–A7.3 | Ruta inexistente → 404 JSON; JSON mal formado y cuerpo ausente → 400 JSON; 422 siempre como `{ errores }`; campos fuera del contrato ignorados (A4.1, A4.2, A5.1) | Cumple |
| A8.1 | `README.md`: tabla con los 20 endpoints (cuerpo, respuesta y errores), pasos de las tres piezas y tabla de scripts | Cumple |
| A8.2 | `docs/api.postman_collection.json`: 9 carpetas (Auth, Productos, Clientes, Actividades, Oportunidades, Reportes, Errores, Seguridad, Regla propia), 85 peticiones con pruebas. Con newman: **152 de 152** aserciones con `migrate:fresh --seed`; **124 de 124** con solo la semilla de verificación y todas las carpetas menos «Regla propia» | Cumple |

### Regla propia RS-1 (con `php artisan migrate:fresh --seed`)

| Criterio | Evidencia | Resultado |
|---|---|---|
| RS-1.1 | Cotización nueva con 3 equipos y 1 garantía en negociación → ganar → 409 «Cada equipo necesita su garantía: hay 3 equipos y 1 garantías.» (Postman) | Cumple |
| RS-1.2 | La misma con 3 garantías → 200, `ganada`, con fecha de cierre (Postman) | Cumple |
| RS-1.3 | Cotización solo con piezas → ganar → 200 (Postman) | Cumple |
| RS-1.4 | Con solo la semilla de verificación, ganar una cotización con productos → 200: la regla nunca se activa (`verificar-a4.mjs`) | Cumple |
| RS-1.5 | Andrés gana «Renovación de PCs del café» → 409 «…hay 4 equipos y 2 garantías.», sin cambiar etapa, fecha de cierre ni historial; sube las garantías a 4 → 200 (script y Postman) | Cumple |

---

## 7. SPA: F1 a F6

Pruebas en el navegador con la SPA servida en `http://127.0.0.1:5500` (`py -m http.server 5500 --bind 127.0.0.1 --directory frontend`), la API encendida y la semilla de verificación.

| Criterio | Prueba | Resultado |
|---|---|---|
| F1 | `sergio@crm.test` → «Su cuenta no puede usar la aplicación de ventas.» y no entra; `valeria@crm.test` entra a la cartera. Tras recargar, la sesión sigue (token en LocalStorage). Con el token alterado, la siguiente petición vuelve a `#/login` con «Su sesión terminó. Inicie sesión de nuevo.» y LocalStorage queda vacío. «Cerrar sesión» borra el token | Cumple |
| F1 | `Object.keys(localStorage)` con sesión abierta → solo `crm.token` | Cumple |
| F2 | Cartera «3 de 10»; búsqueda `452 1817-k` en el servidor → Comercial El Quetzal. Alta con NIT `12345678` y teléfono `1234567` → mensaje del servidor bajo cada campo y lo escrito se conserva; corregidos a `cf` y `+502 3333-4444` → agregado, «4 de 10» | Cumple |
| F2 | Diego toma Agencia Cuatro Caminos por la API; Valeria pulsa «Tomar» en ese mismo cliente → «Otro asesor ya tomó este cliente.» y la lista se actualiza; tomar Café Zunil → «5 de 10» | Cumple |
| F3 | Tablero con 4 columnas (Interesado → Negociación) con conteo y suma, y lista de cerradas con fecha de cierre en hora de Guatemala («Equipo para sucursal»: 31/10/26 9:30 p. m.) | Cumple |
| F3 | Nueva cotización «PCs para el café» → detalle; cantidad `1.5` → «La cantidad debe ser un número entero de 1 a 999.»; agregar 2 × Plan avanzado → Q5,501.00; cambiar a 3 → Q8,251.50; agregar Instalación y quitar el Plan avanzado → Q450.00 | Cumple |
| F3 | Botones según D1: en prospecto solo «Avanzar a Necesidad identificada» y «Marcar como perdida»; en negociación «Cerrar venta», «Regresar a Cotización enviada» y «Marcar como perdida». Perder sin motivo → error junto al campo del motivo. Cerrar venta → «Venta cerrada», 100 %, sin formularios ni botones; historial de 5 registros con fecha y hora de Guatemala | Cumple |
| F4 | Pendientes con el vencido (María Coyoy) resaltado y con la etiqueta «Vencido». Alta sin tipo → error junto al campo y la descripción se conserva; con `datetime-local` 2030-12-01 10:00 → se envía `2030-12-01T10:00:00-06:00` y se muestra «1/12/30, 10:00 a. m.». Marcar como completado lo pasa a la lista de completados | Cumple |
| F5 | Resumen de noviembre de 2026 y, con el selector, octubre de 2026: Q9,250.00, pronóstico Q2,512.88, cartera en «n de 10» | Cumple |
| F6 | Patrón estado → render (`js/estado.js`) y un listener por tipo de evento en `#app` (`js/main.js`). Indicador «Cargando…» mientras hay peticiones (`js/api.js`). Con la API detenida, el inicio de sesión muestra «No se pudo conectar con el servidor. Verifique que la API esté encendida.» | Cumple |
| F6 | Viewport de 375 × 812: en cartera, cotizaciones, detalle, seguimientos y resumen `document.documentElement.scrollWidth` = 375 y ningún elemento sobresale | Cumple |

### Seguridad en la SPA

| Regla | Prueba | Resultado |
|---|---|---|
| S4 | Las vistas solo usan los campos del contrato; las respuestas no traen `vendedor_id`, `user_id`, `supervisor_id` ni `password` (scripts y carpeta «Seguridad» de Postman) | Cumple |
| S6 | La misma SPA servida desde `http://localhost:5500` → el navegador bloquea la respuesta de la API y se muestra el mensaje de conexión; desde `http://127.0.0.1:5500` funciona | Cumple |
| S7 | Cliente `<img src=x onerror=alert(1)>` creado desde la SPA: se ve como texto en la cartera, en el aviso y en la lista de clientes de cotizaciones; `document.querySelectorAll('#app img').length` = 0. Todo el HTML se arma con la plantilla `html` de `js/utilidades.js`, que escapa cada valor. En el panel, el mismo cliente también se ve como texto | Cumple |
| S8 | Las reglas viven en la API: la SPA muestra el 409 cuando otro asesor tomó el cliente (F2); las peticiones simultáneas están probadas en §5 y §6 | Cumple |

---

## 8. Prueba central: panel ↔ SPA

| Paso | Resultado |
|---|---|
| En la SPA, Valeria gana «PCs para el café» (Instalación, Q450.00) el 2026-11-08 | `ganada`, cierre 8/11/26 |
| En el panel, Sergio abre **Reportes** de noviembre 2026 | Valeria: 2 ventas, **Q4,050.00** (Q3,600.00 de la semilla + Q450.00 de la SPA) |
| En el panel, Sergio asigna «Clínica San Rafael» (disponible) a Valeria | «El cliente quedó asignado.» |
| En la SPA, Valeria abre su cartera | Aparece «Clínica San Rafael»; el contador pasa de 5 a **6 de 10** |

Las dos puertas trabajan sobre los mismos datos. Al terminar se volvió a cargar la semilla de verificación.

---

## 9. Bitácora de IA (P5)

Casos en que el agente (Claude Code) propuso algo incorrecto o distinto de la especificación.

### Caso 1 · Trigger para la regla propia que rompía las migraciones
- **Qué propuso el agente:** reforzar RS-1 con un trigger `BEFORE UPDATE` creado desde una migración de Laravel.
- **Por qué está mal:** MySQL 8.4 trae el registro binario activado por omisión; en ese modo crear un trigger exige SUPER. `migrate:fresh --seed` fallaba con el error 1419, y L1 exige que funcione sin pasos manuales.
- **Cómo lo detectamos:** al correr `php artisan migrate:fresh --seed` por primera vez sobre MySQL 8.4.
- **Corrección:** se quitó la migración del trigger; RS-1 se cumple en la transacción de la API y la especificación explica por qué en la base no aplica. Commit: `0332dc8` (p1); la corrección se hizo antes del primer commit, por eso el trigger no aparece en el historial (`git log --all -S "CREATE TRIGGER"` está vacío).

### Caso 2 · Semilla de clientes leída con el orden equivocado
- **Qué propuso el agente:** al extraer el texto del PDF del enunciado con formato de columnas, asignó a Carlos solo 6 clientes, a Iván «Tienda La Bendición» y dejó 9 disponibles.
- **Por qué está mal:** las cifras de control dicen «Carlos Ajú 9 de 10». El orden correcto (extracción en orden de lectura) es: Carlos con 9 clientes, Iván con Hotel Los Pinos y 6 disponibles.
- **Cómo lo detectamos:** comparando la cartera de la semilla con las cifras de control antes de escribir el `VerificacionSeeder`.
- **Corrección:** `VerificacionSeeder` con el orden correcto; la cartera de Carlos da 9 de 10. Commit: `0332dc8` (p1), que ya trae el seeder corregido.

### Caso 3 · Mensaje equivocado para una cuenta desactivada
- **Qué propuso el agente:** en el inicio de sesión del panel revisaba primero si la cuenta era de vendedor y después si estaba activa.
- **Por qué está mal:** Iván es vendedor **y** está desactivado; veía «Su cuenta es de asesor de ventas…», que lo invita a usar la SPA, donde tampoco puede entrar. L2.4 pide el mensaje de cuenta desactivada.
- **Cómo lo detectamos:** probando el inicio de sesión con `ivan@crm.test`.
- **Corrección:** se invirtió el orden en `LoginRequest` y en `CuentaPersonalActiva`. Commit: `0332dc8` (p1), que ya trae el orden corregido.

### Caso 4 · El panel se conectó a MariaDB en lugar de MySQL 8.4
- **Qué pasó:** en la máquina corrían a la vez MariaDB de XAMPP y el servicio MySQL 8.4, ambos en el puerto 3306. La base y el usuario quedaron creados en MariaDB.
- **Por qué está mal:** el enunciado exige MySQL 8.4; MariaDB no tiene `REGEXP_LIKE`, que usan los CHECK de clientes, y el panel y la API podrían terminar en bases distintas.
- **Cómo lo detectamos:** `php artisan db:show` mostró «MariaDB 10.11».
- **Corrección:** se detuvo MariaDB, se creó la base en MySQL 8.4 y el README advierte el problema.

### Caso 5 · NIT inventado sin dígito verificador en las pruebas
- **Qué propuso el agente:** en el script de verificación de la API usó el NIT `8104523-2` para probar el `PATCH` de un cliente, sin calcular su dígito verificador.
- **Por qué está mal:** el dígito correcto no es 2; la API respondió 422 (lo correcto) y la prueba falló por un dato mal escrito, no por un defecto de la API. Una prueba con datos inválidos sin querer puede ocultar o inventar errores.
- **Cómo lo detectamos:** la única falla de la primera corrida mostraba `errores.nit`.
- **Corrección:** se calculó el dígito con `digitoVerificador()` y la prueba usa `330 1245-8`. Commit: `0ffb786` (p2), que ya trae el script corregido.

### Caso 6 · Colección de Postman con el inicio de sesión roto
- **Qué propuso el agente:** al generar la colección, quitó las comillas a **todas** las variables del cuerpo (`"{{clienteId}}"` → `{{clienteId}}`) para que los ids viajaran como números JSON. La regla también le quitó las comillas a `"{{clave}}"`.
- **Por qué está mal:** el cuerpo del inicio de sesión quedó `{"correo": "...", "clave": {{clave}}}` (sin comillas), que no es JSON válido. La API respondió 400 y, sin token, todas las peticiones siguientes dieron 401: 131 de 152 aserciones fallaron.
- **Cómo lo detectamos:** corriendo la colección completa con newman antes de subirla.
- **Corrección:** la regla solo quita las comillas a las variables que terminan en `Id`; la colección pasó 152 de 152. Commit: `adaa89f` (la colección se subió ya corregida).

### Caso 7 · Montos con un espacio entre la Q y la cifra
- **Qué propuso el agente:** `formatoQ` usaba `Intl.NumberFormat('es-GT', { currency: 'GTQ' })` tal cual.
- **Por qué está mal:** en el navegador de prueba ese formato produce «Q 9,250.00», con un espacio duro (U+00A0), y la especificación (F5) y el panel muestran `Q9,250.00`. Las dos puertas mostraban el mismo monto escrito distinto.
- **Cómo lo detectamos:** al revisar en el navegador el tablero de cotizaciones; los códigos de los caracteres confirmaron el espacio duro.
- **Corrección:** `formatoQ` quita el espacio después de la Q (`js/utilidades.js`). Commit: `105f7b1` (la SPA se subió ya corregida).
