// Verificación de A5 (actividades) contra la API corriendo y SOLO la semilla de verificación:
//   (desde laravel/)  php artisan migrate:fresh --seeder=VerificacionSeeder
//   (desde api/)      CLAVE_SEMILLA=<contraseña pública del README> node --env-file=.env scripts/verificar-a5.mjs
//   En PowerShell:    $env:CLAVE_SEMILLA = "<contraseña pública del README>"; node --env-file=.env scripts/verificar-a5.mjs
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

const tVal = await tokenDe('valeria@crm.test');
const tDie = await tokenDe('diego@crm.test');
if (!tVal || !tDie) {
  console.error('No se pudo iniciar sesión con Valeria o Diego: ¿está la API corriendo y la semilla cargada?');
  process.exit(1);
}
const V = (metodo, ruta, cuerpo) => pedir(metodo, ruta, { token: tVal, cuerpo });

// ─── Lecturas ────────────────────────────────────────────────────────────
console.log('\nA5.2 · Lista');
const todas = await V('GET', '/actividades');
ok('GET /actividades → las 3 de los clientes de Valeria', todas.status === 200 && todas.json.length === 3, todas.texto);
const pend = await V('GET', '/actividades?estado=pendiente');
ok('?estado=pendiente → 2', pend.status === 200 && pend.json.length === 2, pend.texto);
const comp = await V('GET', '/actividades?estado=completada');
ok('?estado=completada → 1 (Confirmar fecha de instalación)', comp.status === 200 && comp.json.length === 1
  && comp.json[0].descripcion === 'Confirmar fecha de instalación' && comp.json[0].completada === true, comp.texto);
ok('?estado=vencida → 400', (await V('GET', '/actividades?estado=vencida')).status === 400);

const xela = todas.json.find((a) => a.descripcion === 'Enviar propuesta de capacitación');
ok('forma del contrato: cliente {id, nombre}, tipo, vence_en en UTC con Z, booleanos',
  xela?.cliente?.nombre === 'Ferretería Xela' && xela.tipo === 'tarea'
  && xela.vence_en === '2030-01-15T15:00:00.000Z' && xela.completada === false && xela.vencida === false, JSON.stringify(xela));
const coyoy = todas.json.find((a) => a.cliente.nombre === 'María Coyoy');
ok('A5.3 la de 2026-09-01 sin completar está vencida', coyoy?.vencida === true, JSON.stringify(coyoy));
ok('la completada no cuenta como vencida', comp.json[0].vencida === false);
ok('S4 sin vendedor_id', !/vendedor_id|user_id|password/.test(todas.texto));
const deDiego = (await pedir('GET', '/actividades', { token: tDie })).json;
ok('Diego solo ve la suya (Farmacia Los Altos)', deDiego.length === 1 && deDiego[0].cliente.nombre === 'Farmacia Los Altos',
  JSON.stringify(deDiego));

// ─── Crear ───────────────────────────────────────────────────────────────
console.log('\nA5.1 · Crear');
const clientes = (await V('GET', '/clientes')).json;
const quetzal = clientes.find((c) => c.nombre === 'Comercial El Quetzal');
const farmacia = (await pedir('GET', '/clientes', { token: tDie })).json[0];
const ruta = `/clientes/${quetzal.id}/actividades`;

ok('S5 cliente de Diego → 404',
  (await V('POST', `/clientes/${farmacia.id}/actividades`, { tipo: 'llamada', descripcion: 'x' })).status === 404);
ok('cliente inexistente → 404', (await V('POST', '/clientes/999999/actividades', { tipo: 'llamada', descripcion: 'x' })).status === 404);
ok('sin cuerpo → 400', (await pedir('POST', ruta, { token: tVal })).status === 400);
const malos = await V('POST', ruta, { tipo: 'correo', descripcion: '   ' });
ok('tipo y descripción inválidos → 422 con un mensaje por campo',
  malos.status === 422 && malos.json?.errores?.tipo && malos.json.errores.descripcion, malos.texto);
ok('descripción de 501 → 422',
  (await V('POST', ruta, { tipo: 'tarea', descripcion: 'x'.repeat(501) })).json?.errores?.descripcion);
for (const vence of ['2026-12-01T10:00', '2026-12-01T10:00:00', '2026-12-01', '01/12/2026 10:00', '2026-02-30T10:00:00-06:00', '2026-12-01T25:00:00Z', 12345]) {
  const r = await V('POST', ruta, { tipo: 'llamada', descripcion: 'Prueba', vence_en: vence });
  ok(`vence_en ${JSON.stringify(vence)} → 422 errores.vence_en`, r.status === 422 && r.json?.errores?.vence_en, r.texto);
}

const conZona = await V('POST', ruta, {
  tipo: 'reunion', descripcion: '  Demostración de laptops  ', vence_en: '2030-12-01T10:00:00-06:00', vendedor_id: 5, completada: true,
});
ok('201; -06:00 se guarda y devuelve en UTC (16:00Z); ignora vendedor_id y completada (D5)',
  conZona.status === 201 && conZona.json.vence_en === '2030-12-01T16:00:00.000Z' && conZona.json.completada === false
  && conZona.json.descripcion === 'Demostración de laptops' && conZona.json.cliente.id === quetzal.id, conZona.texto);
const conZ = await V('POST', ruta, { tipo: 'llamada', descripcion: 'Con Z', vence_en: '2030-12-01T16:00Z' });
ok('con Z y sin segundos → 201', conZ.status === 201 && conZ.json.vence_en === '2030-12-01T16:00:00.000Z', conZ.texto);
const sinFecha = await V('POST', ruta, { tipo: 'tarea', descripcion: 'Sin fecha', vence_en: null });
ok('sin vence_en → 201, vence_en null y no vencida', sinFecha.status === 201 && sinFecha.json.vence_en === null
  && sinFecha.json.vencida === false, sinFecha.texto);
const pasada = await V('POST', ruta, { tipo: 'tarea', descripcion: 'Ya pasó', vence_en: '2020-01-01T08:00:00-06:00' });
ok('con fecha pasada → vencida true al responder', pasada.status === 201 && pasada.json.vencida === true, pasada.texto);
ok('Diego no la ve', !(await pedir('GET', '/actividades', { token: tDie })).json.some((a) => a.id === conZona.json.id));

// ─── Completar ───────────────────────────────────────────────────────────
console.log('\nA5.4 · Completar');
const idP = pasada.json.id;
for (const valor of ['true', 1, null, 'sí']) {
  const r = await V('PATCH', `/actividades/${idP}`, { completada: valor });
  ok(`completada ${JSON.stringify(valor)} → 422`, r.status === 422 && r.json?.errores?.completada, r.texto);
}
ok('sin completada → 422', (await V('PATCH', `/actividades/${idP}`, {})).status === 422);
const hecha = await V('PATCH', `/actividades/${idP}`, { completada: true });
ok('completada true → 200 y deja de estar vencida', hecha.status === 200 && hecha.json.completada === true
  && hecha.json.vencida === false, hecha.texto);
ok('repetir completada true → 200', (await V('PATCH', `/actividades/${idP}`, { completada: true })).status === 200);
const deshecha = await V('PATCH', `/actividades/${idP}`, { completada: false });
ok('completada false → 200 y vuelve a estar vencida', deshecha.status === 200 && deshecha.json.vencida === true, deshecha.texto);
ok('S5 Valeria completa la de Diego → 404', (await V('PATCH', `/actividades/${deDiego[0].id}`, { completada: true })).status === 404);
ok('id no numérico → 404', (await V('PATCH', '/actividades/abc', { completada: true })).status === 404);
ok('ruta inexistente → 404 JSON', (await V('GET', '/actividades/1/otra')).json?.error !== undefined);

console.log(fallas === 0 ? '\nTodas las pruebas pasaron.' : `\n${fallas} prueba(s) fallaron.`);
console.log('Recuerde volver a cargar la semilla: el script cambió datos.');
process.exit(fallas === 0 ? 0 : 1);
