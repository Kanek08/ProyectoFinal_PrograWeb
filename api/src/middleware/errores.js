/**
 * A7: toda respuesta es JSON, nunca una página HTML.
 */

/** Ruta que no existe → 404 JSON. */
export function rutaNoEncontrada(req, res) {
  res.status(404).json({ error: 'Recurso no encontrado.' });
}

/** Manejador final. Express 5 trae aquí también los errores de funciones async. */
// eslint-disable-next-line no-unused-vars
export function manejadorErrores(err, req, res, next) {
  // JSON mal formado (lo detecta express.json()).
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es JSON válido.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(400).json({ error: 'El cuerpo de la petición es demasiado grande.' });
  }

  // Errores esperados: errorHttp() y errores422() de util/http.js.
  if (err.status && err.cuerpo) {
    return res.status(err.status).json(err.cuerpo);
  }

  // Inesperado: mensaje genérico; el detalle solo en la consola del servidor.
  console.error(err);
  res.status(500).json({ error: 'Ocurrió un error inesperado.' });
}
