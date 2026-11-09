/**
 * Arranque de la SPA: enrutador por hash, render y delegación de eventos (F6).
 *
 *   #/login            inicio de sesión            (vistas/login.js)
 *   #/cartera          cartera y disponibles       (vistas/cartera.js)
 *   #/embudo           tablero de cotizaciones     (vistas/embudo.js)
 *   #/cotizacion/:id   detalle de una cotización   (vistas/detalle.js)
 *   #/seguimientos     seguimientos                (vistas/seguimientos.js)
 *   #/resumen          resumen del mes             (vistas/resumen.js)
 *
 * Cada vista exporta: cargar(params) para pedir sus datos, vista() que devuelve el HTML a partir
 * del estado, y opcionalmente acciones (clics en [data-accion]) y formularios (submit de
 * [data-form]). Hay UN listener por tipo de evento en #app: los elementos se redibujan
 * a cada render, así que no se les puede colgar un listener propio.
 */
import { estado, alRender, render, borrarToken, datosIniciales } from './estado.js';
import { siTerminaLaSesion } from './api.js';
import { html } from './utilidades.js';
import { barra } from './vistas/barra.js';
import * as login from './vistas/login.js';
import * as cartera from './vistas/cartera.js';
import * as embudo from './vistas/embudo.js';
import * as detalle from './vistas/detalle.js';
import * as seguimientos from './vistas/seguimientos.js';
import * as resumen from './vistas/resumen.js';

const RUTAS = { login, cartera, embudo, cotizacion: detalle, seguimientos, resumen };
const app = document.getElementById('app');
const nav = document.getElementById('barra');

function aviso() {
  if (!estado.aviso) return '';
  return html`
    <div class="alert alert-${estado.aviso.tipo} alert-dismissible" role="alert">
      ${estado.aviso.texto}
      <button type="button" class="btn-close" data-accion="cerrarAviso" aria-label="Cerrar"></button>
    </div>`;
}

alRender(() => {
  nav.innerHTML = barra();
  const vista = RUTAS[estado.ruta];
  app.innerHTML = html`${aviso()}${vista ? vista.vista() : ''}`.toString();
});

/** Muestra un error de la API como aviso general (si no lo manejó la vista). */
function mostrarError(e) {
  if (e?.sesionTerminada) return;
  console.error(e);
  estado.aviso = { tipo: 'danger', texto: e?.status !== undefined ? e.message : 'Ocurrió un error inesperado en la página.' };
  render();
}

/** Cierra la sesión y vuelve al inicio con un aviso. */
function terminarSesion(texto, tipo = 'warning') {
  borrarToken();
  Object.assign(estado, datosIniciales());
  estado.avisoPendiente = { tipo, texto };
  if (location.hash === '#/login') navegar();
  else location.hash = '#/login';
}
siTerminaLaSesion((texto) => terminarSesion(texto));

async function navegar() {
  const [nombre = '', id] = location.hash.replace(/^#\/?/, '').split('/');

  if (!estado.token && nombre !== 'login') { location.hash = '#/login'; return; }
  if (estado.token && (nombre === 'login' || !RUTAS[nombre])) { location.hash = '#/cartera'; return; }

  estado.ruta = nombre;
  estado.params = { id };
  estado.aviso = estado.avisoPendiente;
  estado.avisoPendiente = null;
  render();

  try {
    await RUTAS[nombre].cargar?.(estado.params);
  } catch (e) {
    mostrarError(e);
  }
  if (estado.ruta === nombre) render();
}

// ─── Delegación de eventos ───────────────────────────────────────────────

const accionesGenerales = {
  cerrarAviso: () => { estado.aviso = null; render(); },
  salir: () => terminarSesion('Cerró su sesión.', 'info'),
};

async function ejecutarAccion(evento) {
  const el = evento.target.closest('[data-accion]');
  if (!el) return;
  evento.preventDefault();
  const nombre = el.dataset.accion;
  const fn = accionesGenerales[nombre] ?? RUTAS[estado.ruta]?.acciones?.[nombre];
  if (!fn) return;
  try {
    await fn(el.dataset, el);
  } catch (e) {
    mostrarError(e);
  }
}

app.addEventListener('click', ejecutarAccion);
nav.addEventListener('click', ejecutarAccion);

app.addEventListener('submit', async (evento) => {
  const form = evento.target.closest('form[data-form]');
  if (!form) return;
  evento.preventDefault();
  const fn = RUTAS[estado.ruta]?.formularios?.[form.dataset.form];
  if (!fn) return;
  const datos = Object.fromEntries(new FormData(form));
  try {
    await fn(datos, form.dataset);
  } catch (e) {
    mostrarError(e);
  }
});

window.addEventListener('hashchange', navegar);
navegar();
