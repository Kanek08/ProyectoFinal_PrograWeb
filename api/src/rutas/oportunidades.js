import { Router } from 'express';
import { pool, enTransaccion } from '../db.js';
import { errorHttp, errores422, exigirCuerpo, idDeRuta } from '../util/http.js';
import { PROBABILIDAD, TRANSICIONES, esEtapa, estaCerrada } from '../util/embudo.js';

/**
 * A4 · Oportunidades (cotizaciones) y sus productos (R2, R5, R6) + regla propia RS-1.
 *
 * Propiedad: toda consulta filtra por o.vendedor_id = req.usuario.id; lo ajeno responde 404.
 * Las cerradas de un cliente reasignado conservan su asesor (D2), así que la propiedad se mide
 * por la oportunidad, no por la cartera actual.
 *
 * Concurrencia (S8): todo cambio corre en una transacción que bloquea en el orden del proyecto
 * (users → clientes → oportunidades, el mismo que usa el panel):
 *   1) la fila del asesor en users (FOR SHARE: no cambia la cartera, solo respeta el orden);
 *   2) la oportunidad (FOR UPDATE). Con la fila bloqueada, dos cambios de etapa simultáneos se
 *      ordenan: el segundo ve la etapa ya cambiada y responde 422, sin dejar un segundo registro
 *      en el historial. Los cambios de productos bloquean la misma fila, así que nadie puede
 *      quitar una garantía mientras otro gana la cotización (RS-1).
 *
 * Orden de las respuestas: propiedad (404) → validación (422) → estado (409).
 * Los campos que el contrato no lista se ignoran (D5): nunca se leen vendedor_id, etapa al crear
 * ni precio_unitario del cuerpo.
 */
export const rutasOportunidades = Router();

const NO_ENCONTRADA = 'Cotización no encontrada.';
const LINEA_NO_ENCONTRADA = 'Ese producto no está en la cotización.';
const CERRADA = 'La cotización está cerrada: ya no se puede modificar.';

// ─── Lecturas ────────────────────────────────────────────────────────────

/** Detalle de una oportunidad del asesor (forma de la especificación 5.1), o null si no es suya. */
async function cargarDetalle(db, id, yo) {
  const [[o]] = await db.query(
    `SELECT o.id, o.titulo, o.etapa, o.fecha_cierre, o.motivo_perdida,
            c.id AS cliente_id, c.nombre AS cliente_nombre
       FROM oportunidades o JOIN clientes c ON c.id = o.cliente_id
      WHERE o.id = ? AND o.vendedor_id = ?`,
    [id, yo],
  );
  if (!o) return null;

  // Subtotal con el precio GUARDADO en la línea, nunca con el del catálogo (R6).
  const [lineas] = await db.query(
    `SELECT l.id, l.producto_id, p.nombre, l.cantidad, l.precio_unitario,
            l.cantidad * l.precio_unitario AS subtotal
       FROM oportunidad_productos l JOIN productos p ON p.id = l.producto_id
      WHERE l.oportunidad_id = ?
      ORDER BY l.id`,
    [id],
  );
  const [[{ total }]] = await db.query(
    'SELECT COALESCE(SUM(cantidad * precio_unitario), 0) AS total FROM oportunidad_productos WHERE oportunidad_id = ?',
    [id],
  );
  const [historial] = await db.query(
    `SELECT h.etapa_anterior, h.etapa_nueva, u.name AS usuario, h.created_at AS fecha
       FROM historial_etapas h JOIN users u ON u.id = h.usuario_id
      WHERE h.oportunidad_id = ?
      ORDER BY h.created_at, h.id`,
    [id],
  );

  return {
    id: o.id,
    cliente: { id: o.cliente_id, nombre: o.cliente_nombre },
    titulo: o.titulo,
    etapa: o.etapa,
    probabilidad: PROBABILIDAD[o.etapa],
    total,
    fecha_cierre: o.fecha_cierre,
    motivo_perdida: o.motivo_perdida,
    productos: lineas,
    historial,
  };
}

/** Responde el detalle tras un cambio (ya confirmado), con el código indicado. */
async function responderDetalle(res, id, yo, status = 200) {
  const detalle = await cargarDetalle(pool, id, yo);
  if (!detalle) throw errorHttp(404, NO_ENCONTRADA); // la reasignaron justo después del cambio
  res.status(status).json(detalle);
}

// ─── Validaciones (lista blanca de campos, D5) ───────────────────────────

function validarTitulo(valor) {
  const titulo = typeof valor === 'string' ? valor.trim() : '';
  if (titulo === '') return { error: 'Escriba el título de la cotización.' };
  if (titulo.length > 150) return { error: 'El título no puede tener más de 150 caracteres.' };
  return { titulo };
}

const idValido = (v) => Number.isInteger(v) && v > 0;
const cantidadValida = (v) => Number.isInteger(v) && v >= 1 && v <= 999;
const MSG_CANTIDAD = 'La cantidad debe ser un número entero de 1 a 999.';
const MSG_PRODUCTO = 'Elija un producto activo del catálogo.';

// ─── Bloqueos ────────────────────────────────────────────────────────────

/**
 * Dentro de una transacción: respeta el orden users → oportunidades y bloquea la oportunidad
 * del asesor. Ajena o inexistente → 404.
 */
async function bloquearOportunidad(cx, id, yo) {
  await cx.query('SELECT id FROM users WHERE id = ? FOR SHARE', [yo]);
  const [[o]] = await cx.query(
    'SELECT id, etapa FROM oportunidades WHERE id = ? AND vendedor_id = ? FOR UPDATE',
    [id, yo],
  );
  if (!o) throw errorHttp(404, NO_ENCONTRADA);
  return o;
}

const tocar = (cx, id) => cx.query('UPDATE oportunidades SET updated_at = UTC_TIMESTAMP() WHERE id = ?', [id]);

// ─── Rutas ───────────────────────────────────────────────────────────────

// GET /api/oportunidades?etapa= → resumen de SUS oportunidades. Una etapa que no existe → 400.
rutasOportunidades.get('/', async (req, res) => {
  const { etapa } = req.query;
  if (etapa !== undefined && !esEtapa(etapa)) {
    throw errorHttp(400, 'El filtro etapa no es válido.');
  }

  let sql = `SELECT o.id, c.id AS cliente_id, c.nombre AS cliente_nombre, o.titulo, o.etapa, o.fecha_cierre,
                    COALESCE(t.total, 0) AS total
               FROM oportunidades o
               JOIN clientes c ON c.id = o.cliente_id
               LEFT JOIN (SELECT oportunidad_id, SUM(cantidad * precio_unitario) AS total
                            FROM oportunidad_productos GROUP BY oportunidad_id) t ON t.oportunidad_id = o.id
              WHERE o.vendedor_id = ?`;
  const params = [req.usuario.id];
  if (etapa !== undefined) {
    sql += ' AND o.etapa = ?';
    params.push(etapa);
  }

  const [filas] = await pool.query(sql + ' ORDER BY o.id', params);
  res.json(filas.map((f) => ({
    id: f.id,
    cliente: { id: f.cliente_id, nombre: f.cliente_nombre },
    titulo: f.titulo,
    etapa: f.etapa,
    probabilidad: PROBABILIDAD[f.etapa],
    total: f.total,
    fecha_cierre: f.fecha_cierre,
  })));
});

// POST /api/oportunidades { cliente_id, titulo } → 201, detalle, en prospecto.
rutasOportunidades.post('/', async (req, res) => {
  const cuerpo = exigirCuerpo(req);
  const yo = req.usuario.id;

  const errores = {};
  const { titulo, error: errorTitulo } = validarTitulo(cuerpo.titulo);
  if (errorTitulo) errores.titulo = errorTitulo;
  if (!idValido(cuerpo.cliente_id)) errores.cliente_id = 'Elija un cliente de su cartera.';
  if (Object.keys(errores).length) throw errores422(errores);

  const id = await enTransaccion(async (cx) => {
    // Orden users → clientes. FOR SHARE sobre el cliente choca con el FOR UPDATE del panel al
    // reasignarlo: o la cotización nace antes y el panel la mueve con el cliente (D2), o el
    // panel reasigna antes y aquí el cliente ya no está en la cartera (422).
    await cx.query('SELECT id FROM users WHERE id = ? FOR SHARE', [yo]);
    const [[cliente]] = await cx.query(
      'SELECT id FROM clientes WHERE id = ? AND vendedor_id = ? FOR SHARE',
      [cuerpo.cliente_id, yo],
    );
    if (!cliente) throw errores422({ cliente_id: 'Elija un cliente de su cartera.' });

    const [r] = await cx.query(
      `INSERT INTO oportunidades (cliente_id, vendedor_id, titulo, etapa, created_at, updated_at)
       VALUES (?, ?, ?, 'prospecto', UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [cliente.id, yo, titulo],
    );
    // Registro de creación en la misma transacción (R5).
    await cx.query(
      `INSERT INTO historial_etapas (oportunidad_id, usuario_id, etapa_anterior, etapa_nueva, created_at)
       VALUES (?, ?, NULL, 'prospecto', UTC_TIMESTAMP())`,
      [r.insertId, yo],
    );
    return r.insertId;
  });

  await responderDetalle(res, id, yo, 201);
});

// GET /api/oportunidades/:id → 200, detalle; ajena o inexistente → 404.
rutasOportunidades.get('/:id', async (req, res) => {
  const id = idDeRuta(req.params.id, NO_ENCONTRADA);
  const detalle = await cargarDetalle(pool, id, req.usuario.id);
  if (!detalle) throw errorHttp(404, NO_ENCONTRADA);
  res.json(detalle);
});

// PATCH /api/oportunidades/:id { titulo } → 200, detalle. Cerrada → 409.
rutasOportunidades.patch('/:id', async (req, res) => {
  const id = idDeRuta(req.params.id, NO_ENCONTRADA);
  const cuerpo = exigirCuerpo(req);
  const yo = req.usuario.id;

  await enTransaccion(async (cx) => {
    const o = await bloquearOportunidad(cx, id, yo);

    const { titulo, error } = validarTitulo(cuerpo.titulo);
    if (error) throw errores422({ titulo: error });
    if (estaCerrada(o.etapa)) throw errorHttp(409, CERRADA);

    await cx.query('UPDATE oportunidades SET titulo = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', [titulo, id]);
  });

  await responderDetalle(res, id, yo);
});

// PATCH /api/oportunidades/:id/etapa { etapa, motivo_perdida } → 200, detalle.
rutasOportunidades.patch('/:id/etapa', async (req, res) => {
  const id = idDeRuta(req.params.id, NO_ENCONTRADA);
  const cuerpo = exigirCuerpo(req);
  const yo = req.usuario.id;

  await enTransaccion(async (cx) => {
    const o = await bloquearOportunidad(cx, id, yo);
    const nueva = cuerpo.etapa;

    if (!esEtapa(nueva)) throw errores422({ etapa: 'Elija una etapa válida.' });
    if (estaCerrada(o.etapa)) throw errorHttp(409, CERRADA);
    if (!TRANSICIONES[o.etapa].includes(nueva)) {
      throw errores422({ etapa: nueva === o.etapa
        ? 'La cotización ya está en esa etapa.'
        : 'Ese cambio de etapa no está permitido.' });
    }

    // motivo_perdida solo se usa (y se exige) al perder.
    let motivo = null;
    if (nueva === 'perdida') {
      motivo = typeof cuerpo.motivo_perdida === 'string' ? cuerpo.motivo_perdida.trim() : '';
      if (motivo === '') throw errores422({ motivo_perdida: 'Escriba el motivo por el que se perdió la cotización.' });
      if (motivo.length > 255) throw errores422({ motivo_perdida: 'El motivo no puede tener más de 255 caracteres.' });
    }

    if (nueva === 'ganada') {
      const [[{ lineas, equipos, garantias }]] = await cx.query(
        `SELECT COUNT(*) AS lineas,
                COALESCE(SUM(CASE WHEN p.categoria = 'equipo'   THEN l.cantidad END), 0) AS equipos,
                COALESCE(SUM(CASE WHEN p.categoria = 'garantia' THEN l.cantidad END), 0) AS garantias
           FROM oportunidad_productos l JOIN productos p ON p.id = l.producto_id
          WHERE l.oportunidad_id = ?`,
        [id],
      );
      if (lineas === 0) throw errores422({ etapa: 'Agregue al menos un producto antes de cerrar la venta.' });

      // RS-1 «Cada equipo con su garantía» (especificación, sección 2).
      if (Number(equipos) > Number(garantias)) {
        throw errorHttp(409, `Cada equipo necesita su garantía: hay ${Number(equipos)} equipos y ${Number(garantias)} garantías.`);
      }
    }

    await cx.query(
      `UPDATE oportunidades
          SET etapa = ?, motivo_perdida = ?,
              fecha_cierre = IF(? IN ('ganada', 'perdida'), UTC_TIMESTAMP(), NULL),
              updated_at = UTC_TIMESTAMP()
        WHERE id = ?`,
      [nueva, motivo, nueva, id],
    );
    await cx.query(
      `INSERT INTO historial_etapas (oportunidad_id, usuario_id, etapa_anterior, etapa_nueva, created_at)
       VALUES (?, ?, ?, ?, UTC_TIMESTAMP())`,
      [id, yo, o.etapa, nueva],
    );
  });

  await responderDetalle(res, id, yo);
});

// POST /api/oportunidades/:id/productos { producto_id, cantidad } → 201, detalle.
rutasOportunidades.post('/:id/productos', async (req, res) => {
  const id = idDeRuta(req.params.id, NO_ENCONTRADA);
  const cuerpo = exigirCuerpo(req);
  const yo = req.usuario.id;

  await enTransaccion(async (cx) => {
    const o = await bloquearOportunidad(cx, id, yo);

    const errores = {};
    if (!cantidadValida(cuerpo.cantidad)) errores.cantidad = MSG_CANTIDAD;
    if (!idValido(cuerpo.producto_id)) {
      errores.producto_id = MSG_PRODUCTO;
    } else {
      const [[p]] = await cx.query('SELECT id FROM productos WHERE id = ? AND activo = 1', [cuerpo.producto_id]);
      if (!p) errores.producto_id = MSG_PRODUCTO;
    }
    if (Object.keys(errores).length) throw errores422(errores);
    if (estaCerrada(o.etapa)) throw errorHttp(409, CERRADA);

    // El precio se copia del catálogo EN el INSERT (R6); el cuerpo nunca trae precio.
    // El índice único (oportunidad_id, producto_id) es el árbitro final de los repetidos (S8).
    const [r] = await cx.query(
      `INSERT INTO oportunidad_productos (oportunidad_id, producto_id, cantidad, precio_unitario, created_at, updated_at)
       SELECT ?, p.id, ?, p.precio, UTC_TIMESTAMP(), UTC_TIMESTAMP()
         FROM productos p WHERE p.id = ? AND p.activo = 1`,
      [id, cuerpo.cantidad, cuerpo.producto_id],
    ).catch((e) => {
      if (e.code === 'ER_DUP_ENTRY') throw errorHttp(409, 'Ese producto ya está en la cotización: cambie su cantidad.');
      throw e;
    });
    if (r.affectedRows !== 1) throw errores422({ producto_id: MSG_PRODUCTO }); // lo desactivaron justo ahora
    await tocar(cx, id);
  });

  await responderDetalle(res, id, yo, 201);
});

// PATCH /api/oportunidades/:id/productos/:lineaId { cantidad } → 200, detalle.
rutasOportunidades.patch('/:id/productos/:lineaId', async (req, res) => {
  const id = idDeRuta(req.params.id, NO_ENCONTRADA);
  const lineaId = idDeRuta(req.params.lineaId, LINEA_NO_ENCONTRADA);
  const cuerpo = exigirCuerpo(req);
  const yo = req.usuario.id;

  await enTransaccion(async (cx) => {
    const o = await bloquearOportunidad(cx, id, yo);
    const [[linea]] = await cx.query(
      'SELECT id FROM oportunidad_productos WHERE id = ? AND oportunidad_id = ?', [lineaId, id]);
    if (!linea) throw errorHttp(404, LINEA_NO_ENCONTRADA);

    if (!cantidadValida(cuerpo.cantidad)) throw errores422({ cantidad: MSG_CANTIDAD });
    if (estaCerrada(o.etapa)) throw errorHttp(409, CERRADA);

    await cx.query(
      'UPDATE oportunidad_productos SET cantidad = ?, updated_at = UTC_TIMESTAMP() WHERE id = ? AND oportunidad_id = ?',
      [cuerpo.cantidad, lineaId, id],
    );
    await tocar(cx, id);
  });

  await responderDetalle(res, id, yo);
});

// DELETE /api/oportunidades/:id/productos/:lineaId → 204, sin cuerpo.
rutasOportunidades.delete('/:id/productos/:lineaId', async (req, res) => {
  const id = idDeRuta(req.params.id, NO_ENCONTRADA);
  const lineaId = idDeRuta(req.params.lineaId, LINEA_NO_ENCONTRADA);
  const yo = req.usuario.id;

  await enTransaccion(async (cx) => {
    const o = await bloquearOportunidad(cx, id, yo);
    const [[linea]] = await cx.query(
      'SELECT id FROM oportunidad_productos WHERE id = ? AND oportunidad_id = ?', [lineaId, id]);
    if (!linea) throw errorHttp(404, LINEA_NO_ENCONTRADA);
    if (estaCerrada(o.etapa)) throw errorHttp(409, CERRADA);

    await cx.query('DELETE FROM oportunidad_productos WHERE id = ? AND oportunidad_id = ?', [lineaId, id]);
    await tocar(cx, id);
  });

  res.status(204).end();
});
