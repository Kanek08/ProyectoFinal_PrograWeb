import { Router } from 'express';
import { pool, enTransaccion } from '../db.js';
import { errorHttp, errores422, exigirCuerpo, idDeRuta, MAXIMO_CARTERA } from '../util/http.js';
import { compactarNit, normalizarNit, normalizarTelefono, telefonoValido, nitVisible } from '../validacion/identidad.js';

/**
 * A3 · Clientes y cartera (R2, R3, R4).
 *
 * Propiedad: toda consulta filtra por vendedor_id = req.usuario.id; lo ajeno responde 404, no 403.
 * Concurrencia (S8): las operaciones que cambian la cartera de un asesor corren en una transacción
 * que primero bloquea SU fila en users (SELECT ... FOR UPDATE). Así las altas y tomas simultáneas
 * del mismo asesor se ordenan y el conteo de cartera es confiable. Al tomar, además se bloquea la
 * fila del cliente: de varios asesores que lo intentan a la vez, exactamente uno lo consigue.
 * El orden de bloqueo (primero users, luego clientes) es el mismo que usa el panel Laravel.
 * Duplicados: se validan antes, pero el árbitro final es el índice único (ER_DUP_ENTRY → 409).
 */
export const rutasClientes = Router();

const NO_ENCONTRADO = 'Cliente no encontrado.';
const CAMPOS = 'id, nombre, nit, telefono, correo';

/** Forma pública del cliente: nunca incluye vendedor_id (R8). */
const aJson = (c) => ({ id: c.id, nombre: c.nombre, nit: nitVisible(c.nit), telefono: c.telefono, correo: c.correo });

const correoValido = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);

/**
 * Valida y normaliza los campos del contrato. En PATCH solo se validan los que vienen.
 * Los campos que el contrato no lista se ignoran (decisión D5).
 */
function validarCliente(cuerpo, { parcial }) {
  const errores = {};
  const datos = {};
  const viene = (campo) => !parcial || Object.hasOwn(cuerpo, campo);

  if (viene('nombre')) {
    const nombre = typeof cuerpo.nombre === 'string' ? cuerpo.nombre.trim() : '';
    if (nombre === '') errores.nombre = 'Escriba el nombre del cliente.';
    else if (nombre.length > 150) errores.nombre = 'El nombre no puede tener más de 150 caracteres.';
    else datos.nombre = nombre;
  }

  if (viene('nit')) {
    const { valido, valor } = typeof cuerpo.nit === 'string' ? normalizarNit(cuerpo.nit) : { valido: false };
    if (!valido) errores.nit = 'Escriba un NIT válido (con su dígito verificador) o CF.';
    else datos.nit = valor;
  }

  if (viene('telefono')) {
    const tel = typeof cuerpo.telefono === 'string' || typeof cuerpo.telefono === 'number'
      ? normalizarTelefono(String(cuerpo.telefono)) : '';
    if (!telefonoValido(tel)) errores.telefono = 'Escriba un teléfono de Guatemala de 8 dígitos.';
    else datos.telefono = tel;
  }

  // correo es opcional: ausente, null o "" → sin correo.
  if (Object.hasOwn(cuerpo, 'correo')) {
    const correo = cuerpo.correo === null ? '' : cuerpo.correo;
    if (typeof correo !== 'string') errores.correo = 'Escriba un correo electrónico válido.';
    else if (correo.trim() === '') datos.correo = null;
    else if (correo.trim().length > 150 || !correoValido(correo.trim())) errores.correo = 'Escriba un correo electrónico válido.';
    else datos.correo = correo.trim().toLowerCase();
  } else if (!parcial) {
    datos.correo = null;
  }

  if (Object.keys(errores).length) throw errores422(errores);
  return datos;
}

/** Comprueba NIT y teléfono repetidos (ya normalizados) contra otros clientes → 409. */
async function comprobarDuplicados(cx, datos, excluirId = 0) {
  if (datos.nit) {
    const [r] = await cx.query('SELECT id FROM clientes WHERE nit = ? AND id <> ?', [datos.nit, excluirId]);
    if (r.length) throw errorHttp(409, 'Ya existe un cliente con ese NIT.');
  }
  if (datos.telefono) {
    const [r] = await cx.query('SELECT id FROM clientes WHERE telefono = ? AND id <> ?', [datos.telefono, excluirId]);
    if (r.length) throw errorHttp(409, 'Ya existe un cliente con ese teléfono.');
  }
}

/** Traduce la llave duplicada de MySQL (árbitro final ante peticiones simultáneas) a 409. */
function duplicadoA409(e) {
  if (e.code === 'ER_DUP_ENTRY') {
    throw errorHttp(409, String(e.message).includes('clientes_nit_unique')
      ? 'Ya existe un cliente con ese NIT.'
      : 'Ya existe un cliente con ese teléfono.');
  }
  throw e;
}

/** Bloquea la fila del asesor y verifica que tenga espacio en su cartera (R3). */
async function bloquearCarteraConEspacio(cx, vendedorId) {
  await cx.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [vendedorId]);
  const [[{ n }]] = await cx.query('SELECT COUNT(*) AS n FROM clientes WHERE vendedor_id = ?', [vendedorId]);
  if (n >= MAXIMO_CARTERA) {
    throw errorHttp(409, `Su cartera ya tiene ${MAXIMO_CARTERA} clientes, el máximo permitido.`);
  }
}

// GET /api/clientes?q= → clientes de su cartera; q busca «contiene» en nombre o NIT.
rutasClientes.get('/', async (req, res) => {
  const q = req.query.q;
  if (q !== undefined && typeof q !== 'string') throw errorHttp(400, 'El parámetro q no es válido.');

  const texto = (q ?? '').trim();
  let sql = `SELECT ${CAMPOS} FROM clientes WHERE vendedor_id = ?`;
  const params = [req.usuario.id];

  if (texto !== '') {
    const nit = compactarNit(texto);
    sql += ' AND (nombre LIKE ?' + (nit !== '' ? ' OR nit LIKE ?' : '') + ')';
    params.push(`%${texto}%`);
    if (nit !== '') params.push(`%${nit}%`);
  }

  const [filas] = await pool.query(sql + ' ORDER BY nombre', params);
  res.json(filas.map(aJson));
});

// GET /api/clientes/disponibles → solo [{ id, nombre }]: sin NIT, teléfono ni correo (R3).
rutasClientes.get('/disponibles', async (req, res) => {
  const [filas] = await pool.query('SELECT id, nombre FROM clientes WHERE vendedor_id IS NULL ORDER BY nombre');
  res.json(filas);
});

// POST /api/clientes → 201, el cliente ya en su cartera.
rutasClientes.post('/', async (req, res) => {
  const datos = validarCliente(exigirCuerpo(req), { parcial: false });
  const yo = req.usuario.id;

  const cliente = await enTransaccion(async (cx) => {
    await bloquearCarteraConEspacio(cx, yo);
    await comprobarDuplicados(cx, datos);

    const [r] = await cx.query(
      `INSERT INTO clientes (vendedor_id, nombre, nit, telefono, correo, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [yo, datos.nombre, datos.nit, datos.telefono, datos.correo],
    ).catch(duplicadoA409);

    return { id: r.insertId, ...datos };
  });

  res.status(201).json(aJson(cliente));
});

// POST /api/clientes/:id/tomar → 200, el cliente ya en su cartera.
rutasClientes.post('/:id/tomar', async (req, res) => {
  const id = idDeRuta(req.params.id, NO_ENCONTRADO);
  const yo = req.usuario.id;

  const cliente = await enTransaccion(async (cx) => {
    // 1) Bloquear la cartera del asesor (ordena sus tomas y altas simultáneas).
    await cx.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [yo]);

    // 2) Bloquear al cliente: si diez asesores lo piden a la vez, esperan en fila y solo el primero lo ve libre.
    const [[c]] = await cx.query(`SELECT ${CAMPOS}, vendedor_id FROM clientes WHERE id = ? FOR UPDATE`, [id]);
    if (!c) throw errorHttp(404, NO_ENCONTRADO);
    if (c.vendedor_id === yo) throw errorHttp(409, 'Ese cliente ya está en su cartera.');
    if (c.vendedor_id !== null) throw errorHttp(409, 'Otro asesor ya tomó este cliente.');

    // 3) Cartera máxima, contada con la fila del asesor bloqueada.
    const [[{ n }]] = await cx.query('SELECT COUNT(*) AS n FROM clientes WHERE vendedor_id = ?', [yo]);
    if (n >= MAXIMO_CARTERA) throw errorHttp(409, `Su cartera ya tiene ${MAXIMO_CARTERA} clientes, el máximo permitido.`);

    // 4) UPDATE condicional: segunda garantía de que el cliente seguía disponible.
    const [r] = await cx.query(
      'UPDATE clientes SET vendedor_id = ?, updated_at = UTC_TIMESTAMP() WHERE id = ? AND vendedor_id IS NULL',
      [yo, id],
    );
    if (r.affectedRows !== 1) throw errorHttp(409, 'Otro asesor ya tomó este cliente.');

    return c;
  });

  res.json(aJson(cliente));
});

// GET /api/clientes/:id → 200, el cliente; ajeno o inexistente → 404.
rutasClientes.get('/:id', async (req, res) => {
  const id = idDeRuta(req.params.id, NO_ENCONTRADO);
  const [[c]] = await pool.query(`SELECT ${CAMPOS} FROM clientes WHERE id = ? AND vendedor_id = ?`, [id, req.usuario.id]);
  if (!c) throw errorHttp(404, NO_ENCONTRADO);
  res.json(aJson(c));
});

// PATCH /api/clientes/:id → 200, el cliente con los campos que cambiaron.
rutasClientes.patch('/:id', async (req, res) => {
  const id = idDeRuta(req.params.id, NO_ENCONTRADO);
  const cuerpo = exigirCuerpo(req);
  const yo = req.usuario.id;

  // Propiedad primero: un cliente ajeno responde 404 aunque los datos sean inválidos.
  const [[existe]] = await pool.query('SELECT id FROM clientes WHERE id = ? AND vendedor_id = ?', [id, yo]);
  if (!existe) throw errorHttp(404, NO_ENCONTRADO);

  const datos = validarCliente(cuerpo, { parcial: true });

  const cliente = await enTransaccion(async (cx) => {
    const [[actual]] = await cx.query(
      `SELECT ${CAMPOS} FROM clientes WHERE id = ? AND vendedor_id = ? FOR UPDATE`, [id, yo]);
    if (!actual) throw errorHttp(404, NO_ENCONTRADO); // lo reasignaron o liberaron mientras tanto

    const campos = Object.keys(datos);
    if (campos.length === 0) return actual;

    await comprobarDuplicados(cx, datos, id);

    // Los nombres de columna salen de una lista fija (validarCliente), nunca del cuerpo.
    const asignaciones = campos.map((c) => `${c} = ?`).join(', ');
    await cx.query(
      `UPDATE clientes SET ${asignaciones}, updated_at = UTC_TIMESTAMP() WHERE id = ? AND vendedor_id = ?`,
      [...campos.map((c) => datos[c]), id, yo],
    ).catch(duplicadoA409);

    return { ...actual, ...datos };
  });

  res.json(aJson(cliente));
});
