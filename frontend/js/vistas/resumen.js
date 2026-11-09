/**
 * F5 · Resumen del mes: selector de mes; ventas, total vendido, pronóstico y cartera en quetzales.
 */
import { estado, render } from '../estado.js';
import { api } from '../api.js';
import { html, formatoQ, nombreMes } from '../utilidades.js';
import { errorGeneral } from '../formularios.js';

async function cargarMes(mes) {
  estado.resumen.error = null;
  try {
    estado.resumen.datos = await api.get(`/reportes/resumen?mes=${encodeURIComponent(mes)}`);
    estado.resumen.mes = estado.resumen.datos.mes;
  } catch (e) {
    if (e.status !== 400) throw e;
    estado.resumen.error = e.message;
  }
}

export const cargar = () => cargarMes(estado.resumen.mes);

const tarjeta = (titulo, valor, nota = '') => html`
  <div class="col">
    <div class="card h-100 shadow-sm">
      <div class="card-body">
        <div class="text-secondary small">${titulo}</div>
        <div class="cifra">${valor}</div>
        ${nota ? html`<div class="small text-secondary">${nota}</div>` : ''}
      </div>
    </div>
  </div>`;

export function vista() {
  const { mes, datos, error } = estado.resumen;
  return html`
    <div class="d-flex flex-wrap align-items-end gap-2 mb-3">
      <h1 class="h4 mb-0 me-auto">Resumen de ${nombreMes(mes)}</h1>
      <form class="d-flex gap-2" data-form="mes">
        <label class="visually-hidden" for="f-mes">Mes</label>
        <input class="form-control" id="f-mes" name="mes" type="month" value="${mes}" required>
        <button class="btn btn-outline-success" type="submit">Ver</button>
      </form>
    </div>
    ${errorGeneral(error)}
    ${datos ? html`
      <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3">
        ${tarjeta('Ventas del mes', datos.ventas, 'Cotizaciones cerradas como venta')}
        ${tarjeta('Total vendido', formatoQ(datos.total))}
        ${tarjeta('Pronóstico', formatoQ(datos.pronostico), 'De todas sus cotizaciones abiertas')}
        ${tarjeta('Cartera', `${datos.cartera.clientes} de ${datos.cartera.maximo}`, 'Clientes asignados')}
      </div>` : ''}`;
}

export const formularios = {
  async mes({ mes }) {
    await cargarMes(mes);
    render();
  },
};
