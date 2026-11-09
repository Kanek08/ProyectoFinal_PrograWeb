/**
 * F3 · Embudo: una columna por etapa abierta, la lista de cerradas y el alta de cotizaciones.
 */
import { estado, render } from '../estado.js';
import { api } from '../api.js';
import { html, formatoQ, fechaGT } from '../utilidades.js';
import { ETAPAS, ABIERTAS, CERRADAS } from '../etiquetas.js';
import { campo, seleccion, errorGeneral, aplicarError } from '../formularios.js';

export async function cargar() {
  const [oportunidades, clientes] = await Promise.all([api.get('/oportunidades'), api.get('/clientes')]);
  Object.assign(estado.embudo, { oportunidades, clientes, form: { valores: {}, errores: {}, error: null } });
}

function tarjeta(o) {
  return html`
    <a class="card card-body p-2 mb-2 text-decoration-none text-body shadow-sm" href="#/cotizacion/${o.id}">
      <div class="fw-semibold text-break">${o.titulo}</div>
      <div class="small text-secondary text-break">${o.cliente.nombre}</div>
      <div class="small d-flex justify-content-between"><span>${formatoQ(o.total)}</span><span>${o.probabilidad} %</span></div>
    </a>`;
}

export function vista() {
  const { oportunidades, clientes, form } = estado.embudo;
  const cerradas = oportunidades.filter((o) => CERRADAS.includes(o.etapa));

  return html`
    <h1 class="h4 mb-3">Cotizaciones</h1>

    <div class="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 mb-4">
      ${ABIERTAS.map((etapa) => {
        const lista = oportunidades.filter((o) => o.etapa === etapa);
        const suma = lista.reduce((s, o) => s + o.total, 0);
        return html`
          <div class="col">
            <section class="columna-etapa bg-white rounded border p-2 h-100" aria-label="${ETAPAS[etapa]}">
              <h2 class="h6 d-flex justify-content-between">
                <span>${ETAPAS[etapa]}</span><span class="badge text-bg-secondary">${lista.length}</span>
              </h2>
              <div class="small text-secondary mb-2">${formatoQ(suma)}</div>
              ${lista.length ? lista.map(tarjeta) : html`<p class="small text-secondary mb-0">Sin cotizaciones.</p>`}
            </section>
          </div>`;
      })}
    </div>

    <div class="row g-4">
      <div class="col-lg-7">
        <h2 class="h5">Cerradas</h2>
        ${cerradas.length
          ? html`<ul class="list-group">
              ${cerradas.map((o) => html`
                <li class="list-group-item">
                  <a class="d-flex flex-wrap gap-2 text-decoration-none text-body" href="#/cotizacion/${o.id}">
                    <span class="fw-semibold me-auto text-break">${o.titulo}</span>
                    <span class="badge ${o.etapa === 'ganada' ? 'text-bg-success' : 'text-bg-secondary'}">${ETAPAS[o.etapa]}</span>
                  </a>
                  <div class="small text-secondary">${o.cliente.nombre} · ${formatoQ(o.total)} · cerrada el ${fechaGT(o.fecha_cierre)}</div>
                </li>`)}
            </ul>`
          : html`<p class="text-secondary">Todavía no hay cotizaciones cerradas.</p>`}
      </div>

      <div class="col-lg-5">
        <form class="card card-body shadow-sm" data-form="cotizacion" novalidate>
          <h2 class="h5">Nueva cotización</h2>
          ${errorGeneral(form.error)}
          ${seleccion({ nombre: 'cliente_id', etiqueta: 'Cliente', form, vacia: 'Elija un cliente de su cartera',
            opciones: clientes.map((c) => ({ valor: c.id, texto: c.nombre })) })}
          ${campo({ nombre: 'titulo', etiqueta: 'Título', form, atributos: 'maxlength="150"' })}
          <button class="btn btn-success" type="submit">Crear cotización</button>
        </form>
      </div>
    </div>`;
}

export const formularios = {
  async cotizacion(datos) {
    const form = estado.embudo.form;
    form.valores = datos;
    try {
      const nueva = await api.post('/oportunidades', {
        cliente_id: datos.cliente_id === '' ? null : Number(datos.cliente_id),
        titulo: datos.titulo,
      });
      estado.avisoPendiente = { tipo: 'success', texto: 'Cotización creada. Agregue los productos.' };
      location.hash = `#/cotizacion/${nueva.id}`;
    } catch (e) {
      aplicarError(form, e);
      render();
    }
  },
};
