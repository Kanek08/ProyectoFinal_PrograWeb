// Verificación de A1, A2 y A3 contra la API corriendo y la base con SOLO la semilla de verificación:
//   (desde laravel/)  php artisan migrate:fresh --seeder=VerificacionSeeder
//   (desde api/)      npm start            ← en otra terminal
//   (desde api/)      CLAVE_SEMILLA=<contraseña pública del README> node --env-file=.env scripts/verificar-a1-a3.mjs
//   En PowerShell:    $env:CLAVE_SEMILLA = "<contraseña pública del README>"; node --env-file=.env scripts/verificar-a1-a3.mjs
//
// Incluye las pruebas de peticiones simultáneas de S8 (tomar un cliente, cartera máxima, duplicados).
// Modifica datos: al terminar, vuelva a cargar la semilla.
import jwt from 'jsonwebtoken';

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

async function pedir(metodo, ruta, { token, cuerpo, crudo } = {}) {
  const r = await fetch(API + ruta, {
    method: metodo,
    headers: {
      ...(cuerpo !== undefined || crudo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: crudo ?? (cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined),
  });
  const texto = await r.text();
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch { /* no es JSON */ }
  return { status: r.status, json, texto, tipo: r.headers.get('content-type') ?? '' };
}

const login = async (correo, clave = CLAVE) => pedir('POST', '/auth/login', { cuerpo: { correo, clave } });
const tokenDe = async (correo) => (await login(correo)).json.token;

// ─── A1 · Inicio de sesión ───────────────────────────────────────────────
console.log('\nA1 · Inicio de sesión');
const val = await login('valeria@crm.test');
ok('A1.1 Valeria → 200 con token y usuario', val.status === 200 && val.json?.token
  && val.json.usuario?.nombre === 'Valeria López' && val.json.usuario.correo === 'valeria@crm.test', val.texto);
ok('A1.1 usuario no expone password ni rol', !/password|rol|supervisor_id/.test(JSON.stringify(val.json?.usuario)));
for (const c of ['admin@crm.test', 'sergio@crm.test', 'ivan@crm.test']) {
  const r = await login(c);
  ok(`A1.2 ${c} → 403 sin token`, r.status === 403 && !r.json?.token, r.texto);
}
const inexistente = await login('nadie@crm.test');
const malaClave = await login('valeria@crm.test', 'otra-clave');
ok('A1.3 correo inexistente y clave incorrecta → 401 idénticos',
  inexistente.status === 401 && malaClave.status === 401 && inexistente.texto === malaClave.texto, `${inexistente.texto} | ${malaClave.texto}`);
const sinClave = await pedir('POST', '/auth/login', { cuerpo: { correo: 'valeria@crm.test' } });
ok('A1.4 sin clave → 422 con errores.clave', sinClave.status === 422 && sinClave.json?.errores?.clave, sinClave.texto);
const jsonMalo = await pedir('POST', '/auth/login', { crudo: '{"correo": ' });
ok('A1.4 JSON mal formado → 400', jsonMalo.status === 400 && jsonMalo.json?.error, jsonMalo.texto);
const sinCuerpo = await pedir('POST', '/auth/login');
ok('A1.4 sin cuerpo → 400', sinCuerpo.status === 400, sinCuerpo.texto);
const decodificado = jwt.decode(val.json.token, { complete: true });
ok('A1.5 JWT HS256 con sub y exp', decodificado?.header.alg === 'HS256' && decodificado.payload.sub === String(val.json.usuario.id) && decodificado.payload.exp > 0);

// ─── A2 · Middleware ─────────────────────────────────────────────────────
console.log('\nA2 · Middleware de autenticación');
const tVal = val.json.token;
const sub = String(val.json.usuario.id);
ok('A2.1 sin token → 401', (await pedir('GET', '/clientes')).status === 401);
ok('A2.1 token alterado → 401', (await pedir('GET', '/clientes', { token: tVal.slice(0, -2) + 'xx' })).status === 401);
const vencido = jwt.sign({}, process.env.JWT_SECRET, { algorithm: 'HS256', subject: sub, expiresIn: -10 });
ok('A2.1 token vencido → 401', (await pedir('GET', '/clientes', { token: vencido })).status === 401);
const otroAlg = jwt.sign({}, process.env.JWT_SECRET, { algorithm: 'HS512', subject: sub });
ok('A2.1 token HS512 → 401', (await pedir('GET', '/clientes', { token: otroAlg })).status === 401);
const sinFirma = jwt.sign({ sub }, null, { algorithm: 'none' });
ok('A2.1 token alg none → 401', (await pedir('GET', '/clientes', { token: sinFirma })).status === 401);
const otroSecreto = jwt.sign({}, 'x'.repeat(40), { algorithm: 'HS256', subject: sub });
ok('A2.1 firmado con otro secreto → 401', (await pedir('GET', '/clientes', { token: otroSecreto })).status === 401);
const ivanFalso = jwt.sign({}, process.env.JWT_SECRET, { algorithm: 'HS256', subject: '7' }); // Iván, desactivado
ok('A2.2 token válido de una cuenta desactivada → 401', (await pedir('GET', '/clientes', { token: ivanFalso })).status === 401);
const adminFalso = jwt.sign({}, process.env.JWT_SECRET, { algorithm: 'HS256', subject: '1' }); // administradora
ok('A2.2 token válido de una cuenta que no es vendedor → 401', (await pedir('GET', '/clientes', { token: adminFalso })).status === 401);
const rutaInexistente = await pedir('GET', '/no-existe', { token: tVal });
ok('A7 ruta inexistente → 404 JSON', rutaInexistente.status === 404 && rutaInexistente.tipo.includes('application/json'));

// ─── A3 · Clientes y cartera ─────────────────────────────────────────────
console.log('\nA3 · Clientes y cartera');
const tDiego = await tokenDe('diego@crm.test');
const tCarlos = await tokenDe('carlos@crm.test');

const cartera = await pedir('GET', '/clientes', { token: tVal });
ok('A3.1 Valeria ve sus 3 clientes', cartera.status === 200 && cartera.json.length === 3, cartera.texto);
ok('A3.8 NIT NULL se devuelve "CF" y nunca vendedor_id',
  cartera.json.some((c) => c.nombre === 'María Coyoy' && c.nit === 'CF') && !cartera.texto.includes('vendedor_id'));
const busqueda = await pedir('GET', '/clientes?q=quetzal', { token: tVal });
ok('A3.1 ?q=quetzal → Comercial El Quetzal', busqueda.json?.length === 1 && busqueda.json[0].nombre === 'Comercial El Quetzal', busqueda.texto);
const porNit = await pedir('GET', '/clientes?q=4521817-k', { token: tVal });
ok('A3.1 ?q por NIT con guion → lo encuentra', porNit.json?.length === 1, porNit.texto);
const inyeccion = await pedir('GET', `/clientes?q=${encodeURIComponent("' OR 1=1 -- ")}`, { token: tVal });
ok('S3 ?q=\' OR 1=1 -- → 200 sin clientes', inyeccion.status === 200 && inyeccion.json.length === 0, inyeccion.texto);
const porcentaje = await pedir('GET', `/clientes?q=${encodeURIComponent('%')}`, { token: tVal });
ok('S3 ?q=% → solo sus propios clientes', porcentaje.status === 200 && porcentaje.json.length <= 3, porcentaje.texto);

const disponibles = await pedir('GET', '/clientes/disponibles', { token: tVal });
ok('A3.3 disponibles: 6, solo { id, nombre }', disponibles.json?.length === 6
  && disponibles.json.every((c) => Object.keys(c).sort().join() === 'id,nombre'), disponibles.texto);

const deDiego = (await pedir('GET', '/clientes', { token: tDiego })).json[0];
ok('A3.7 Valeria lee un cliente de Diego → 404', (await pedir('GET', `/clientes/${deDiego.id}`, { token: tVal })).status === 404);
const patchAjeno = await pedir('PATCH', `/clientes/${deDiego.id}`, { token: tVal, cuerpo: { nombre: 'Hackeado' } });
ok('A3.7 Valeria modifica un cliente de Diego → 404', patchAjeno.status === 404, patchAjeno.texto);
ok('A3.7 id inexistente o no numérico → 404', (await pedir('GET', '/clientes/999999', { token: tVal })).status === 404
  && (await pedir('GET', '/clientes/abc', { token: tVal })).status === 404);

const invalido = await pedir('POST', '/clientes', { token: tVal, cuerpo: { nombre: '', nit: '12345678', telefono: '1234567', correo: 'no-es-correo' } });
ok('A3.2 datos inválidos → 422 con un mensaje por campo', invalido.status === 422
  && ['nombre', 'nit', 'telefono', 'correo'].every((k) => invalido.json?.errores?.[k]), invalido.texto);
const nitRepetido = await pedir('POST', '/clientes', { token: tVal, cuerpo: { nombre: 'Copia', nit: '452 1817-k', telefono: '22220001' } });
ok('A3.2 NIT repetido (4521817-k ≡ 4521817K) → 409', nitRepetido.status === 409, nitRepetido.texto);
const telRepetido = await pedir('POST', '/clientes', { token: tVal, cuerpo: { nombre: 'Copia', nit: 'CF', telefono: '+502 5555-1234' } });
ok('A3.2 teléfono repetido → 409', telRepetido.status === 409, telRepetido.texto);
const alta = await pedir('POST', '/clientes', {
  token: tVal,
  cuerpo: { nombre: 'Gamer Store Xela', nit: 'cf', telefono: '(502) 2200-0001', vendedor_id: 6, extra: 'se ignora' },
});
ok('A3.2 alta → 201, CF, teléfono normalizado, en su cartera', alta.status === 201 && alta.json?.nit === 'CF'
  && alta.json.telefono === '22000001' && alta.json.correo === null && !('vendedor_id' in alta.json), alta.texto);
ok('A3.2 el vendedor_id del cuerpo se ignora (D5)', (await pedir('GET', `/clientes/${alta.json?.id}`, { token: tVal })).status === 200);

const patch = await pedir('PATCH', `/clientes/${alta.json?.id}`, { token: tVal, cuerpo: { correo: 'ventas@gamerstore.test', nit: '330 1245-8' } });
ok('A3 PATCH cambia solo lo enviado', patch.status === 200 && patch.json?.correo === 'ventas@gamerstore.test'
  && patch.json.nit === '33012458' && patch.json.nombre === 'Gamer Store Xela', patch.texto);
const patchInvalido = await pedir('PATCH', `/clientes/${alta.json?.id}`, { token: tVal, cuerpo: { telefono: '15551234' } });
ok('A3 PATCH con teléfono inválido → 422', patchInvalido.status === 422 && patchInvalido.json?.errores?.telefono, patchInvalido.texto);
const patchDuplicado = await pedir('PATCH', `/clientes/${alta.json?.id}`, { token: tVal, cuerpo: { telefono: '77612345' } });
ok('A3 PATCH con teléfono de otro cliente → 409', patchDuplicado.status === 409, patchDuplicado.texto);

// Tomar
const libre = disponibles.json[0];
const toma = await pedir('POST', `/clientes/${libre.id}/tomar`, { token: tVal });
ok('A3.4 tomar un disponible → 200 con el cliente', toma.status === 200 && toma.json?.id === libre.id, toma.texto);
const tomado = await pedir('POST', `/clientes/${libre.id}/tomar`, { token: tDiego });
ok('A3.4 otro asesor intenta tomarlo → 409', tomado.status === 409, tomado.texto);
ok('A3.4 tomar uno inexistente → 404', (await pedir('POST', '/clientes/999999/tomar', { token: tVal })).status === 404);

// ─── S8 · Peticiones simultáneas ─────────────────────────────────────────
console.log('\nS8 · Peticiones simultáneas');
const tokens = [tVal, tDiego];
const otro = (await pedir('GET', '/clientes/disponibles', { token: tVal })).json[0];
const diez = await Promise.all(Array.from({ length: 10 }, (_, i) =>
  pedir('POST', `/clientes/${otro.id}/tomar`, { token: tokens[i % 2] }).then((r) => r.status)));
ok('A3.5 diez tomas simultáneas del mismo cliente → exactamente un 200',
  diez.filter((s) => s === 200).length === 1 && diez.filter((s) => s === 409).length === 9, diez.join(','));

// Carlos tiene 9 de 10: cinco tomas simultáneas de clientes distintos → solo una.
const libres = (await pedir('GET', '/clientes/disponibles', { token: tCarlos })).json.slice(0, 4);
const altasYTomas = await Promise.all([
  ...libres.map((c) => pedir('POST', `/clientes/${c.id}/tomar`, { token: tCarlos }).then((r) => r.status)),
  pedir('POST', '/clientes', { token: tCarlos, cuerpo: { nombre: 'Simultáneo', nit: 'CF', telefono: '22000099' } }).then((r) => r.status),
]);
const carteraCarlos = (await pedir('GET', '/clientes', { token: tCarlos })).json.length;
ok('A3.6 Carlos (9 de 10) con 5 operaciones simultáneas → una sola con éxito y cartera 10',
  altasYTomas.filter((s) => s === 200 || s === 201).length === 1 && carteraCarlos === 10, `${altasYTomas.join(',')} cartera=${carteraCarlos}`);
const llena = await pedir('POST', '/clientes', { token: tCarlos, cuerpo: { nombre: 'Uno más', nit: 'CF', telefono: '22000098' } });
ok('R3 alta con cartera llena → 409', llena.status === 409, llena.texto);

// Dos altas simultáneas con el mismo teléfono (asesores distintos): el índice único decide.
const duplicadas = await Promise.all([
  pedir('POST', '/clientes', { token: tVal, cuerpo: { nombre: 'Dup A', nit: 'CF', telefono: '22000077' } }).then((r) => r.status),
  pedir('POST', '/clientes', { token: tDiego, cuerpo: { nombre: 'Dup B', nit: 'CF', telefono: '2200-0077' } }).then((r) => r.status),
]);
ok('S8 dos altas simultáneas con el mismo teléfono → una 201 y una 409',
  duplicadas.sort().join() === '201,409', duplicadas.join(','));

console.log(fallas === 0 ? '\nTodas las pruebas pasaron.' : `\n${fallas} prueba(s) fallaron.`);
process.exit(fallas === 0 ? 0 : 1);
