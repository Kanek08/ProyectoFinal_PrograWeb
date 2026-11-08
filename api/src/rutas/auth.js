import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { errorHttp, errores422, exigirCuerpo } from '../util/http.js';

export const rutasAuth = Router();

const CREDENCIALES_INCORRECTAS = 'Correo o contraseña incorrectos.';

/**
 * A1 · POST /api/auth/login { correo, clave }
 * 200 { token, usuario } solo para vendedores activos. 403 para cuentas correctas que no pueden usar
 * la API. 401 idéntico para correo inexistente y contraseña incorrecta.
 * La API solo VERIFICA contraseñas (S1): los hashes los genera Laravel. Se usa bcryptjs porque
 * entiende el prefijo $2y$ de PHP (el paquete nativo bcrypt responde false sin avisar).
 */
rutasAuth.post('/login', async (req, res) => {
  const { correo, clave } = exigirCuerpo(req);

  const errores = {};
  if (typeof correo !== 'string' || correo.trim() === '') errores.correo = 'Escriba su correo.';
  if (typeof clave !== 'string' || clave === '') errores.clave = 'Escriba su contraseña.';
  if (Object.keys(errores).length) throw errores422(errores);

  const [filas] = await pool.query(
    'SELECT id, name, email, password, rol, activo FROM users WHERE email = ?',
    [correo.trim().toLowerCase()],
  );
  const usuario = filas[0];

  const claveCorrecta = usuario ? await bcrypt.compare(clave, usuario.password) : false;
  if (!claveCorrecta) throw errorHttp(401, CREDENCIALES_INCORRECTAS);

  if (usuario.rol !== 'vendedor' || !usuario.activo) {
    throw errorHttp(403, 'Su cuenta no puede usar la aplicación de ventas.');
  }

  const token = jwt.sign({}, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: String(usuario.id),
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

  res.json({ token, usuario: { id: usuario.id, nombre: usuario.name, correo: usuario.email } });
});
