/**
 * F3 · Detalle de una cotización: productos (cantidad, precio guardado, subtotal), total,
 * historial en hora de Guatemala, cambio de cantidades, agregar/quitar productos y botones de
 * etapa según la decisión D1. Perder pide el motivo.
 */
import { estado, render } from '../estado.js';
import { api } from '../api.js';
import { html, formatoQ, fechaGT } from '../utilidades.js';
import { ETAPAS, ABIERTAS, TRANSICIONES, CATEGORIAS } from '../etiquetas.js';
import { errorGeneral } from '../formularios.js';

export async function cargar({ id }) {
  const d = estado.detalle;
  Object.assign(d, { op: null, pidiendoMotivo: false, errores: {}, error: null });
  try {
    const [op, catalogo] = await Promise.all([api.get(`/oportunidades/${id}`), api.get('/productos')]);
    Object.assign(d, { op, catalogo });
  } catch (e) {
    if (e.status === 404) { d.error = e.message; return; }
    throw e;
  }
}

/** Ejecuta un cambio y muestra el resultado o el error en su sitio (422 por formulario, 409 arriba). */
async function cambiar(contexto, peticion) {
  const d = estado.detalle;
  d.errores = {};
  d.error = null;
  try {
    const respuesta = await peticion();
    if (respuesta) d.op = respuesta;
    else d.op = await api.get(`/oportunidades/${d.op.id}`); // DELETE responde 204 sin cuerpo
    d.pidiendoMotivo = false;
  } catch (e) {
    if (e.sesionTerminada) return;
    if (e.status === 422) d.errores = { [contexto]: e.errores };
    else if (e.status === 404 || e.status === 409) d.error = e.message;
    else throw e;
  }
  render();
}

const erroresDe = (contexto) => estado.detalle.errores[contexto] ?? {};
const mensajes = (errores) => Object.values(errores).map((m) => html`<div class="invalid-feedback d-block">${m}</div>`);

function textoBoton(actual, destino) {
  if (destino === 'ganada') return 'Cerrar venta';
  if (destino === 'perdida') return 'Marcar como perdida';
  return ABIERTAS.indexOf(destino) > ABIERTAS.indexOf(actual) ? `Avanzar a ${ETAPAS[destino]}` : `Regresar a ${ETAPAS[destino]}`;
}

function botonesEtapa(op) {
  const d = estado.detalle;
  const destinos = TRANSICIONES[op.etapa];
  if (!destinos.length) return '';
  const errores = erroresDe('etapa');

  if (d.pidiendoMotivo) {
    const error = erroresDe('perder').motivo_perdida;
    return html`
      <form class="border rounded p-3 bg-white mb-3" data-form="perder" novalidate>
        <label class="form-label" for="f-motivo">¿Por qué se perdió la cotización?</label>
        <textarea class="form-control ${error ? 'is-invalid' : ''}" id="f-motivo" name="motivo_perdida" rows="2" maxlength="255"></textarea>
        ${error ? html`<div class="invalid-feedback">${error}</div>` : ''}
        <div class="d-flex gap-2 mt-2">
          <button class="btn btn-danger btn-sm" type="submit">Marcar como perdida</button>
          <button class="btn btn-outline-secondary btn-sm" type="button" data-accion="cancelarMotivo">Cancelar</button>
        </div>
      </form>`;
  }

  return html`
    <div class="d-flex flex-wrap gap-2 mb-3">
      ${destinos.map((destino) => html`
        <button type="button" data-accion="${destino === 'perdida' ? 'pedirMotivo' : 'etapa'}" data-etapa="${destino}"
                class="btn btn-sm ${destino === 'ganada' ? 'btn-success' : destino === 'perdida' ? 'btn-outline-danger' : 'btn-outline-success'}">
          ${textoBoton(op.etapa, destino)}
        </button>`)}
    </div>
    ${mensajes(errores)}`;
}

function lineas(op, abierta) {
  if (!op.productos.length) return html`<p class="text-secondary">La cotización todavía no tiene productos.</p>`;
  return html`
    <ul class="list-group mb-2">
      ${op.productos.map((l) => {
        const errores = erroresDe(`linea-${l.id}`);
        return html`
          <li class="list-group-item">
            <div class="d-flex flex-wrap gap-2">
              <span class="fw-semibold me-auto text-break">${l.nombre}</span>
              <span>${formatoQ(l.subtotal)}</span>
            </div>
            <div class="small text-secondary mb-1">${formatoQ(l.precio_unitario)} c/u (precio cotizado)</div>
            ${abierta ? html`
              <form class="d-flex flex-wrap align-items-center gap-2" data-form="cantidad" data-linea="${l.id}" novalidate>
                <label class="small" for="cant-${l.id}">Cantidad</label>
                <input class="form-control form-control-sm w-auto ${errores.cantidad ? 'is-invalid' : ''}" id="cant-${l.id}"
                       name="cantidad" type="number" min="1" max="999" step="1" value="${l.cantidad}" style="max-width: 6rem">
                <button class="btn btn-sm btn-outline-success" type="submit">Guardar</button>
                <button class="btn btn-sm btn-outline-danger" type="button" data-accion="quitar" data-linea="${l.id}">Quitar</button>
                ${mensajes(errores)}
              </form>`
            : html`<div class="small">Cantidad: ${l.cantidad}</div>`}
          </li>`;
      })}
    </ul>`;
}

function agregarProducto(op) {
  const errores = erroresDe('agregar');
  const enLaCotizacion = new Set(op.productos.map((l) => l.producto_id));
  const opciones = estado.detalle.catalogo.filter((p) => !enLaCotizacion.has(p.id));
  return html`
    <form class="row g-2 align-items-start mb-4" data-form="agregar" novalidate>
      <div class="col-12 col-sm-8">
        <label class="form-label small" for="f-producto">Agregar producto del catálogo</label>
        <select class="form-select ${errores.producto_id ? 'is-invalid' : ''}" id="f-producto" name="producto_id">
          <option value="">Elija un producto</option>
          ${opciones.map((p) => html`
            <option value="${p.id}">${p.nombre} — ${formatoQ(p.precio)}${p.categoria ? html` (${CATEGORIAS[p.categoria] ?? p.categoria})` : ''}</option>`)}
        </select>
        ${errores.producto_id ? html`<div class="invalid-feedback">${errores.producto_id}</div>` : ''}
      </div>
      <div class="col-6 col-sm-2">
        <label class="form-label small" for="f-cantidad">Cantidad</label>
        <input class="form-control ${errores.cantidad ? 'is-invalid' : ''}" id="f-cantidad" name="cantidad" type="number" min="1" max="999" step="1" value="1">
        ${errores.cantidad ? html`<div class="invalid-feedback">${errores.cantidad}</div>` : ''}
      </div>
      <div class="col-6 col-sm-2 d-flex align-items-end" style="min-height: 4.1rem">
        <button class="btn btn-success w-100" type="submit">Agregar</button>
      </div>
    </form>`;
}

export function vista() {
  const { op, error } = estado.detalle;
  const volver = html`<a class="d-inline-block mb-3" href="#/embudo">← Volver a cotizaciones</a>`;
  if (!op) return html`${volver}${errorGeneral(error)}`;

  const abierta = ABIERTAS.includes(op.etapa);
  const erroresTitulo = erroresDe('titulo');

  return html`
    ${volver}
    <div class="d-flex flex-wrap align-items-start gap-2 mb-1">
      <h1 class="h4 mb-0 me-auto text-break">${op.titulo}</h1>
      <span class="badge fs-6 ${op.etapa === 'ganada' ? 'text-bg-success' : op.etapa === 'perdida' ? 'text-bg-secondary' : 'text-bg-primary'}">${ETAPAS[op.etapa]}</span>
    </div>
    <p class="text-secondary mb-3">
      ${op.cliente.nombre} · Probabilidad ${op.probabilidad} %
      ${op.fecha_cierre ? html` · Cerrada el ${fechaGT(op.fecha_cierre)}` : ''}
    </p>
    ${op.motivo_perdida ? html`<p><strong>Motivo de pérdida:</strong> ${op.motivo_perdida}</p>` : ''}
    ${errorGeneral(error)}

    <div class="row g-4">
      <div class="col-lg-8">
        ${botonesEtapa(op)}

        <h2 class="h5">Productos</h2>
        ${lineas(op, abierta)}
        <p class="fs-5 text-end">Total: <strong>${formatoQ(op.total)}</strong></p>
        ${abierta ? agregarProducto(op) : html`<p class="small text-secondary">La cotización está cerrada: ya no se puede modificar.</p>`}

        ${abierta ? html`
          <form class="mb-4" data-form="titulo" novalidate>
            <label class="form-label small" for="f-titulo">Título</label>
            <div class="input-group">
              <input class="form-control ${erroresTitulo.titulo ? 'is-invalid' : ''}" id="f-titulo" name="titulo" value="${op.titulo}" maxlength="150">
              <button class="btn btn-outline-success" type="submit">Cambiar título</button>
              ${erroresTitulo.titulo ? html`<div class="invalid-feedback">${erroresTitulo.titulo}</div>` : ''}
            </div>
          </form>` : ''}
      </div>

      <div class="col-lg-4">
        <h2 class="h5">Historial</h2>
        <ol class="list-group list-group-numbered">
          ${op.historial.map((h) => html`
            <li class="list-group-item small">
              ${h.etapa_anterior ? html`${ETAPAS[h.etapa_anterior]} → ` : 'Creada en '}<strong>${ETAPAS[h.etapa_nueva]}</strong>
              <div class="text-secondary">${fechaGT(h.fecha)} · ${h.usuario}</div>
            </li>`)}
        </ol>
      </div>
    </div>`;
}

const id = () => estado.detalle.op.id;
const entero = (v) => (v === '' || v === undefined ? null : Number(v));

export const acciones = {
  etapa: ({ etapa }) => cambiar('etapa', () => api.patch(`/oportunidades/${id()}/etapa`, { etapa })),
  quitar: ({ linea }) => cambiar(`linea-${linea}`, () => api.delete(`/oportunidades/${id()}/productos/${linea}`)),
  pedirMotivo() { estado.detalle.pidiendoMotivo = true; estado.detalle.errores = {}; render(); },
  cancelarMotivo() { estado.detalle.pidiendoMotivo = false; estado.detalle.errores = {}; render(); },
};

export const formularios = {
  perder: ({ motivo_perdida }) => cambiar('perder',
    () => api.patch(`/oportunidades/${id()}/etapa`, { etapa: 'perdida', motivo_perdida })),
  agregar: ({ producto_id, cantidad }) => cambiar('agregar',
    () => api.post(`/oportunidades/${id()}/productos`, { producto_id: entero(producto_id), cantidad: entero(cantidad) })),
  cantidad: ({ cantidad }, { linea }) => cambiar(`linea-${linea}`,
    () => api.patch(`/oportunidades/${id()}/productos/${linea}`, { cantidad: entero(cantidad) })),
  titulo: ({ titulo }) => cambiar('titulo', () => api.patch(`/oportunidades/${id()}`, { titulo })),
};
