import { Router } from 'express';
import { pool } from '../db.js';
import { errorHttp, MAXIMO_CARTERA } from '../util/http.js';

/**
 * A6 · Resumen del mes del asesor (R7). Misma lógica que laravel/app/Services/Reportes.php.
 *
 * - Venta = oportunidad ganada del asesor; su mes es el de fecha_cierre en hora de Guatemala
 *   (UTC−6 fijo, sin horario de verano). Se filtra con el rango UTC del mes:
 *   '2026-10' → [2026-10-01 06:00:00, 2026-11-01 06:00:00).
 * - Total vendido = SUM(cantidad × precio_unitario) con el precio GUARDADO en la línea.
 * - Pronóstico = ROUND(SUM(total × probabilidad), 2) de TODAS sus abiertas, sin filtro de mes;
 *   se redondea una sola vez, al final.
 * - Todo se calcula en SQL y sale como número gracias a decimalNumbers (nunca "9250.00").
 */
export const rutasReportes = Router();

const DESFASE_GUATEMALA_MS = 6 * 60 * 60 * 1000;

/** Mes actual en Guatemala, sin importar la zona horaria del servidor. */
function mesActualGuatemala() {
  const ahora = new Date(Date.now() - DESFASE_GUATEMALA_MS);
  return `${ahora.getUTCFullYear()}-${String(ahora.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** 'AAAA-MM' → { inicio, fin } en UTC, o null si el texto no es un mes válido. */
export function rangoUtcDelMes(mes) {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(mes);
  if (!m) return null;
  const anio = Number(m[1]);
  const indice = Number(m[2]) - 1;
  // 00:00 en Guatemala = 06:00 UTC. Date.UTC pasa sola de diciembre a enero del año siguiente.
  return {
    inicio: new Date(Date.UTC(anio, indice, 1, 6)),
    fin: new Date(Date.UTC(anio, indice + 1, 1, 6)),
  };
}

// GET /api/reportes/resumen?mes=AAAA-MM → { mes, ventas, total, pronostico, cartera: { clientes, maximo } }
rutasReportes.get('/resumen', async (req, res) => {
  const { mes: mesQuery } = req.query;
  if (mesQuery !== undefined && typeof mesQuery !== 'string') {
    throw errorHttp(400, 'El parámetro mes debe tener la forma AAAA-MM, por ejemplo 2026-10.');
  }
  const mes = mesQuery === undefined || mesQuery === '' ? mesActualGuatemala() : mesQuery;
  const rango = rangoUtcDelMes(mes);
  if (!rango) throw errorHttp(400, 'El parámetro mes debe tener la forma AAAA-MM, por ejemplo 2026-10.');

  const yo = req.usuario.id;

  const [[ventas]] = await pool.query(
    `SELECT COUNT(*) AS ventas, COALESCE(SUM(t.total), 0) AS total
       FROM oportunidades o
       LEFT JOIN (SELECT oportunidad_id, SUM(cantidad * precio_unitario) AS total
                    FROM oportunidad_productos GROUP BY oportunidad_id) t ON t.oportunidad_id = o.id
      WHERE o.vendedor_id = ? AND o.etapa = 'ganada'
        AND o.fecha_cierre >= ? AND o.fecha_cierre < ?`,
    [yo, rango.inicio, rango.fin],
  );

  // La expresión CASE es fija (no lleva datos del usuario): probabilidades de R5.
  const [[{ pronostico }]] = await pool.query(
    `SELECT ROUND(COALESCE(SUM(COALESCE(t.total, 0) *
              CASE o.etapa WHEN 'prospecto' THEN 0.10 WHEN 'calificado' THEN 0.25
                           WHEN 'propuesta' THEN 0.50 WHEN 'negociacion' THEN 0.75 ELSE 0 END), 0), 2) AS pronostico
       FROM oportunidades o
       LEFT JOIN (SELECT oportunidad_id, SUM(cantidad * precio_unitario) AS total
                    FROM oportunidad_productos GROUP BY oportunidad_id) t ON t.oportunidad_id = o.id
      WHERE o.vendedor_id = ? AND o.etapa IN ('prospecto', 'calificado', 'propuesta', 'negociacion')`,
    [yo],
  );

  const [[{ clientes }]] = await pool.query('SELECT COUNT(*) AS clientes FROM clientes WHERE vendedor_id = ?', [yo]);

  res.json({
    mes,
    ventas: Number(ventas.ventas),
    total: Number(ventas.total),
    pronostico: Number(pronostico),
    cartera: { clientes: Number(clientes), maximo: MAXIMO_CARTERA },
  });
});
