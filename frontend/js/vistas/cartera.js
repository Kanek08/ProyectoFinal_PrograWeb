/**
 * F2 · Cartera: sus clientes con búsqueda en el servidor y «n de 10», alta de cliente con los
 * errores junto a cada campo, y clientes disponibles con el botón «Tomar».
 */
import { estado, render, avisar } from '../estado.js';
import { api } from '../api.js';
import { html } from '../utilidades.js';
import { MAXIMO_CARTERA } from '../etiquetas.js';
import { campo, errorGeneral, aplicarError } from '../formularios.js';

async function cargarCartera() {
  const [clientes, disponibles] = await Promise.all([api.get('/clientes'), api.get('/clientes/disponibles')]);
  Object.assign(estado.cartera, { clientes, total: clientes.length, disponibles, q: '' });
}

export async function cargar() {
  estado.cartera.form = { valores: {}, errores: {}, error: null };
  await cargarCartera();
}

function tarjetaCliente(c) {
  return html`
    <li class="list-group-item">
      <div class="fw-semibold">${c.nombre}</div>
      <div class="small text-secondary">
        NIT ${c.nit} · Tel. ${c.telefono}${c.correo ? html` · ${c.correo}` : ''}
      </div>
    </li>`;
}

export function vista() {
  const { clientes, total, q, disponibles, form } = estado.cartera;
  const llena = total >= MAXIMO_CARTERA;
  return html`
    <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
      <h1 class="h4 mb-0 me-auto">Mi cartera</h1>
      <span class="badge fs-6 ${llena ? 'text-bg-danger' : 'text-bg-success'}">${total} de ${MAXIMO_CARTERA} clientes</span>
    </div>

    <div class="row g-4">
      <div class="col-lg-7">
        <form class="input-group mb-3" data-form="buscar" role="search">
          <input class="form-control" name="q" type="search" value="${q}" placeholder="Buscar por nombre o NIT" aria-label="Buscar">
          <button class="btn btn-outline-success" type="submit">Buscar</button>
          ${q ? html`<button class="btn btn-outline-secondary" type="button" data-accion="limpiar">Ver todos</button>` : ''}
        </form>
        ${clientes.length
          ? html`<ul class="list-group mb-4">${clientes.map(tarjetaCliente)}</ul>`
          : html`<p class="text-secondary">${q ? 'Ningún cliente coincide con la búsqueda.' : 'Todavía no tiene clientes en su cartera.'}</p>`}

        <h2 class="h5">Clientes disponibles</h2>
        <p class="small text-secondary">Clientes sin asesor. Al tomarlos pasan a su cartera.</p>
        ${disponibles.length
          ? html`<ul class="list-group">
              ${disponibles.map((d) => html`
                <li class="list-group-item d-flex align-items-center gap-2">
                  <span class="me-auto">${d.nombre}</span>
                  <button class="btn btn-sm btn-success" type="button" data-accion="tomar" data-id="${d.id}">Tomar</button>
                </li>`)}
            </ul>`
          : html`<p class="text-secondary">No hay clientes disponibles.</p>`}
      </div>

      <div class="col-lg-5">
        <form class="card card-body shadow-sm" data-form="cliente" novalidate>
          <h2 class="h5">Nuevo cliente</h2>
          ${errorGeneral(form.error)}
          ${campo({ nombre: 'nombre', etiqueta: 'Nombre', form, atributos: 'maxlength="150"' })}
          ${campo({ nombre: 'nit', etiqueta: 'NIT', form, ayuda: 'Escriba CF para consumidor final.' })}
          ${campo({ nombre: 'telefono', etiqueta: 'Teléfono', form, tipo: 'tel', ayuda: '8 dígitos; puede incluir +502.' })}
          ${campo({ nombre: 'correo', etiqueta: 'Correo (opcional)', form, tipo: 'email' })}
          <button class="btn btn-success" type="submit">Agregar a mi cartera</button>
        </form>
      </div>
    </div>`;
}

export const acciones = {
  async limpiar() {
    await cargarCartera();
    render();
  },

  async tomar({ id }) {
    try {
      const cliente = await api.post(`/clientes/${id}/tomar`);
      estado.aviso = { tipo: 'success', texto: `${cliente.nombre} ya está en su cartera.` };
    } catch (e) {
      if (e.sesionTerminada) return;
      // 409: otro asesor lo tomó antes o su cartera está llena; 404: ya no existe.
      estado.aviso = { tipo: 'danger', texto: e.message };
    }
    await cargarCartera();
    render();
  },
};

export const formularios = {
  async buscar({ q }) {
    const texto = q.trim();
    estado.cartera.q = texto;
    estado.cartera.clientes = await api.get(`/clientes?q=${encodeURIComponent(texto)}`);
    render();
  },

  async cliente(datos) {
    const form = estado.cartera.form;
    form.valores = datos; // lo escrito se conserva si hay errores
    try {
      const cuerpo = { nombre: datos.nombre, nit: datos.nit, telefono: datos.telefono };
      if (datos.correo.trim() !== '') cuerpo.correo = datos.correo;
      const cliente = await api.post('/clientes', cuerpo);
      estado.cartera.form = { valores: {}, errores: {}, error: null };
      await cargarCartera();
      avisar('success', `${cliente.nombre} se agregó a su cartera.`);
    } catch (e) {
      aplicarError(form, e);
      render();
    }
  },
};
