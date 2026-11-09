/**
 * Único punto de contacto con la API REST.
 *
 * - Agrega Authorization: Bearer <token> a cada petición.
 * - Muestra el indicador de carga mientras haya peticiones en curso (F6).
 * - Si la API está apagada, lanza un error con un mensaje claro (F6).
 * - Si una petición responde 401 en plena sesión, cierra la sesión y vuelve al inicio (F1).
 */
import { estado } from './estado.js';

// El origen de la SPA (http://127.0.0.1:5500) debe ser exactamente el CORS_ORIGIN de api/.env (S6).
export const API = 'http://localhost:3000/api';

export const SIN_CONEXION = 'No se pudo conectar con el servidor. Verifique que la API esté encendida.';
export const SESION_TERMINADA = 'Su sesión terminó. Inicie sesión de nuevo.';

/** Error de la API: status, mensaje ({ error }) y errores por campo ({ errores }) del 422. */
export class ErrorApi extends Error {
  constructor(status, cuerpo, { sesionTerminada = false } = {}) {
    const errores = cuerpo?.errores ?? {};
    super(cuerpo?.error ?? (Object.keys(errores).length ? 'Revise los datos marcados.' : 'Ocurrió un error inesperado.'));
    this.status = status;
    this.errores = errores;
    this.sesionTerminada = sesionTerminada;
  }
}

let enCurso = 0;
function marcarCarga(cambio) {
  enCurso += cambio;
  const indicador = document.getElementById('cargando');
  if (indicador) indicador.hidden = enCurso === 0;
}

let alTerminarSesion = () => {};
/** main.js indica qué hacer cuando el token deja de servir. */
export function siTerminaLaSesion(fn) { alTerminarSesion = fn; }

export async function pedir(metodo, ruta, cuerpo) {
  marcarCarga(1);
  try {
    let respuesta;
    try {
      respuesta = await fetch(API + ruta, {
        method: metodo,
        headers: {
          ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(estado.token ? { Authorization: `Bearer ${estado.token}` } : {}),
        },
        body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      });
    } catch {
      throw new ErrorApi(0, { error: SIN_CONEXION });
    }

    if (respuesta.status === 204) return null;

    let datos = null;
    try { datos = await respuesta.json(); } catch { /* sin cuerpo JSON */ }

    // 401 en plena sesión: el token venció, fue alterado o la cuenta se desactivó.
    if (respuesta.status === 401 && ruta !== '/auth/login') {
      alTerminarSesion(SESION_TERMINADA);
      throw new ErrorApi(401, { error: SESION_TERMINADA }, { sesionTerminada: true });
    }
    if (!respuesta.ok) throw new ErrorApi(respuesta.status, datos);
    return datos;
  } finally {
    marcarCarga(-1);
  }
}

export const api = {
  get: (ruta) => pedir('GET', ruta),
  post: (ruta, cuerpo) => pedir('POST', ruta, cuerpo ?? {}),
  patch: (ruta, cuerpo) => pedir('PATCH', ruta, cuerpo),
  delete: (ruta) => pedir('DELETE', ruta),
};
