/**
 * Estado único de la SPA (F6: patrón estado → render).
 *
 * Las vistas nunca tocan el DOM directamente: cambian `estado` y llaman a render().
 * render() vuelve a dibujar #app a partir del estado completo.
 *
 * LocalStorage guarda SOLO el token de la sesión (F1). El nombre del asesor y los datos
 * viven en memoria y se vuelven a pedir a la API.
 */
import { mesActualGT } from './utilidades.js';

const CLAVE_TOKEN = 'crm.token';

function leerToken() {
  try { return localStorage.getItem(CLAVE_TOKEN); } catch { return null; }
}

export function guardarToken(token) {
  estado.token = token;
  try { localStorage.setItem(CLAVE_TOKEN, token); } catch { /* modo privado: la sesión dura lo que la pestaña */ }
}

export function borrarToken() {
  estado.token = null;
  try { localStorage.removeItem(CLAVE_TOKEN); } catch { /* nada que borrar */ }
}

const formVacio = () => ({ valores: {}, errores: {}, error: null });

/** Datos de cada vista; se reinician al cerrar sesión. */
export function datosIniciales() {
  return {
    usuario: null,
    login: formVacio(),
    cartera: { clientes: [], total: 0, q: '', disponibles: [], form: formVacio() },
    embudo: { oportunidades: [], clientes: [], form: formVacio() },
    detalle: { op: null, catalogo: [], pidiendoMotivo: false, errores: {}, error: null },
    seguimientos: { lista: [], filtro: 'pendiente', clientes: [], form: formVacio() },
    resumen: { mes: mesActualGT(), datos: null },
  };
}

export const estado = {
  token: leerToken(),
  ruta: '',
  params: {},
  aviso: null, // { tipo: 'success' | 'danger' | 'warning' | 'info', texto }
  avisoPendiente: null, // aviso que se muestra después de cambiar de ruta
  ...datosIniciales(),
};

let dibujar = () => {};

/** main.js registra aquí la función que dibuja la pantalla. */
export function alRender(fn) { dibujar = fn; }

export function render() { dibujar(); }

export function avisar(tipo, texto) {
  estado.aviso = { tipo, texto };
  render();
}
