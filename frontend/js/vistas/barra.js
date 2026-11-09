import { estado } from '../estado.js';
import { EMPRESA } from '../etiquetas.js';
import { html } from '../utilidades.js';

const ENLACES = [
  ['cartera', 'Cartera'],
  ['embudo', 'Cotizaciones'],
  ['seguimientos', 'Seguimientos'],
  ['resumen', 'Resumen'],
];

/** Barra superior; con sesión muestra el menú (colapsable en el teléfono). */
export function barra() {
  const activa = estado.ruta === 'cotizacion' ? 'embudo' : estado.ruta;
  return html`
    <div class="container">
      <a class="navbar-brand fw-semibold" href="#/cartera">${EMPRESA}</a>
      ${estado.token ? html`
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menu"
                aria-controls="menu" aria-expanded="false" aria-label="Abrir el menú">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="menu">
          <ul class="navbar-nav me-auto">
            ${ENLACES.map(([ruta, texto]) => html`
              <li class="nav-item">
                <a class="nav-link ${ruta === activa ? 'active' : ''}" href="#/${ruta}"
                   ${ruta === activa ? html`aria-current="page"` : ''}>${texto}</a>
              </li>`)}
          </ul>
          <span class="navbar-text me-3 small">${estado.usuario?.nombre ?? 'Asesor de ventas'}</span>
          <button class="btn btn-outline-light btn-sm" type="button" data-accion="salir">Cerrar sesión</button>
        </div>` : ''}
    </div>`.toString();
}
