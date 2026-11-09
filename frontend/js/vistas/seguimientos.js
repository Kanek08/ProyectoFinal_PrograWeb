/**
 * F4 · Seguimientos: pendientes y completados, los vencidos resaltados, alta con fecha y hora
 * local (se envía en ISO 8601 con -06:00) y marcar como completado.
 */
import { estado, render, avisar } from '../estado.js';
import { api } from '../api.js';
import { html, fechaGT, aIsoConZona } from '../utilidades.js';
import { TIPOS_ACTIVIDAD } from '../etiquetas.js';
import { campo, seleccion, errorGeneral, aplicarError } from '../formularios.js';

const FILTROS = [['pendiente', 'Pendientes'], ['completada', 'Completados'], ['todas', 'Todos']];

async function cargarLista() {
  const { filtro } = estado.seguimientos;
  estado.seguimientos.lista = await api.get(filtro === 'todas' ? '/actividades' : `/actividades?estado=${filtro}`);
}

export async function cargar() {
  const s = estado.seguimientos;
  s.form = { valores: {}, errores: {}, error: null };
  const [, clientes] = await Promise.all([cargarLista(), api.get('/clientes')]);
  s.clientes = clientes;
}

function item(a) {
  return html`
    <li class="list-group-item ${a.vencida ? 'vencida' : ''}">
      <div class="d-flex flex-wrap align-items-center gap-2">
        <span class="badge text-bg-light border">${TIPOS_ACTIVIDAD[a.tipo]}</span>
        <span class="fw-semibold me-auto text-break">${a.cliente.nombre}</span>
        ${a.vencida ? html`<span class="badge text-bg-danger">Vencido</span>` : ''}
        ${a.completada ? html`<span class="badge text-bg-success">Completado</span>` : ''}
      </div>
      <div class="my-1 text-break">${a.descripcion}</div>
      <div class="d-flex flex-wrap align-items-center gap-2 small text-secondary">
        <span class="me-auto">${a.vence_en ? html`Vence: ${fechaGT(a.vence_en)}` : 'Sin fecha de vencimiento'}</span>
        <button class="btn btn-sm ${a.completada ? 'btn-outline-secondary' : 'btn-outline-success'}" type="button"
                data-accion="completar" data-id="${a.id}" data-valor="${a.completada ? 'no' : 'si'}">
          ${a.completada ? 'Marcar como pendiente' : 'Marcar como completado'}
        </button>
      </div>
    </li>`;
}

export function vista() {
  const { lista, filtro, clientes, form } = estado.seguimientos;
  return html`
    <h1 class="h4 mb-3">Seguimientos</h1>
    <div class="row g-4">
      <div class="col-lg-7">
        <div class="btn-group mb-3" role="group" aria-label="Filtrar seguimientos">
          ${FILTROS.map(([valor, texto]) => html`
            <button type="button" class="btn btn-sm ${valor === filtro ? 'btn-success' : 'btn-outline-success'}"
                    data-accion="filtrar" data-filtro="${valor}" ${valor === filtro ? html`aria-pressed="true"` : ''}>${texto}</button>`)}
        </div>
        ${lista.length
          ? html`<ul class="list-group">${lista.map(item)}</ul>`
          : html`<p class="text-secondary">No hay seguimientos en esta lista.</p>`}
      </div>

      <div class="col-lg-5">
        <form class="card card-body shadow-sm" data-form="seguimiento" novalidate>
          <h2 class="h5">Nuevo seguimiento</h2>
          ${errorGeneral(form.error)}
          ${seleccion({ nombre: 'cliente_id', etiqueta: 'Cliente', form, vacia: 'Elija un cliente de su cartera',
            opciones: clientes.map((c) => ({ valor: c.id, texto: c.nombre })) })}
          ${seleccion({ nombre: 'tipo', etiqueta: 'Tipo', form, vacia: 'Elija el tipo',
            opciones: Object.entries(TIPOS_ACTIVIDAD).map(([valor, texto]) => ({ valor, texto })) })}
          <div class="mb-3">
            <label class="form-label" for="f-descripcion">Descripción</label>
            <textarea class="form-control ${form.errores.descripcion ? 'is-invalid' : ''}" id="f-descripcion" name="descripcion"
                      rows="2" maxlength="500">${form.valores.descripcion ?? ''}</textarea>
            ${form.errores.descripcion ? html`<div class="invalid-feedback">${form.errores.descripcion}</div>` : ''}
          </div>
          ${campo({ nombre: 'vence_en', etiqueta: 'Vence (opcional)', form, tipo: 'datetime-local', ayuda: 'Fecha y hora de Guatemala.' })}
          <button class="btn btn-success" type="submit">Registrar seguimiento</button>
        </form>
      </div>
    </div>`;
}

export const acciones = {
  async filtrar({ filtro }) {
    estado.seguimientos.filtro = filtro;
    await cargarLista();
    render();
  },

  async completar({ id, valor }) {
    try {
      await api.patch(`/actividades/${id}`, { completada: valor === 'si' });
    } catch (e) {
      if (e.sesionTerminada) return;
      estado.aviso = { tipo: 'danger', texto: e.message };
    }
    await cargarLista();
    render();
  },
};

export const formularios = {
  async seguimiento(datos) {
    const form = estado.seguimientos.form;
    form.valores = datos;
    if (!datos.cliente_id) {
      // Sin cliente no hay ruta a la cual enviar; el resto lo valida el servidor.
      Object.assign(form, { errores: { cliente_id: 'Elija un cliente de su cartera.' }, error: null });
      render();
      return;
    }
    try {
      await api.post(`/clientes/${encodeURIComponent(datos.cliente_id)}/actividades`, {
        tipo: datos.tipo,
        descripcion: datos.descripcion,
        // datetime-local da "2026-12-01T10:00" sin zona: se envía como "2026-12-01T10:00:00-06:00".
        vence_en: aIsoConZona(datos.vence_en),
      });
      estado.seguimientos.form = { valores: {}, errores: {}, error: null };
      await cargarLista();
      avisar('success', 'Seguimiento registrado.');
    } catch (e) {
      aplicarError(form, e);
      render();
    }
  },
};
