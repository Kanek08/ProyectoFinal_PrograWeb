/**
 * Errores con código HTTP. El manejador de errores (middleware/errores.js) los convierte en JSON:
 *   errorHttp(409, 'mensaje')     → 409 { "error": "mensaje" }
 *   errores422({ campo: 'msg' })  → 422 { "errores": { "campo": "msg" } }
 */
export function errorHttp(status, mensaje) {
  const e = new Error(mensaje);
  e.status = status;
  e.cuerpo = { error: mensaje };
  return e;
}

export function errores422(errores) {
  const e = new Error('Revise los datos enviados.');
  e.status = 422;
  e.cuerpo = { errores };
  return e;
}

/** 400 si la petición no trae un objeto JSON como cuerpo. */
export function exigirCuerpo(req) {
  const b = req.body;
  if (b === undefined || b === null || typeof b !== 'object' || Array.isArray(b)) {
    throw errorHttp(400, 'Envíe el cuerpo de la petición como un objeto JSON.');
  }
  return b;
}

/** Un :id de la ruta que no es entero positivo no puede existir → 404. */
export function idDeRuta(valor, mensaje = 'Recurso no encontrado.') {
  if (!/^[1-9]\d{0,18}$/.test(String(valor))) throw errorHttp(404, mensaje);
  return Number(valor);
}

export const MAXIMO_CARTERA = 10;
