import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { errorHttp } from '../util/http.js';

/**
 * A2 · Middleware de autenticación.
 * - Exige Authorization: Bearer <token>; sin token, alterado, vencido o con otro algoritmo → 401.
 * - Relee al usuario en CADA petición: si lo desactivaron o ya no es vendedor, el token deja de servir.
 * - El dueño de todo lo que se lea o escriba sale de req.usuario, nunca del cuerpo (R2).
 */
export async function autenticar(req, res, next) {
  const encabezado = req.headers.authorization ?? '';
  const [esquema, token] = encabezado.split(' ');

  if (esquema !== 'Bearer' || !token) {
    throw errorHttp(401, 'Inicie sesión para continuar.');
  }

  let payload;
  try {
    // algorithms fijo: un token firmado con otro algoritmo (o "none") se rechaza.
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw errorHttp(401, 'Su sesión no es válida o ya venció. Inicie sesión de nuevo.');
  }

  if (!/^[1-9]\d*$/.test(String(payload.sub ?? ''))) {
    throw errorHttp(401, 'Su sesión no es válida o ya venció. Inicie sesión de nuevo.');
  }

  const [filas] = await pool.query(
    "SELECT id, name, email FROM users WHERE id = ? AND rol = 'vendedor' AND activo = 1",
    [Number(payload.sub)],
  );

  if (filas.length === 0) {
    throw errorHttp(401, 'Su cuenta ya no tiene acceso. Inicie sesión de nuevo.');
  }

  req.usuario = { id: filas[0].id, nombre: filas[0].name, correo: filas[0].email };
  next();
}
