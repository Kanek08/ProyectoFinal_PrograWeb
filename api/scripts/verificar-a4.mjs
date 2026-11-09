// Verificación de A4 (oportunidades y productos) contra la API corriendo.
//
// Con SOLO la semilla de verificación (criterios A4.1–A4.6, S4, S5, S8 y RS-1.4):
//   (desde laravel/)  php artisan migrate:fresh --seeder=VerificacionSeeder
//   (desde api/)      CLAVE_SEMILLA=<contraseña pública del README> node --env-file=.env scripts/verificar-a4.mjs
//
// Con las dos semillas (agrega la regla propia RS-1.5 con andres@compupartes.test):
//   (desde laravel/)  php artisan migrate:fresh --seed
//   (desde api/)      igual que arriba
//
// En PowerShell:  $env:CLAVE_SEMILLA = "<contraseña pública del README>"; node --env-file=.env scripts/verificar-a4.mjs
// Modifica datos: al terminar, vuelva a cargar la semilla.

const API = process.env.API_URL ?? 'http://localhost:3000/api';
const CLAVE = process.env.CLAVE_SEMILLA;
if (!CLAVE) {
  console.error('Defina CLAVE_SEMILLA con la contraseña pública de la semilla (ver README).');
  process.exit(1);
}

let fallas = 0;
const ok = (nombre, condicion, detalle = '') => {
  if (!condicion) fallas++;
  console.log(`${condicion ? '✔' : '✘'} ${nombre}${!condicion && detalle ? `  → ${detalle}` : ''}`);
};

async function pedir(metodo, ruta, { token, cuerpo } = {}) {
  const r = await fetch(API + ruta, {
    method: metodo,
    headers: {
      ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await r.text();
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch { /* no es JSON */ }
  return { status: r.status, json, texto };
}

const tokenDe = async (correo) => {
  const r = await pedir('POST', '/auth/login', { cuerpo: { correo, clave: CLAVE } });
  return r.status === 200 ? r.json.token : null;
};
const contar = (arr, fn) => arr.filter(fn).length;

const tVal = await tokenDe('valeria@crm.test');
const tDie = await tokenDe('diego@crm.test');
if (!tVal || !tDie) {
  console.error('No se pudo iniciar sesión con Valeria o Diego: ¿está la API corriendo y la semilla cargada?');
  process.exit(1);
}
const V = (metodo, ruta, cuerpo) => pedir(metodo, ruta, { token: tVal, cuerpo });

// ─── Lecturas ────────────────────────────────────────────────────────────
console.log('\nA4 · Lecturas');
const lista = await V('GET', '/oportunidades');
ok('GET /oportunidades → 200 con las 7 de Valeria', lista.status === 200 && lista.json.length === 7, lista.texto);
ok('el resumen trae cliente, probabilidad y total, sin productos ni historial',
  lista.json?.every((o) => o.cliente?.nombre && typeof o.probabilidad === 'number' && typeof o.total === 'number'
    && !('productos' in o) && !('historial' in o)));
const ganadas = await V('GET', '/oportunidades?etapa=ganada');
ok('?etapa=ganada → 3', ganadas.status === 200 && ganadas.json.length === 3, ganadas.texto);
ok('?etapa=inventada → 400', (await V('GET', '/oportunidades?etapa=inventada')).status === 400);

const renovacion = lista.json.find((o) => o.titulo === 'Renovación de planes');
const det = await V('GET', `/oportunidades/${renovacion.id}`);
ok('detalle de «Renovación de planes»: total 5650, probabilidad 100',
  det.status === 200 && det.json.total === 5650 && det.json.probabilidad === 100, det.texto);
const avanzado = det.json?.productos.find((p) => p.nombre === 'Plan avanzado');
ok('R6 la línea conserva el precio cotizado (2600, no 2750.50) y subtotal 5200',
  avanzado?.precio_unitario === 2600 && avanzado.subtotal === 5200 && typeof avanzado.id === 'number', JSON.stringify(avanzado));
ok('historial con 5 registros; el primero con etapa_anterior null y nombre del usuario',
  det.json?.historial.length === 5 && det.json.historial[0].etapa_anterior === null
  && det.json.historial[0].usuario === 'Valeria López' && /Z$/.test(det.json.historial[0].fecha), JSON.stringify(det.json?.historial[0]));
ok('fecha_cierre en ISO UTC', det.json?.fecha_cierre === '2026-10-05T16:00:00.000Z', det.json?.fecha_cierre);
ok('S4 sin vendedor_id, user_id ni password', !/vendedor_id|user_id|supervisor_id|password/.test(lista.texto + det.texto));

const deDiego = (await pedir('GET', '/oportunidades', { token: tDie })).json;
const mantenimiento = deDiego.find((o) => o.titulo === 'Mantenimiento');
ok('S5 Valeria lee una de Diego → 404', (await V('GET', `/oportunidades/${mantenimiento.id}`)).status === 404);
ok('S5 Valeria cambia la etapa de una de Diego → 404',
  (await V('PATCH', `/oportunidades/${mantenimiento.id}/etapa`, { etapa: 'propuesta' })).status === 404);
ok('S5 Valeria le agrega un producto a una de Diego → 404',
  (await V('POST', `/oportunidades/${mantenimiento.id}/productos`, { producto_id: 1, cantidad: 1 })).status === 404);
ok('id no numérico → 404', (await V('GET', '/oportunidades/abc')).status === 404);
ok('id inexistente → 404', (await V('GET', '/oportunidades/999999')).status === 404);

// ─── Crear ───────────────────────────────────────────────────────────────
console.log('\nA4.1 · Crear');
const clientes = (await V('GET', '/clientes')).json;
const quetzal = clientes.find((c) => c.nombre === 'Comercial El Quetzal');
const farmaciaDeDiego = (await pedir('GET', '/clientes', { token: tDie })).json[0];

const ajeno = await V('POST', '/oportunidades', { cliente_id: farmaciaDeDiego.id, titulo: 'Prueba' });
ok('cliente de otra cartera → 422 errores.cliente_id', ajeno.status === 422 && ajeno.json?.errores?.cliente_id, ajeno.texto);
const vacio = await V('POST', '/oportunidades', { cliente_id: quetzal.id, titulo: '   ' });
ok('título vacío → 422 errores.titulo', vacio.status === 422 && vacio.json?.errores?.titulo, vacio.texto);
const largo = await V('POST', '/oportunidades', { cliente_id: quetzal.id, titulo: 'x'.repeat(151) });
ok('título de 151 → 422', largo.status === 422 && largo.json?.errores?.titulo, largo.texto);
ok('sin cuerpo → 400', (await pedir('POST', '/oportunidades', { token: tVal })).status === 400);

const nueva = await V('POST', '/oportunidades', {
  cliente_id: quetzal.id, titulo: '  Laptops para ventas  ', etapa: 'ganada', vendedor_id: 5,
});
ok('201 en prospecto aunque el cuerpo mande etapa y vendedor_id (D5)',
  nueva.status === 201 && nueva.json.etapa === 'prospecto' && nueva.json.probabilidad === 10
  && nueva.json.titulo === 'Laptops para ventas' && nueva.json.total === 0, nueva.texto);
ok('nace con un registro de historial (null → prospecto)',
  nueva.json?.historial.length === 1 && nueva.json.historial[0].etapa_anterior === null
  && nueva.json.historial[0].etapa_nueva === 'prospecto', JSON.stringify(nueva.json?.historial));
ok('no aparece en la lista de Diego', !(await pedir('GET', '/oportunidades', { token: tDie })).json.some((o) => o.id === nueva.json.id));
const N = nueva.json.id;

const titulo = await V('PATCH', `/oportunidades/${N}`, { titulo: 'Laptops para el equipo de ventas' });
ok('PATCH título → 200', titulo.status === 200 && titulo.json.titulo === 'Laptops para el equipo de ventas', titulo.texto);
ok('PATCH título vacío → 422', (await V('PATCH', `/oportunidades/${N}`, { titulo: '' })).status === 422);

// ─── Productos ───────────────────────────────────────────────────────────
console.log('\nA4.2 · Productos');
const catalogo = (await V('GET', '/productos')).json;
const pBasico = catalogo.find((p) => p.nombre === 'Plan básico');
const pAvanzado = catalogo.find((p) => p.nombre === 'Plan avanzado');
const INACTIVO = 5; // Licencia anterior, inactiva en la semilla

ok('producto inactivo → 422 errores.producto_id',
  (await V('POST', `/oportunidades/${N}/productos`, { producto_id: INACTIVO, cantidad: 1 })).json?.errores?.producto_id);
ok('producto inexistente → 422',
  (await V('POST', `/oportunidades/${N}/productos`, { producto_id: 99999, cantidad: 1 })).status === 422);
for (const cantidad of [0, 1000, 1.5, '2', null]) {
  const r = await V('POST', `/oportunidades/${N}/productos`, { producto_id: pBasico.id, cantidad });
  ok(`cantidad ${JSON.stringify(cantidad)} → 422 errores.cantidad`, r.status === 422 && r.json?.errores?.cantidad, r.texto);
}
const agregado = await V('POST', `/oportunidades/${N}/productos`, { producto_id: pAvanzado.id, cantidad: 2, precio_unitario: 1 });
const lineaAv = agregado.json?.productos?.[0];
ok('201; el precio sale del catálogo e ignora precio_unitario del cuerpo',
  agregado.status === 201 && lineaAv?.precio_unitario === pAvanzado.precio && lineaAv.subtotal === 2 * pAvanzado.precio, agregado.texto);
ok('total calculado por el servidor', agregado.json?.total === 2 * pAvanzado.precio, agregado.json?.total);
const repetido = await V('POST', `/oportunidades/${N}/productos`, { producto_id: pAvanzado.id, cantidad: 1 });
ok('producto repetido → 409', repetido.status === 409 && repetido.json?.error, repetido.texto);

const cambiada = await V('PATCH', `/oportunidades/${N}/productos/${lineaAv.id}`, { cantidad: 3 });
ok('PATCH cantidad → 200 y total recalculado', cambiada.status === 200 && cambiada.json.total === 3 * pAvanzado.precio, cambiada.texto);
ok('PATCH cantidad 0 → 422', (await V('PATCH', `/oportunidades/${N}/productos/${lineaAv.id}`, { cantidad: 0 })).status === 422);
ok('línea de otra cotización → 404',
  (await V('PATCH', `/oportunidades/${N}/productos/${avanzado.id}`, { cantidad: 1 })).status === 404);
const quitada = await V('DELETE', `/oportunidades/${N}/productos/${lineaAv.id}`);
ok('DELETE línea → 204 sin cuerpo', quitada.status === 204 && quitada.texto === '', quitada.texto);
ok('DELETE de nuevo → 404', (await V('DELETE', `/oportunidades/${N}/productos/${lineaAv.id}`)).status === 404);

// ─── Etapas ──────────────────────────────────────────────────────────────
console.log('\nA4.5 · Etapas (D1)');
const etapa = (id, e, extra = {}) => V('PATCH', `/oportunidades/${id}/etapa`, { etapa: e, ...extra });
ok('salto prospecto → propuesta → 422 errores.etapa', (await etapa(N, 'propuesta')).json?.errores?.etapa);
ok('misma etapa → 422', (await etapa(N, 'prospecto')).status === 422);
ok('ganar desde prospecto → 422', (await etapa(N, 'ganada')).status === 422);
ok('etapa inventada → 422', (await etapa(N, 'cerrada')).status === 422);
ok('perder sin motivo → 422 errores.motivo_perdida', (await etapa(N, 'perdida')).json?.errores?.motivo_perdida);
ok('perder con motivo de espacios → 422', (await etapa(N, 'perdida', { motivo_perdida: '    ' })).status === 422);
ok('perder con motivo de 256 → 422', (await etapa(N, 'perdida', { motivo_perdida: 'x'.repeat(256) })).status === 422);

const a1 = await etapa(N, 'calificado', { motivo_perdida: 'no se usa' });
ok('avanzar a calificado → 200, probabilidad 25, sin motivo', a1.status === 200 && a1.json.probabilidad === 25
  && a1.json.motivo_perdida === null && a1.json.fecha_cierre === null, a1.texto);
ok('retroceder a prospecto → 200', (await etapa(N, 'prospecto')).status === 200);
await etapa(N, 'calificado');
await etapa(N, 'propuesta');
const neg = await etapa(N, 'negociacion');
ok('avanzar hasta negociación → 200 (75 %)', neg.status === 200 && neg.json.probabilidad === 75, neg.texto);
const sinProd = await etapa(N, 'ganada');
ok('ganar sin productos → 422 errores.etapa', sinProd.status === 422 && sinProd.json?.errores?.etapa, sinProd.texto);
await V('POST', `/oportunidades/${N}/productos`, { producto_id: pBasico.id, cantidad: 1 });
const ganada = await etapa(N, 'ganada');
ok('RS-1.4 ganar con productos de la semilla (sin categoría) → 200', ganada.status === 200 && ganada.json.etapa === 'ganada'
  && ganada.json.probabilidad === 100 && /Z$/.test(ganada.json.fecha_cierre ?? ''), ganada.texto);
ok('historial: 1 creación + 6 cambios', ganada.json?.historial.length === 7, ganada.json?.historial.length);

console.log('\nA4.6 · Cerrada');
const lineaN = ganada.json.productos[0].id;
ok('cambiar título → 409', (await V('PATCH', `/oportunidades/${N}`, { titulo: 'Otro' })).status === 409);
ok('cambiar etapa → 409', (await etapa(N, 'negociacion')).status === 409);
ok('agregar producto → 409', (await V('POST', `/oportunidades/${N}/productos`, { producto_id: pAvanzado.id, cantidad: 1 })).status === 409);
ok('cambiar cantidad → 409', (await V('PATCH', `/oportunidades/${N}/productos/${lineaN}`, { cantidad: 2 })).status === 409);
ok('quitar producto → 409', (await V('DELETE', `/oportunidades/${N}/productos/${lineaN}`)).status === 409);
ok('el intento rechazado no dejó registro', (await V('GET', `/oportunidades/${N}`)).json.historial.length === 7);

const seguimiento = lista.json.find((o) => o.titulo === 'Seguimiento anual');
const perdida = await etapa(seguimiento.id, 'perdida', { motivo_perdida: '  Sin presupuesto este año  ' });
ok('perder desde prospecto con motivo → 200, motivo recortado y fecha de cierre', perdida.status === 200
  && perdida.json.motivo_perdida === 'Sin presupuesto este año' && perdida.json.probabilidad === 0
  && perdida.json.fecha_cierre !== null, perdida.texto);

// ─── S8 · Peticiones simultáneas ─────────────────────────────────────────
console.log('\nS8 · Peticiones simultáneas');
const otra = (await V('POST', '/oportunidades', { cliente_id: quetzal.id, titulo: 'Prueba de concurrencia' })).json;
const diez = await Promise.all(Array.from({ length: 10 }, () => etapa(otra.id, 'calificado')));
ok('A4.4 diez cambios simultáneos a calificado → exactamente un 200 y nueve 422',
  contar(diez, (r) => r.status === 200) === 1 && contar(diez, (r) => r.status === 422) === 9, diez.map((r) => r.status).join(','));
ok('A4.4 el historial tiene un solo registro nuevo',
  (await V('GET', `/oportunidades/${otra.id}`)).json.historial.length === 2);

const mezcla = await Promise.all([etapa(otra.id, 'propuesta'), etapa(otra.id, 'perdida', { motivo_perdida: 'Prueba' })]);
const hist = (await V('GET', `/oportunidades/${otra.id}`)).json.historial;
ok('dos cambios distintos a la vez: el historial encadena (cada etapa_anterior es la nueva del registro previo)',
  mezcla.every((r) => [200, 409, 422].includes(r.status))
  && hist.every((h, i) => i === 0 || h.etapa_anterior === hist[i - 1].etapa_nueva), JSON.stringify(hist));

const otra2 = (await V('POST', '/oportunidades', { cliente_id: quetzal.id, titulo: 'Prueba de duplicados' })).json;
const cinco = await Promise.all(Array.from({ length: 5 }, () =>
  V('POST', `/oportunidades/${otra2.id}/productos`, { producto_id: pBasico.id, cantidad: 1 })));
ok('cinco altas simultáneas del mismo producto → un 201 y cuatro 409',
  contar(cinco, (r) => r.status === 201) === 1 && contar(cinco, (r) => r.status === 409) === 4, cinco.map((r) => r.status).join(','));

// ─── RS-1 con la semilla del sector ──────────────────────────────────────
const tAnd = await tokenDe('andres@compupartes.test');
if (!tAnd) {
  console.log('\n(RS-1.5 omitida: cargue `php artisan migrate:fresh --seed` para probar la regla propia con andres@compupartes.test)');
} else {
  console.log('\nRS-1 · Cada equipo con su garantía (semilla del sector)');
  const A = (metodo, ruta, cuerpo) => pedir(metodo, ruta, { token: tAnd, cuerpo });
  const cafe = (await A('GET', '/oportunidades')).json.find((o) => o.titulo === 'Renovación de PCs del café');
  const cat = new Map((await A('GET', '/productos')).json.map((p) => [p.id, p.categoria]));
  const antes = (await A('GET', `/oportunidades/${cafe.id}`)).json;

  const rechazo = await A('PATCH', `/oportunidades/${cafe.id}/etapa`, { etapa: 'ganada' });
  ok('RS-1.5 ganar con 4 equipos y 2 garantías → 409 con el mensaje de la regla', rechazo.status === 409
    && rechazo.json?.error === 'Cada equipo necesita su garantía: hay 4 equipos y 2 garantías.', rechazo.texto);
  const igual = (await A('GET', `/oportunidades/${cafe.id}`)).json;
  ok('RS-1.1 la etapa, la fecha de cierre y el historial no cambiaron', igual.etapa === 'negociacion'
    && igual.fecha_cierre === null && igual.historial.length === antes.historial.length);

  const garantia = antes.productos.find((l) => cat.get(l.producto_id) === 'garantia');
  await A('PATCH', `/oportunidades/${cafe.id}/productos/${garantia.id}`, { cantidad: garantia.cantidad + 2 });
  const acepta = await A('PATCH', `/oportunidades/${cafe.id}/etapa`, { etapa: 'ganada' });
  ok('RS-1.5 con 4 garantías → 200, ganada', acepta.status === 200 && acepta.json.etapa === 'ganada', acepta.texto);
}

console.log(fallas === 0 ? '\nTodas las pruebas pasaron.' : `\n${fallas} prueba(s) fallaron.`);
console.log('Recuerde volver a cargar la semilla: el script cambió datos.');
process.exit(fallas === 0 ? 0 : 1);
