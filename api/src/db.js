import mysql from 'mysql2/promise';

/**
 * Pool de conexiones a la base que definió Laravel. La API nunca ejecuta CREATE ni ALTER:
 * solo SELECT, INSERT, UPDATE y DELETE con parámetros (?).
 */
export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  // DECIMAL llega como número (9250), no como texto ("9250.00") → R7.
  decimalNumbers: true,
  // DATETIME se interpreta como UTC y sale con toISOString() → "2026-10-05T16:00:00.000Z" (R8).
  timezone: 'Z',
});

/**
 * Ejecuta fn(conexion) dentro de una transacción. Si fn lanza un error, se hace rollback.
 * @template T
 * @param {(cx: import('mysql2/promise').PoolConnection) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function enTransaccion(fn) {
  const cx = await pool.getConnection();
  try {
    await cx.beginTransaction();
    const resultado = await fn(cx);
    await cx.commit();
    return resultado;
  } catch (e) {
    await cx.rollback();
    throw e;
  } finally {
    cx.release();
  }
}
