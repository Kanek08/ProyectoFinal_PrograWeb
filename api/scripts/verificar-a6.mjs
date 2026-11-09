// Verificación de A6 (resumen del mes) contra la API corriendo y SOLO la semilla de verificación:
//   (desde laravel/)  php artisan migrate:fresh --seeder=VerificacionSeeder
//   (desde api/)      CLAVE_SEMILLA=<contraseña pública del README> node --env-file=.env scripts/verificar-a6.mjs
//   En PowerShell:    $env:CLAVE_SEMILLA = "<contraseña pública del README>"; node --env-file=.env scripts/verificar-a6.mjs
// Las cifras de control son las de la sección 7 de la especificación.
// Al final gana una cotización para comprobar que el resumen cambia: vuelva a cargar la semilla.

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

const tokens = {
  valeria: await tokenDe('valeria@crm.test'),
  diego: await tokenDe('diego@crm.test'),
  carlos: await tokenDe('carlos@crm.test'),
};
if (Object.values(tokens).some((t) => !t)) {
  console.error('No se pudo iniciar sesión: ¿está la API corriendo y la semilla cargada?');
  process.exit(1);
}
const resumen = (quien, consulta = '') => pedir('GET', `/reportes/resumen${consulta}`, { token: tokens[quien] });

// ─── Cifras de control ───────────────────────────────────────────────────
console.log('\nA6.1 · Cifras de control');
const control = [
  ['valeria', '2026-10', { mes: '2026-10', ventas: 2, total: 9250, pronostico: 2512.88, cartera: { clientes: 3, maximo: 10 } }],
  ['valeria', '2026-11', { mes: '2026-11', ventas: 1, total: 3600, pronostico: 2512.88, cartera: { clientes: 3, maximo: 10 } }],
  ['diego', '2026-10', { mes: '2026-10', ventas: 1, total: 6000, pronostico: 112.5, cartera: { clientes: 2, maximo: 10 } }],
  ['carlos', '2026-10', { mes: '2026-10', ventas: 1, total: 7200, pronostico: 4125.75, cartera: { clientes: 9, maximo: 10 } }],
  ['valeria', '2026-09', { mes: '2026-09', ventas: 0, total: 0, pronostico: 2512.88, cartera: { clientes: 3, maximo: 10 } }],
];
for (const [quien, mes, esperado] of control) {
  const r = await resumen(quien, `?mes=${mes}`);
  ok(`${quien} ${mes} → ${JSON.stringify(esperado)}`,
    r.status === 200 && JSON.stringify(r.json) === JSON.stringify(esperado), r.texto);
}

const oct = await resumen('valeria', '?mes=2026-10');
ok('los montos viajan como números, no como texto ("9250.00")',
  /"total":9250[,}]/.test(oct.texto) && /"pronostico":2512\.88[,}]/.test(oct.texto)
  && typeof oct.json.ventas === 'number' && typeof oct.json.cartera.clientes === 'number', oct.texto);
ok('la venta del 2026-11-01 03:30 UTC cuenta en octubre (hora de Guatemala), no en noviembre',
  oct.json.total === 9250 && oct.json.total !== 5650, oct.texto);

// ─── Parámetro mes ───────────────────────────────────────────────────────
console.log('\nA6.2 · Parámetro mes');
const ahoraGT = new Date(Date.now() - 6 * 3600 * 1000);
const mesActual = `${ahoraGT.getUTCFullYear()}-${String(ahoraGT.getUTCMonth() + 1).padStart(2, '0')}`;
const sinMes = await resumen('valeria');
ok(`sin mes → mes actual de Guatemala (${mesActual})`, sinMes.status === 200 && sinMes.json.mes === mesActual, sinMes.texto);
for (const malo of ['2026-13', 'octubre', '2026-1', '26-10', '2026-00', '2026-10-01', '2026/10']) {
  const r = await resumen('valeria', `?mes=${encodeURIComponent(malo)}`);
  ok(`mes=${malo} → 400 JSON`, r.status === 400 && r.json?.error, r.texto);
}
ok('mes repetido (?mes=a&mes=b) → 400', (await resumen('valeria', '?mes=2026-10&mes=2026-11')).status === 400);
const dic = await resumen('valeria', '?mes=2026-12');
ok('diciembre → enero del año siguiente sin error', dic.status === 200 && dic.json.ventas === 0, dic.texto);
ok('sin token → 401', (await pedir('GET', '/reportes/resumen?mes=2026-10')).status === 401);

// ─── Una venta ganada cambia el resumen ──────────────────────────────────
console.log('\nUna venta ganada en la API aparece en el resumen');
const antes = (await resumen('valeria')).json;
const ops = (await pedir('GET', '/oportunidades?etapa=negociacion', { token: tokens.valeria })).json;
const bodega = ops.find((o) => o.titulo === 'Ampliación a bodega');
const gano = await pedir('PATCH', `/oportunidades/${bodega.id}/etapa`, { token: tokens.valeria, cuerpo: { etapa: 'ganada' } });
const despues = (await resumen('valeria')).json;
ok('ganar «Ampliación a bodega» (Q2,750.50) → +1 venta y +2750.50 en el mes actual',
  gano.status === 200 && despues.ventas === antes.ventas + 1
  && Math.round((despues.total - antes.total) * 100) === 275050, `${JSON.stringify(antes)} → ${JSON.stringify(despues)}`);
ok('el pronóstico baja a 450 (solo queda Capacitación: 900 × 50 %)', despues.pronostico === 450, despues.pronostico);
ok('el resumen de Diego no cambia', JSON.stringify((await resumen('diego', '?mes=2026-10')).json.total) === '6000');

console.log(fallas === 0 ? '\nTodas las pruebas pasaron.' : `\n${fallas} prueba(s) fallaron.`);
console.log('Recuerde volver a cargar la semilla: el script cambió datos.');
process.exit(fallas === 0 ? 0 : 1);
