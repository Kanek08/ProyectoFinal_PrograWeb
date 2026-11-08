import { Router } from 'express';
import { pool } from '../db.js';

export const rutasProductos = Router();

/** GET /api/productos → productos activos. `categoria` es un campo extra de la capa de sector. */
rutasProductos.get('/', async (req, res) => {
  const [filas] = await pool.query(
    'SELECT id, nombre, precio, categoria FROM productos WHERE activo = 1 ORDER BY nombre',
  );
  res.json(filas);
});
