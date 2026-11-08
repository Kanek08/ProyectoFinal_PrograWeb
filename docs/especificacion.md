# Especificación · CRM de ventas · CompuPartes Xela

Proyecto final de Programación Web · Universidad Mesoamericana · 2026
Pareja: Keneth López y Jaime Orozco
Versión: spec-v1

Este documento describe **qué hace el sistema y cómo se comprueba**. La fuente de las reglas del núcleo es el enunciado del catedrático; aquí se reescriben con nuestras palabras, se agregan los criterios verificables y se toman las decisiones que el enunciado deja abiertas. Si algo no está en este documento, se pregunta antes de decidir.

---

## 1. Sector y empresa

**CompuPartes Xela** es una tienda de Quetzaltenango que vende **computadoras y piezas**: laptops, computadoras de escritorio armadas, componentes sueltos (procesadores, tarjetas de video, memorias, discos, fuentes de poder, tarjetas madre), periféricos, licencias de software, garantías extendidas y servicios técnicos (armado, instalación, mantenimiento). Vende a personas (consumidor final, CF) y a empresas, colegios, cafés internet y oficinas (con NIT).

Tiene jefes de tienda (supervisores), cada uno con su equipo de asesores de ventas (vendedores).

### 1.1 El problema que resuelve

- Dos asesores atienden al mismo cliente y le cotizan precios distintos para la misma tarjeta de video.
- Los precios de las piezas cambian cada semana; sin registro, nadie sabe a qué precio se cotizó.
- El jefe de tienda no sabe cuánto se vendió en el mes ni qué cotizaciones están por cerrarse.
- Cuando un asesor se va, se pierden sus clientes y sus cotizaciones.

### 1.2 Vocabulario de las pantallas

Solo cambian los textos visibles en el panel y en la SPA. Las rutas, los campos JSON del contrato, las tablas y los valores guardados conservan los nombres del núcleo. El mapa vive en un solo lugar por pieza: `laravel/lang/es/crm.php` y `frontend/js/etiquetas.js`.

| Núcleo (código, BD, API) | Texto en pantalla |
|---|---|
| clientes | Clientes |
| productos | Catálogo (equipos y piezas) |
| oportunidades | Cotizaciones |
| actividades | Seguimientos |
| administrador / supervisor / vendedor | Administrador / Jefe de tienda / Asesor de ventas |
| prospecto · calificado · propuesta | Interesado · Necesidad identificada · Cotización enviada |
| negociacion · ganada · perdida | Negociación · Venta cerrada · Perdida |
| llamada · reunion · tarea | Llamada · Visita o demostración · Tarea |

### 1.3 Capa de sector en el modelo de datos

Una columna adicional, creada con una migración nueva: **`productos.categoria`**, que acepta vacío (NULL) para no romper el contrato.

| Valor | Ejemplos |
|---|---|
| `equipo` | Laptop, PC de escritorio armada, all-in-one |
| `pieza` | Procesador, tarjeta de video, RAM, SSD, fuente de poder, tarjeta madre |
| `periferico` | Monitor, teclado, mouse, UPS |
| `software` | Windows, Office, antivirus |
| `garantia` | Garantía extendida de 1 o 2 años por equipo |
| `servicio` | Armado de PC, instalación, mantenimiento |
| NULL | Productos de la semilla de verificación |

La API puede agregar `categoria` como campo extra en `GET /productos`; ningún campo del contrato cambia.

---

## 2. Regla propia · RS-1 «Cada equipo con su garantía»

**Regla.** Una cotización que incluye equipos (productos de categoría `equipo`) solo puede pasar a **ganada** si incluye garantías extendidas (categoría `garantia`) cuya cantidad total sea **mayor o igual** que la cantidad total de equipos. Las piezas sueltas, periféricos, software y servicios no exigen garantía.

**Por qué tiene sentido en el sector.** La tienda no entrega una computadora completa sin cobertura registrada: los reclamos por fallas de equipos armados o laptops son el principal costo de posventa y la garantía extendida es el respaldo con el que se atienden. Las piezas sueltas ya traen garantía de fábrica y se cambian con el proveedor, por eso no entran en la regla.

**Dónde se cumple.**

1. **API (servidor):** dentro de la transacción de `PATCH /oportunidades/:id/etapa`, después de bloquear la oportunidad (`FOR UPDATE`) y antes de actualizarla. Si no se cumple, responde **409** con `{ "error": "Cada equipo necesita su garantía: hay N equipos y M garantías." }` y no cambia la etapa, la fecha de cierre ni el historial. Como la fila está bloqueada, no hay forma de quitar una garantía y ganar al mismo tiempo.
2. **Panel:** las cotizaciones son de solo lectura en el panel (L6); ninguna pantalla puede cambiar su etapa, así que no hay otra puerta por la que saltarse la regla.
3. **Base de datos: no aplica.** La regla compara filas de dos tablas (líneas y productos), así que no se puede expresar con CHECK. Un trigger sí podría, pero lo descartamos: MySQL 8.4 trae el registro binario activado por omisión y, en ese modo, crear triggers exige el privilegio SUPER o cambiar `log_bin_trust_function_creators` en el servidor. `php artisan migrate:fresh --seed` dejaría de funcionar sin pasos manuales (L1) en cualquier instalación normal, incluida la del catedrático.

**Por qué no choca con el núcleo.** Los productos de la semilla de verificación tienen `categoria` NULL: no son equipos ni garantías, así que la regla nunca se activa con esa semilla y el sistema se comporta exactamente como el enunciado. Tampoco altera las cifras de control: solo puede impedir un cambio de etapa, nunca cambiar montos.

**Criterios de aceptación.**

- **RS-1.1** Dado una cotización en negociación con 3 equipos y 1 garantía, cuando el asesor la gana, entonces la API responde 409 con `{ "error": "Cada equipo necesita su garantía: hay 3 equipos y 1 garantías." }` y la etapa, la fecha de cierre y el historial no cambian.
- **RS-1.2** Dado la misma cotización con 3 equipos y 3 garantías (por ejemplo, 1 × garantía de 1 año y 2 × garantía de 2 años), cuando el asesor la gana, entonces responde 200, la etapa es `ganada` y se registra la fecha de cierre.
- **RS-1.3** Dado una cotización solo con piezas, periféricos o servicios, cuando se gana, entonces la regla no aplica y responde 200.
- **RS-1.4** Dado solo la semilla de verificación cargada, cuando se gana cualquier cotización con productos, entonces la regla nunca se activa.
- **RS-1.5** Dado la cotización «Renovación de PCs del café» del `SectorSeeder` (4 equipos, 2 garantías, en negociación), cuando el asesor la gana, entonces recibe 409; cuando sube las garantías a 4 y la gana, entonces recibe 200.

**Cómo se prueba.** Carpeta «Regla propia» en la colección de Postman con los casos RS-1.1 a RS-1.3 y RS-1.5.

**Alternativas descartadas.**

| Alternativa | Por qué la descartamos |
|---|---|
| Una cotización con procesador y tarjeta madre no se gana sin el servicio de armado | Exige subcategorías de piezas (procesador, tarjeta madre…) que complican el modelo; muchos clientes arman su propia PC. |
| Una licencia OEM solo se vende junto con un equipo o una pieza | Es una regla de licenciamiento real, pero es difícil de probar con criterios claros (qué pieza cuenta) y casi nunca se aplica en ventas pequeñas. |
| Un cliente CF no puede tener una cotización con más de 3 equipos | Restringe ventas legítimas a familias o estudiantes; la obligación de NIT por monto ya la regula la SAT, no la tienda. |
| Hacer cumplir RS-1 también con un trigger de MySQL | Con el registro binario activado (valor por omisión en MySQL 8.4), crear triggers exige el privilegio SUPER; las migraciones fallarían sin configuración manual del servidor. |

---

## 3. Roles y puertas

| Rol (pantalla) | Puerta | Puede | No puede |
|---|---|---|---|
| Administrador | Panel Laravel | Crear y editar cuentas; administrar el catálogo; ver y administrar todos los clientes; ver todas las cotizaciones y los reportes de toda la empresa | Borrar cuentas (se desactivan); desactivarse o quitarse el rol a sí mismo; entrar a la API |
| Jefe de tienda (supervisor) | Panel Laravel | Ver a los asesores de su equipo, los clientes de su equipo y los disponibles; crear clientes y asignarlos, reasignarlos o liberarlos dentro de su equipo; ver las cotizaciones y los reportes de su equipo | Ver otros equipos; administrar cuentas o catálogo; entrar a la API |
| Asesor de ventas (vendedor) | SPA, a través de la API | Trabajar su cartera, tomar clientes disponibles, llevar sus cotizaciones y sus productos, registrar seguimientos y ver su resumen del mes | Entrar al panel; ver o tocar datos de otro asesor |

Cada asesor pertenece al equipo de un jefe de tienda. Una cuenta desactivada no entra por ninguna puerta y pierde su sesión o su token en la siguiente petición.

### Reglas de arquitectura (no negociables)

- **Un solo dueño del esquema.** Las tablas se crean y modifican solo con migraciones de Laravel. La API nunca ejecuta CREATE ni ALTER. *Por qué:* dos aplicaciones escriben en la misma base; si ambas cambiaran el esquema, cada una tendría una idea distinta de las tablas y nadie sabría cuál es la versión correcta. Las migraciones son el historial versionado del esquema.
- **Un solo creador de cuentas.** Solo el administrador crea cuentas desde el panel; no hay registro público en ninguna puerta y la API solo verifica contraseñas. *Por qué:* centraliza la generación de hashes (S1) y la asignación de rol y supervisor; un registro público permitiría que cualquiera se diera un rol.

---

## 4. Requisitos y criterios de aceptación

Formato: **Dado / Cuando / Entonces**. Cada requisito se cumple cuando se cumplen todos sus criterios. Las cuentas de los ejemplos son las de la semilla de verificación (contraseña pública de la semilla, ver README).

### 4.1 Panel Laravel

#### L1 · Esquema y semillas

- **L1.1** Dado una base vacía, cuando se ejecuta `php artisan migrate:fresh --seed`, entonces se crean las tablas de la sección 6 con sus llaves foráneas, índices únicos y restricciones CHECK, y quedan cargadas la semilla de verificación y la del sector, sin pasos manuales.
- **L1.2** Dado una base vacía, cuando se ejecuta `php artisan migrate:fresh --seeder=VerificacionSeeder`, entonces la base contiene exactamente la semilla de la sección 7 del enunciado (7 cuentas, 5 productos, 21 clientes, 11 oportunidades con 13 líneas, 43 registros de historial, 4 actividades).
- **L1.3** La tabla `users` se extiende con una migración nueva (`rol`, `supervisor_id`, `activo`); la migración original de Laravel no se edita.
- **L1.4** Dado la base migrada, cuando se intenta insertar directamente en MySQL un teléfono `1234567`, un precio `0`, una cantidad `1000`, o una oportunidad `perdida` sin motivo, entonces MySQL rechaza la fila (CHECK).
- **L1.5** Dado las dos semillas cargadas, entonces ningún correo, NIT ni teléfono del `SectorSeeder` repite uno de la verificación y ningún asesor pasa de 10 clientes.

#### L2 · Cuentas y roles

- **L2.1** Dado cualquier visitante, cuando abre `/register`, entonces recibe 404: la página y la ruta de registro no existen. Tampoco existen recuperación de contraseña ni borrado de la propia cuenta.
- **L2.2** Dado `admin@crm.test`, cuando inicia sesión, entonces entra al panel; cuando cierra sesión, vuelve al inicio de sesión.
- **L2.3** Dado `valeria@crm.test` (asesora) con su contraseña correcta, cuando intenta entrar al panel, entonces no entra y ve «Su cuenta es de asesor de ventas. Ingrese desde la aplicación de ventas.»
- **L2.4** Dado `ivan@crm.test` (desactivado), cuando intenta entrar, entonces no entra y ve «Su cuenta está desactivada. Comuníquese con el administrador.»
- **L2.5** Dado un jefe de tienda con sesión abierta, cuando el administrador lo desactiva, entonces en su siguiente petición pierde la sesión y vuelve al inicio de sesión con un aviso.
- **L2.6** Dado el administrador, cuando crea una cuenta, entonces indica nombre, correo (único), contraseña (mínimo 8 caracteres), rol, jefe de tienda (obligatorio solo para asesores y debe ser un jefe de tienda activo; vacío para los demás roles) y estado. La contraseña se guarda con `Hash::make`.
- **L2.7** Dado el administrador, cuando edita una cuenta, entonces puede cambiar los mismos campos; la contraseña es opcional (si se deja vacía, no cambia). No existe la acción de borrar.
- **L2.8** Dado el administrador editando su propia cuenta, cuando intenta desactivarse o cambiarse el rol, entonces el formulario vuelve con un error y nada cambia.
- **L2.9** Dado un jefe de tienda con asesores en su equipo, cuando el administrador intenta cambiarle el rol o desactivarlo, entonces se rechaza con «Reasigne primero a los asesores de su equipo.»
- **L2.10** Dado un asesor con clientes asignados u oportunidades, cuando el administrador intenta cambiarle el rol, entonces se rechaza; sí se puede desactivar (ver decisión D4).
- **L2.11** Dado un jefe de tienda, cuando intenta abrir las páginas de cuentas o de catálogo, entonces recibe 403.

#### L3 · Catálogo

- **L3.1** Dado el administrador, cuando agrega un producto con nombre único, precio y categoría opcional, entonces aparece en el catálogo como activo.
- **L3.2** Dado un precio `0`, `-5`, `abc` o `10.555`, cuando se guarda, entonces vuelve el formulario con «El precio debe ser mayor que cero y tener como máximo dos decimales.»
- **L3.3** Dado un producto, cuando el administrador lo desactiva, entonces deja de poder agregarse a cotizaciones pero sigue en las cotizaciones que ya lo tienen. No existe la acción de borrar.
- **L3.4** Dado la cotización «Renovación de planes» con Plan avanzado a Q2,600.00, cuando el administrador cambia el precio del Plan avanzado, entonces la línea, el total de la cotización y los reportes no cambian.

#### L4 · Clientes y asignación

- **L4.1** Dado el administrador, cuando abre Clientes, entonces ve todos los clientes con búsqueda por nombre o NIT (contiene), filtro por asesor y filtro «sin asignar». El jefe de tienda ve solo los de su equipo y los disponibles.
- **L4.2** Dado el formulario de cliente con NIT `452 1817-k` y teléfono `+502 5555-1234`, cuando se guarda, entonces se guardan `4521817K` y `55551234`. Con NIT `cf` se guarda NULL y se muestra «CF».
- **L4.3** Dado el NIT `4521817-k` cuando ya existe `4521817K`, o un teléfono ya registrado, cuando se guarda, entonces vuelve con «Ya existe un cliente con ese NIT.» o «Ya existe un cliente con ese teléfono.» (comparando valores ya normalizados). Si dos guardados simultáneos pasan la validación, el índice único de la base decide y el segundo recibe el mismo mensaje.
- **L4.4** Dado un asesor activo con 9 clientes, cuando se le asigna uno más, entonces queda con 10. Dado un asesor con 10, cuando se le asigna otro, entonces se rechaza con «La cartera de ese asesor ya tiene 10 clientes, el máximo permitido.»
- **L4.5** Dado un cliente asignado, cuando se reasigna a otro asesor, entonces sus cotizaciones abiertas pasan al nuevo asesor en la misma transacción y las cerradas conservan su asesor (decisión D2).
- **L4.6** Dado un cliente con cotizaciones abiertas, cuando se intenta liberar, entonces se rechaza con «El cliente tiene cotizaciones abiertas: ciérrelas o reasígnelo.» (decisión D3). Sin cotizaciones abiertas, queda disponible.
- **L4.7** Dado un asesor desactivado, cuando se intenta asignarle un cliente, entonces se rechaza.
- **L4.8** Dado el administrador, cuando elimina un cliente sin oportunidades, entonces se borra (con sus actividades). Con oportunidades, se rechaza con «No se puede eliminar un cliente que tiene cotizaciones.» El jefe de tienda no elimina clientes.

#### L5 · Equipos y visibilidad

- **L5.1** Dado `sergio@crm.test`, cuando abre la lista de clientes, entonces ve los de Valeria y Diego y los disponibles, y no ve los de Carlos ni el de Iván.
- **L5.2** Dado `sergio@crm.test`, cuando escribe a mano la dirección de un cliente de Carlos (equipo de Sandra), entonces recibe 404.
- **L5.3** Dado `sergio@crm.test`, cuando intenta asignar un cliente a Carlos (enviando su id a mano), entonces se rechaza: solo asigna a asesores activos de su equipo.
- **L5.4** Dado `sergio@crm.test`, cuando abre «Mi equipo», entonces ve a Valeria (3 de 10) y Diego (2 de 10) con sus ventas del mes seleccionado (octubre 2026: Valeria 2 ventas por Q9,250.00; Diego 1 por Q6,000.00).

#### L6 · Oportunidades y reportes

- **L6.1** Dado el administrador, cuando abre Cotizaciones, entonces ve todas con filtro por etapa y por asesor, el total de cada una y la fecha de cierre en hora de Guatemala («Equipo para sucursal» muestra 31/10/2026 21:30). El jefe de tienda ve solo las de su equipo; una de otro equipo responde 404.
- **L6.2** En el panel las cotizaciones son de solo lectura: no hay formularios para crearlas ni cambiarlas.
- **L6.3** Dado la semilla de verificación y el reporte de octubre 2026, entonces el panel muestra las cifras de control: por asesor, por equipo, toda la empresa y por producto (sección 7 de este documento).
- **L6.4** Dado el reporte de noviembre 2026, entonces Valeria tiene 1 venta por Q3,600.00 y pronóstico Q2,512.88.
- **L6.5** El jefe de tienda ve el reporte de su equipo; el administrador, el de toda la empresa.

#### L7 · Validación en el servidor

- **L7.1** Toda entrada del panel se valida en el servidor (FormRequest), con mensajes en español que tratan de usted. Si falla, el formulario vuelve con lo escrito y el mensaje junto a cada campo.
- **L7.2** Los casos de la tabla siguiente dan el mismo resultado en el panel y en la API:

| Entrada | Resultado |
|---|---|
| NIT `452 1817-k` | Válido, se guarda `4521817K` |
| NIT `cf` o `CF` | Válido, se guarda NULL |
| NIT `000045218` → `45218` | Se compacta quitando ceros; se valida el dígito |
| NIT `12345678` | Inválido (dígito verificador) |
| NIT `K` o `1` | Inválido (menos de 2 caracteres) |
| Teléfono `+502 5555-1234` | Válido, `55551234` |
| Teléfono `(502) 7761.2345` | Válido, `77612345` |
| Teléfono `502 5555 1234` | Válido, `55551234` (el prefijo 502 solo se quita si después quedan 8 dígitos) |
| Teléfono `50212345` | Válido, `50212345` (son los 8 dígitos del número, no un prefijo) |
| Teléfono `1234567` | Inválido (7 dígitos) |
| Teléfono `15551234` | Inválido (empieza en 1) |
| Cartera llena | Rechazo (409 en la API) |

### 4.2 API REST

#### A1 · Inicio de sesión con JWT

- **A1.1** Dado `valeria@crm.test` con la contraseña pública de la semilla, cuando envía `POST /api/auth/login`, entonces recibe 200 con `{ token, usuario: { id, nombre, correo } }`.
- **A1.2** Dado `admin@crm.test`, `sergio@crm.test` o `ivan@crm.test` con la contraseña correcta, entonces reciben 403 con `{ "error": "Su cuenta no puede usar la aplicación de ventas." }` y ningún token.
- **A1.3** Dado un correo inexistente o una contraseña incorrecta, entonces la respuesta es 401 con exactamente el mismo cuerpo: `{ "error": "Correo o contraseña incorrectos." }`.
- **A1.4** Dado un cuerpo sin `correo` o sin `clave`, entonces responde 422 con un mensaje por campo; con JSON mal formado, 400.
- **A1.5** El token es un JWT HS256 con el id del usuario en `sub` y expiración configurable en `.env` (`JWT_EXPIRES_IN`). Las contraseñas se verifican con `bcryptjs`.

#### A2 · Middleware de autenticación

- **A2.1** Dado cualquier ruta salvo el login, cuando llega sin `Authorization: Bearer <token>`, con un token alterado, vencido o firmado con otro algoritmo, entonces responde 401.
- **A2.2** Dado un token válido de Valeria, cuando el administrador la desactiva o le cambia el rol, entonces su siguiente petición responde 401: el usuario se relee en la base en cada petición.

#### A3 · Clientes y cartera

- **A3.1** `GET /api/clientes?q=` devuelve solo los clientes de su cartera; `q` busca «contiene» en nombre o NIT, como parámetro SQL.
- **A3.2** `POST /api/clientes` crea el cliente ya en su cartera (201). Cartera llena → 409; NIT o teléfono repetido → 409; datos inválidos → 422 con un mensaje por campo.
- **A3.3** `GET /api/clientes/disponibles` devuelve solo `[{ id, nombre }]`.
- **A3.4** Dado un cliente disponible y un asesor con espacio, cuando envía `POST /api/clientes/:id/tomar`, entonces recibe 200 con el cliente. Si otro asesor ya lo tomó, 409; si no existe, 404; si su cartera está llena, 409.
- **A3.5** Dado 10 asesores que toman el mismo cliente a la vez, entonces exactamente uno recibe 200 y los demás 409.
- **A3.6** Dado Carlos con 9 clientes que envía 5 tomas o altas simultáneas, entonces solo una tiene éxito y su cartera queda en 10.
- **A3.7** Dado Valeria, cuando pide o modifica un cliente de Diego, entonces recibe 404.
- **A3.8** El NIT NULL se devuelve como `"CF"`; nunca se devuelve `vendedor_id`.

#### A4 · Oportunidades y productos

- **A4.1** `POST /api/oportunidades { cliente_id, titulo }` crea la cotización en `prospecto` con su registro de historial de creación (etapa anterior NULL) en la misma transacción. Un `cliente_id` que no está en su cartera responde 422 con `errores.cliente_id`. `etapa` y `vendedor_id` del cuerpo se ignoran.
- **A4.2** `POST /api/oportunidades/:id/productos { producto_id, cantidad }` copia el precio del catálogo a la línea; `precio_unitario` del cuerpo se ignora. Producto inactivo o inexistente → 422; producto ya presente → 409; cantidad fuera de 1–999 o no entera → 422.
- **A4.3** El total y los subtotales los calcula el servidor; la probabilidad sale de la etapa.
- **A4.4** El cambio de etapa, su registro en el historial y la fecha de cierre ocurren en una sola transacción con la fila bloqueada (`FOR UPDATE`). Dos cambios simultáneos sobre la misma cotización no dejan dos registros.
- **A4.5** Transiciones según la decisión D1. Una transición no permitida responde 422 con `errores.etapa`; ganar sin productos, 422 con `errores.etapa`; perder sin motivo (o con más de 255 caracteres tras recortar espacios), 422 con `errores.motivo_perdida`; cotización cerrada, 409; RS-1, 409.
- **A4.6** Una cotización cerrada no cambia título, etapa ni productos: 409.

#### A5 · Actividades

- **A5.1** `POST /api/clientes/:id/actividades` crea un seguimiento de un cliente de su cartera (cliente ajeno → 404). `vence_en` es opcional; si viene, debe ser ISO 8601 con zona (`Z` o `±hh:mm`); sin zona → 422.
- **A5.2** `GET /api/actividades?estado=pendiente|completada` lista los seguimientos de los clientes de su cartera; otro valor de `estado` → 400.
- **A5.3** `vence_en` se devuelve en UTC con `Z`; `vencida` = no completada y `vence_en` anterior al momento de responder.
- **A5.4** `PATCH /api/actividades/:id { completada }` exige un booleano (si no, 422).

#### A6 · Resumen del mes

- **A6.1** Dado Valeria y `GET /api/reportes/resumen?mes=2026-10`, entonces responde `{ "mes": "2026-10", "ventas": 2, "total": 9250, "pronostico": 2512.88, "cartera": { "clientes": 3, "maximo": 10 } }` con números, no texto.
- **A6.2** Sin `mes`, usa el mes actual de Guatemala. `mes=2026-13` u `octubre` → 400.

#### A7 · Errores, códigos y formato

- **A7.1** Toda respuesta es JSON, incluidas las de rutas inexistentes (404) y errores inesperados (500 con `{ "error": "Ocurrió un error inesperado." }`; el detalle solo en la consola).
- **A7.2** Validación: 422 con `{ "errores": { campo: mensaje } }`; los demás errores, `{ "error": mensaje }`.
- **A7.3** Campos que el contrato no lista se ignoran (decisión D5).

#### A8 · Documentación

- **A8.1** El README tiene la tabla de endpoints y los pasos exactos para levantar las tres piezas desde cero.
- **A8.2** `docs/api.postman_collection.json` tiene al menos una petición por endpoint, los errores principales (400, 401, 403, 404, 409, 422) y la prueba de RS-1.

### 4.3 SPA del asesor

- **F1 · Sesión.** Dado un asesor, cuando inicia sesión, el token se guarda en LocalStorage (lo único que se guarda ahí) y se borra al cerrar sesión. Con una cuenta que no es de asesor, se muestra el mensaje del 403. Si cualquier petición responde 401 en plena sesión, la SPA vuelve al inicio de sesión con el aviso «Su sesión terminó. Inicie sesión de nuevo.»
- **F2 · Cartera.** Lista de sus clientes con búsqueda en el servidor y contador «n de 10». Alta de cliente con los errores del servidor junto a cada campo, conservando lo escrito. Lista de disponibles con botón «Tomar»; si otro lo tomó antes, se muestra el mensaje del 409.
- **F3 · Embudo.** Tablero con una columna por etapa abierta (Interesado → Negociación) y lista de cerradas. Detalle con productos (cantidad, precio guardado, subtotal), total e historial en hora de Guatemala. Agregar, cambiar cantidad y quitar productos; botones de etapa según D1; perder pide el motivo.
- **F4 · Seguimientos.** Pendientes y completados; los vencidos se resaltan. Nuevo seguimiento con fecha y hora local que se envía como ISO 8601 con `-06:00`. Marcar como completado.
- **F5 · Resumen.** Selector de mes; ventas, total vendido, pronóstico y cartera en quetzales (`Q9,250.00`). Las fechas en hora de Guatemala sin importar la zona de la computadora.
- **F6 · Calidad.** Patrón estado → render y delegación de eventos. Indicador de carga con peticiones en curso. Si la API está apagada: «No se pudo conectar con el servidor. Verifique que la API esté encendida.» Todo texto de la API se escapa antes de insertarlo. Usable a 375 px sin desplazamiento horizontal.

### 4.4 Seguridad (S1–S8)

| Código | Regla | Criterio |
|---|---|---|
| S1 | Solo Laravel genera hashes; la API solo los verifica. Ninguna contraseña en texto plano; en el código, solo la contraseña pública de la semilla (seeders, README y Postman) | Dado `SELECT password FROM users`, todos empiezan con `$2y$`. En la API no hay `hash(`. Buscar la contraseña pública en el repositorio solo la encuentra en seeders, README y Postman. |
| S2 | Secretos fuera del repositorio | `.env` ignorado en `laravel/` y `api/`; existen `.env.example` sin valores reales; `git log --all -- '*.env'` vacío; `JWT_SECRET` ≥ 32 caracteres aleatorios. |
| S3 | Nada del usuario se concatena en SQL: la API usa `?`, el panel Eloquent o enlaces de parámetros, nunca `DB::raw` con datos del usuario | Dado `?q=' OR 1=1 --` en la API o en el buscador del panel, no aparecen clientes ajenos ni errores SQL. |
| S4 | Las respuestas no exponen hashes, llaves internas ni datos de otro asesor | Ninguna respuesta de la API contiene `password`, `vendedor_id`, `user_id` ni `supervisor_id`. |
| S5 | Lo ajeno responde 404 en las dos puertas | Valeria lee/modifica un cliente de Diego → 404 (API). Sergio abre o edita un cliente del equipo de Sandra → 404 (panel). |
| S6 | CORS solo para el origen exacto de la SPA, desde `.env`; nunca `*` | Una página en otro origen no puede llamar a la API. |
| S7 | Texto escapado | Un cliente llamado `<img src=x onerror=alert(1)>` se ve como texto en la SPA y en el panel. En Blade nunca `{!! !!}` con datos del usuario. |
| S8 | Reglas que aguantan peticiones simultáneas | Tomar, cartera máxima, cambio de etapa y duplicados se prueban con peticiones simultáneas; para duplicados el árbitro final es el índice único, no solo una consulta previa. |

---

## 5. Contrato de la API

Base: `http://localhost:3000/api`. Todo viaja en JSON. Todas las rutas exigen `Authorization: Bearer <token>` salvo el inicio de sesión.

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
| POST | /clientes/:id/actividades | `{ tipo, descripcion, vence_en }`; vence_en opcional | 201, la actividad | 400, 401, 404, 422 |
| GET | /actividades | `?estado=pendiente` o `completada` | 200, actividades de los clientes de su cartera | 400, 401 |
| PATCH | /actividades/:id | `{ completada }` | 200, la actividad | 400, 401, 404, 422 |
| GET | /oportunidades | `?etapa=` | 200, resumen de sus oportunidades | 400, 401 |
| POST | /oportunidades | `{ cliente_id, titulo }` | 201, detalle, en prospecto | 400, 401, 422 |
| GET | /oportunidades/:id | — | 200, detalle | 401, 404 |
| PATCH | /oportunidades/:id | `{ titulo }` | 200, detalle | 400, 401, 404, 409, 422 |
| PATCH | /oportunidades/:id/etapa | `{ etapa, motivo_perdida }`; motivo solo al perder | 200, detalle | 400, 401, 404, 409, 422 |
| POST | /oportunidades/:id/productos | `{ producto_id, cantidad }` | 201, detalle | 400, 401, 404, 409, 422 |
| PATCH | /oportunidades/:id/productos/:lineaId | `{ cantidad }` | 200, detalle | 400, 401, 404, 409, 422 |
| DELETE | /oportunidades/:id/productos/:lineaId | — | 204, sin cuerpo | 401, 404, 409 |
| GET | /reportes/resumen | `?mes=AAAA-MM`; por omisión, el mes actual de Guatemala | 200, resumen del mes | 400, 401 |

`:lineaId` es el id de la línea (el `id` de cada elemento de `productos` en el detalle). Un `?etapa=` con un valor que no es etapa responde 400.

### 5.1 Formas de respuesta

Cliente:
```json
{ "id": 1, "nombre": "Comercial El Quetzal", "nit": "4521817K",
  "telefono": "55551234", "correo": "compras@elquetzal.test" }
```

Inicio de sesión:
```json
{ "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": { "id": 4, "nombre": "Valeria López", "correo": "valeria@crm.test" } }
```

Resumen de oportunidad (lista): `{ id, cliente: { id, nombre }, titulo, etapa, probabilidad, total, fecha_cierre }`.

Detalle de oportunidad:
```json
{
  "id": 1,
  "cliente": { "id": 1, "nombre": "Comercial El Quetzal" },
  "titulo": "Renovación de planes",
  "etapa": "ganada",
  "probabilidad": 100,
  "total": 5650,
  "fecha_cierre": "2026-10-05T16:00:00.000Z",
  "motivo_perdida": null,
  "productos": [
    { "id": 1, "producto_id": 2, "nombre": "Plan avanzado",
      "cantidad": 2, "precio_unitario": 2600, "subtotal": 5200 },
    { "id": 2, "producto_id": 3, "nombre": "Instalación",
      "cantidad": 1, "precio_unitario": 450, "subtotal": 450 }
  ],
  "historial": [
    { "etapa_anterior": null, "etapa_nueva": "prospecto",
      "usuario": "Valeria López", "fecha": "2026-09-23T16:00:00.000Z" }
  ]
}
```

Actividad:
```json
{ "id": 2, "cliente": { "id": 2, "nombre": "Ferretería Xela" },
  "tipo": "tarea", "descripcion": "Enviar propuesta de capacitación",
  "vence_en": "2030-01-15T15:00:00.000Z", "completada": false, "vencida": false }
```

Resumen del mes:
```json
{ "mes": "2026-10", "ventas": 2, "total": 9250, "pronostico": 2512.88,
  "cartera": { "clientes": 3, "maximo": 10 } }
```

Errores:
```json
{ "error": "Su cartera ya tiene 10 clientes, el máximo permitido." }
{ "errores": { "nit": "Escriba un NIT válido (con su dígito verificador) o CF.",
               "telefono": "Escriba un teléfono de Guatemala de 8 dígitos." } }
```

### 5.2 Códigos de estado

| Código | Cuándo |
|---|---|
| 200 | Lectura o modificación correcta |
| 201 | Se creó un cliente, una oportunidad, una línea o una actividad |
| 204 | Se quitó un producto de una oportunidad; sin cuerpo |
| 400 | JSON mal formado, falta el cuerpo, o un filtro/parámetro no existe |
| 401 | Credenciales incorrectas; o falta el token, está alterado, venció o la cuenta ya no es válida |
| 403 | Credenciales correctas, pero la cuenta no puede usar la API (no es asesor o está desactivada) |
| 404 | El recurso no existe o es de otro asesor |
| 409 | Choca con el estado actual: cartera llena, cliente ya tomado, NIT o teléfono repetido, producto repetido, cotización cerrada, RS-1 |
| 422 | La petición se entiende, pero los datos violan una regla |
| 500 | Error inesperado; mensaje genérico |

---

## 6. Modelo de datos y dónde se cumple cada regla

Todas las fechas se guardan en UTC (`APP_TIMEZONE=UTC`, conexión MySQL con `time_zone = '+00:00'`). Todas las tablas salvo `historial_etapas` tienen `created_at` y `updated_at`.

### 6.1 Tablas

**users** (tabla de Laravel + migración `add_crm_columns_to_users_table`)

| Columna | Tipo | Regla | Panel | API | Base |
|---|---|---|---|---|---|
| rol | ENUM(administrador, supervisor, vendedor) | Obligatorio; por omisión vendedor | FormRequest | Solo lee | ENUM + DEFAULT |
| supervisor_id | BIGINT UNSIGNED NULL → users.id | Obligatorio para vendedores, vacío para los demás; debe ser supervisor activo | FormRequest (existencia, rol y activo) | — | FK + CHECK `(rol = 'vendedor') = (supervisor_id IS NOT NULL)` |
| activo | BOOLEAN | Por omisión verdadero; no se borran | Sin acción de borrar; middleware de cuenta activa | Middleware relee | DEFAULT 1 |

**productos**

| Columna | Tipo | Regla | Panel | API | Base |
|---|---|---|---|---|---|
| nombre | VARCHAR(120) | Obligatorio y único | FormRequest | — | UNIQUE |
| precio | DECIMAL(10,2) | > 0, máximo 2 decimales | FormRequest (`gt:0`, `decimal:0,2`) | — | CHECK `precio > 0` |
| activo | BOOLEAN | Solo activos en cotizaciones; no se borran | Sin acción de borrar | `WHERE activo = 1` al agregar | DEFAULT 1 |
| categoria | ENUM(equipo, pieza, periferico, software, garantia, servicio) NULL | Capa de sector | FormRequest | Campo extra opcional | ENUM NULL |

**clientes**

| Columna | Tipo | Regla | Panel | API | Base |
|---|---|---|---|---|---|
| vendedor_id | BIGINT UNSIGNED NULL → users.id | NULL = disponible; máx. 10 por asesor | Transacción + `lockForUpdate` sobre el asesor y conteo | Transacción + `FOR UPDATE` + UPDATE condicional | FK |
| nombre | VARCHAR(150) | Obligatorio | FormRequest | Validación | NOT NULL |
| nit | VARCHAR(12) NULL | NIT válido compacto o NULL (CF); único | `Identidad::compactarNit/nitValido` + unique | `identidad.js` + 409 | UNIQUE + CHECK formato `^[1-9][0-9]{0,10}[0-9K]$` |
| telefono | CHAR(8) | 8 dígitos que empiezan en 2–9; único | `Identidad::normalizarTelefono` + unique | `identidad.js` + 409 | UNIQUE + CHECK `^[2-9][0-9]{7}$` |
| correo | VARCHAR(150) NULL | Formato de correo válido | `email` | Validación | — |

**oportunidades**

| Columna | Tipo | Regla | Dónde |
|---|---|---|---|
| cliente_id | → clientes.id | Obligatorio | FK |
| vendedor_id | → users.id | Dueño; sale del token | API; FK |
| titulo | VARCHAR(150) | Obligatorio | API; NOT NULL |
| etapa | ENUM(prospecto, calificado, propuesta, negociacion, ganada, perdida) | Por omisión prospecto; transiciones D1 | API; ENUM + DEFAULT |
| motivo_perdida | VARCHAR(255) NULL | Presente si y solo si perdida; no vacío | API; CHECK `(etapa = 'perdida') = (motivo_perdida IS NOT NULL)` y `motivo_perdida IS NULL OR CHAR_LENGTH(TRIM(motivo_perdida)) > 0` |
| fecha_cierre | DATETIME NULL | Presente si y solo si ganada o perdida | API; CHECK `(etapa IN ('ganada','perdida')) = (fecha_cierre IS NOT NULL)` |
| — | — | RS-1 | API (transacción del cambio de etapa); en la base no aplica (ver sección 2) |

**oportunidad_productos**

| Columna | Tipo | Regla | Dónde |
|---|---|---|---|
| oportunidad_id | → oportunidades.id ON DELETE CASCADE | Al borrar la oportunidad se borran sus líneas | FK |
| producto_id | → productos.id | Una vez por oportunidad | UNIQUE (oportunidad_id, producto_id) |
| cantidad | SMALLINT | 1 a 999 | API; CHECK |
| precio_unitario | DECIMAL(10,2) | Copia del catálogo al agregar; > 0 | API (`INSERT ... SELECT precio`); CHECK |

**historial_etapas** (solo `created_at`)

| Columna | Tipo | Regla |
|---|---|---|
| oportunidad_id | → oportunidades.id ON DELETE CASCADE | |
| usuario_id | → users.id | Quién hizo el cambio |
| etapa_anterior | ENUM de etapas, NULL | NULL en la creación |
| etapa_nueva | ENUM de etapas | Obligatoria |
| created_at | DATETIME | Cuándo |

**actividades**

| Columna | Tipo | Regla |
|---|---|---|
| cliente_id | → clientes.id ON DELETE CASCADE | Al borrar el cliente se borran sus actividades |
| vendedor_id | → users.id | Quién la registró (sale del token) |
| tipo | ENUM(llamada, reunion, tarea) | Obligatorio |
| descripcion | VARCHAR(500) | Obligatoria |
| vence_en | DATETIME NULL | UTC |
| completada | BOOLEAN | Por omisión falso |

### 6.2 Reglas de cálculo

- **Probabilidad:** prospecto 10, calificado 25, propuesta 50, negociacion 75, ganada 100, perdida 0.
- **Total de una oportunidad:** `SUM(cantidad × precio_unitario)` de sus líneas.
- **Mes de una venta:** mes calendario de `fecha_cierre` en hora de Guatemala (UTC−6 fijo). Se filtra con el rango UTC `[AAAA-MM-01 06:00, primer día del mes siguiente 06:00)`.
- **Pronóstico:** `ROUND(SUM(total × probabilidad / 100), 2)` sobre las oportunidades abiertas, sin filtro de mes, redondeando solo al final.
- **Cartera:** número de clientes con `vendedor_id` = el asesor.

---

## 7. Semilla de verificación y cifras de control

`VerificacionSeeder` carga exactamente la semilla de la sección 11 del enunciado (7 cuentas, 5 productos, 21 clientes, 11 oportunidades con sus líneas, 43 registros de historial y 4 actividades). Las fechas del historial siguen la sugerencia del enunciado: tres días entre registros, terminando en la fecha de cierre, o en 2026-10-02 16:00 UTC si sigue abierta.

Cifras que deben verse en el panel y en la API con solo esa semilla:

| Quién | Mes | Ventas | Total vendido | Pronóstico | Cartera |
|---|---|---|---|---|---|
| Valeria López | octubre 2026 | 2 | Q9,250.00 | Q2,512.88 | 3 de 10 |
| Valeria López | noviembre 2026 | 1 | Q3,600.00 | Q2,512.88 | 3 de 10 |
| Diego Castillo | octubre 2026 | 1 | Q6,000.00 | Q112.50 | 2 de 10 |
| Carlos Ajú | octubre 2026 | 1 | Q7,200.00 | Q4,125.75 | 9 de 10 |
| Equipo de Sergio Ruiz | octubre 2026 | 3 | Q15,250.00 | Q2,625.38 | |
| Equipo de Sandra Pérez | octubre 2026 | 1 | Q7,200.00 | Q4,125.75 | |
| Toda la empresa | octubre 2026 | 4 | Q22,450.00 | Q6,751.13 | |

| Producto · octubre 2026 | Unidades vendidas | Total |
|---|---|---|
| Plan básico | 5 | Q6,000.00 |
| Plan avanzado | 2 | Q5,200.00 |
| Instalación | 1 | Q450.00 |
| Soporte anual | 3 | Q10,800.00 |

`SectorSeeder` corre después y agrega datos de CompuPartes Xela: un jefe de tienda y tres asesores propios (correos `@compupartes.test`, en un equipo distinto de los de la semilla), un catálogo de computadoras y piezas con precios de referencia del mercado guatemalteco, clientes con NIT válidos y teléfonos en el rango `48xxxxxx`, cotizaciones en todas las etapas con su historial, y seguimientos.

---

## 8. Decisiones

| # | Pregunta | Decisión | Alternativa descartada y por qué |
|---|---|---|---|
| D1 | ¿Qué transiciones del embudo se permiten además del mínimo? | **Avanzar** una etapa a la vez entre las abiertas; **retroceder** una etapa entre las abiertas (p. ej. propuesta → calificado, cuando el cliente cambia de necesidad y hay que recotizar); **ganar** solo desde negociación; **perder** desde cualquier etapa abierta. Cualquier otra transición (saltos, ganar desde propuesta, salir de una cerrada) responde 422 con `errores.etapa`, salvo una cotización cerrada, que responde 409. Cambiar a la misma etapa en la que está también es 422. | **Saltos libres:** una cotización podría pasar de 10 % a 75 % sin trabajo real y el pronóstico dejaría de ser confiable. **Ganar desde cualquier etapa:** saltaría la negociación de precio, que en piezas es donde se fija el descuento. |
| D2 | ¿Qué pasa con las oportunidades y actividades de un cliente reasignado? | Las **cerradas** (ganadas y perdidas) conservan su asesor: el crédito de la venta no se mueve. Las **abiertas** pasan al nuevo asesor en la misma transacción que la reasignación. Las **actividades** siguen al cliente: el nuevo asesor las ve porque el cliente está en su cartera; `vendedor_id` de la actividad sigue indicando quién la registró. | **Mover también las cerradas:** cambiaría los reportes de meses ya cerrados y le quitaría la comisión al asesor que vendió. **Dejar las abiertas con el asesor anterior:** ese asesor seguiría trabajando una cotización de un cliente que ya no puede ver. |
| D3 | ¿Se puede liberar un cliente con oportunidades abiertas? | **No.** El panel lo rechaza con un mensaje claro hasta que las cotizaciones abiertas se cierren o el cliente se reasigne a otro asesor. | **Marcarlas como perdidas automáticamente:** se pierde información y se altera el pronóstico sin decisión humana. **Dejarlas huérfanas con el asesor anterior:** el que tome el cliente no vería sus cotizaciones. |
| D4 | ¿Qué pasa con la cartera de un asesor desactivado? | Sus clientes **quedan asignados** hasta que el jefe de tienda o el administrador los reasigne. El panel marca esos clientes con el aviso «asesor inactivo» y no permite asignarle clientes nuevos. Coincide con la semilla: Iván Toj está inactivo y conserva a Hotel Los Pinos. | **Liberarlos automáticamente:** cualquier asesor podría tomar clientes con cotizaciones avanzadas sin que el jefe decida quién los sigue. |
| D5 | ¿Qué hace la API con campos que el contrato no lista? | **Los ignora:** cada controlador lee solo los campos permitidos (lista blanca). Nunca se usan `vendedor_id`, `etapa` al crear, `precio_unitario`, etc. | **Rechazarlos con 422:** más estricto, pero rompe clientes que mandan campos de más sin mala intención (por ejemplo, la SPA reenviando el objeto completo). |
| D6 | ¿Cuál es su regla propia? | **RS-1 «Cada equipo con su garantía»** (sección 2). | Las tres alternativas de la sección 2. |

### Decisiones adicionales del panel

- **Recuperación de contraseña y verificación de correo de Breeze:** se eliminan. Las contraseñas las asigna el administrador; no hay servidor de correo configurado.
- **Perfil propio:** cada usuario del panel puede cambiar su nombre y su contraseña desde «Mi perfil», pero no su correo ni borrar su cuenta (las cuentas no se borran).
- **Catálogo para el jefe de tienda:** no tiene acceso (403); el catálogo lo administra solo el administrador.
- **Asesor que cambia de equipo:** el administrador puede cambiar el jefe de tienda de un asesor; sus clientes y cotizaciones se van con él al nuevo equipo.
