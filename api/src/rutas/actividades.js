import { Router } from 'express';
import { pool, enTransaccion } from '../db.js';
import { errorHttp, errores422, exigirCuerpo, idDeRuta } from '../util/http.js';

/**
 * A5 · Actividades (seguimientos) de los clientes de la cartera (R2, R8).
 *
 * Propiedad: una actividad se ve y se modifica si su CLIENTE está en la cartera del asesor
 * (c.vendedor_id = req.usuario.id), no por quién la registró. Así, cuando el panel reasigna un
 * cliente, el nuevo asesor ve sus seguimientos (decisión D2). Lo ajeno responde 404.
 *
 * Fechas (R8): vence_en debe traer zona horaria (Z o ±hh:mm); sin zona es ambigua → 422.
 * Con mysql2 en timezone 'Z', el Date se guarda en UTC y sale como "…T15:00:00.000Z".
 * `vencida` no se guarda: se calcula al responder.
 *
 * Montado en /api: atiende /clientes/:id/actividades y /actividades.
 */
export const rutasActividades = Router();

const NO_ENCONTRADA = 'Seguimiento no encontrado.';
const CLIENTE_NO_ENCONTRADO = 'Cliente no encontrado.';
const TIPOS = ['llamada', 'reunion', 'tarea'];
const ESTADOS = { pendiente: 0, completada: 1 };

const SELECT_ACTIVIDAD = `
  SELECT a.id, c.id AS cliente_id, c.nombre AS cliente_nombre, a.tipo, a.descripcion, a.vence_en, a.completada
    FROM actividades a JOIN clientes c ON c.id = a.cliente_id`;

/** Forma pública: sin vendedor_id (R8); vencida se calcula ahora. */
function aJson(a, ahora = new Date()) {
  const completada = Boolean(a.completada);
  return {
    id: a.id,
    cliente: { id: a.cliente_id, nombre: a.cliente_nombre },
    tipo: a.tipo,
    descripcion: a.descripcion,
    vence_en: a.vence_en,
    completada,
    vencida: !completada && a.vence_en !== null && a.vence_en < ahora,
  };
}

// ISO 8601 con zona obligatoria: 2026-12-01T10:00-06:00, 2026-12-01T16:00:00Z, 2026-12-01T10:00:00.000-06:00
const ISO_CON_ZONA = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-](\d{2}):(\d{2}))$/;

/**
 * Convierte el texto a Date (UTC) o devuelve null si no es una fecha real con zona.
 * Además de la forma, comprueba que la fecha exista (2026-02-30 no existe).
 */
export function fechaConZona(texto) {
  const m = ISO_CON_ZONA.exec(texto);
  if (!m) return null;
  const [, a, mes, d, h, min, s = '0', zona, zh = '0', zm = '0'] = m;
  if (Number(zh) > 14 || Number(zm) > 59) return null;

  const fecha = new Date(texto);
  if (Number.isNaN(fecha.getTime())) return null;

  // Volver a la hora local escrita y comparar: si JavaScript «corrigió» la fecha, no existía.
  const desfase = zona === 'Z' ? 0 : (zona[0] === '-' ? -1 : 1) * (Number(zh) * 60 + Number(zm));
  const local = new Date(fecha.getTime() + desfase * 60_000);
  const igual = local.getUTCFullYear() === Number(a) && local.getUTCMonth() + 1 === Number(mes)
    && local.getUTCDate() === Number(d) && local.getUTCHours() === Number(h)
    && local.getUTCMinutes() === Number(min) && local.getUTCSeconds() === Number(s);
  return igual ? fecha : null;
}

/** Lista blanca de campos (D5): tipo, descripcion y vence_en. */
function validarActividad(cuerpo) {
  const errores = {};

  if (!TIPOS.includes(cuerpo.tipo)) errores.tipo = 'Elija el tipo: llamada, reunión o tarea.';

  const descripcion = typeof cuerpo.descripcion === 'string' ? cuerpo.descripcion.trim() : '';
  if (descripcion === '') errores.descripcion = 'Escriba la descripción del seguimiento.';
  else if (descripcion.length > 500) errores.descripcion = 'La descripción no puede tener más de 500 caracteres.';

  // vence_en es opcional: ausente, null o "" → sin fecha.
  let venceEn = null;
  const v = cuerpo.vence_en;
  if (v !== undefined && v !== null && v !== '') {
    venceEn = typeof v === 'string' ? fechaConZona(v.trim()) : null;
    if (!venceEn) {
      errores.vence_en = 'Escriba la fecha en ISO 8601 con zona horaria, por ejemplo 2026-12-01T10:00:00-06:00.';
    }
  }

  if (Object.keys(errores).length) throw errores422(errores);
  return { tipo: cuerpo.tipo, descripcion, venceEn };
}

// POST /api/clientes/:id/actividades { tipo, descripcion, vence_en } → 201, la actividad.
rutasActividades.post('/clientes/:id/actividades', async (req, res) => {
  const clienteId = idDeRuta(req.params.id, CLIENTE_NO_ENCONTRADO);
  const cuerpo = exigirCuerpo(req);
  const yo = req.usuario.id;

  // Propiedad primero: un cliente ajeno responde 404 aunque los datos sean inválidos.
  const [[existe]] = await pool.query('SELECT id FROM clientes WHERE id = ? AND vendedor_id = ?', [clienteId, yo]);
  if (!existe) throw errorHttp(404, CLIENTE_NO_ENCONTRADO);

  const { tipo, descripcion, venceEn } = validarActividad(cuerpo);

  const id = await enTransaccion(async (cx) => {
    // Orden users → clientes. FOR SHARE choca con el FOR UPDATE del panel al reasignar o liberar.
    await cx.query('SELECT id FROM users WHERE id = ? FOR SHARE', [yo]);
    const [[cliente]] = await cx.query(
      'SELECT id FROM clientes WHERE id = ? AND vendedor_id = ? FOR SHARE', [clienteId, yo]);
    if (!cliente) throw errorHttp(404, CLIENTE_NO_ENCONTRADO); // lo reasignaron mientras tanto

    const [r] = await cx.query(
      `INSERT INTO actividades (cliente_id, vendedor_id, tipo, descripcion, vence_en, completada, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [clienteId, yo, tipo, descripcion, venceEn],
    );
    return r.insertId;
  });

  const [[a]] = await pool.query(`${SELECT_ACTIVIDAD} WHERE a.id = ?`, [id]);
  res.status(201).json(aJson(a));
});

// GET /api/actividades?estado=pendiente|completada → las de los clientes de su cartera.
rutasActividades.get('/actividades', async (req, res) => {
  const { estado } = req.query;
  if (estado !== undefined && !(typeof estado === 'string' && Object.hasOwn(ESTADOS, estado))) {
    throw errorHttp(400, 'El filtro estado debe ser pendiente o completada.');
  }

  let sql = `${SELECT_ACTIVIDAD} WHERE c.vendedor_id = ?`;
  const params = [req.usuario.id];
  if (estado !== undefined) {
    sql += ' AND a.completada = ?';
    params.push(ESTADOS[estado]);
  }

  // Primero las que tienen fecha (la más próxima arriba), al final las que no tienen.
  const [filas] = await pool.query(`${sql} ORDER BY a.vence_en IS NULL, a.vence_en, a.id`, params);
  const ahora = new Date();
  res.json(filas.map((a) => aJson(a, ahora)));
});

// PATCH /api/actividades/:id { completada } → 200, la actividad.
rutasActividades.patch('/actividades/:id', async (req, res) => {
  const id = idDeRuta(req.params.id, NO_ENCONTRADA);
  const cuerpo = exigirCuerpo(req);
  const yo = req.usuario.id;

  const [[existe]] = await pool.query(
    'SELECT a.id FROM actividades a JOIN clientes c ON c.id = a.cliente_id WHERE a.id = ? AND c.vendedor_id = ?',
    [id, yo],
  );
  if (!existe) throw errorHttp(404, NO_ENCONTRADA);

  // Booleano estricto: "true", 1 o "sí" no valen.
  if (typeof cuerpo.completada !== 'boolean') {
    throw errores422({ completada: 'Indique completada como verdadero o falso.' });
  }

  // El JOIN en el UPDATE vuelve a comprobar la propiedad en el mismo instante del cambio.
  const [r] = await pool.query(
    `UPDATE actividades a JOIN clientes c ON c.id = a.cliente_id
        SET a.completada = ?, a.updated_at = UTC_TIMESTAMP()
      WHERE a.id = ? AND c.vendedor_id = ?`,
    [cuerpo.completada, id, yo],
  );
  if (r.affectedRows !== 1) throw errorHttp(404, NO_ENCONTRADA);

  const [[a]] = await pool.query(`${SELECT_ACTIVIDAD} WHERE a.id = ?`, [id]);
  res.json(aJson(a));
});
