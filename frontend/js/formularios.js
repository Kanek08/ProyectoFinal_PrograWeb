/**
 * Piezas de formulario con los errores del servidor junto a cada campo (F2, L7).
 * Todo valor se escapa con html``.
 */
import { html } from './utilidades.js';

/** Campo de texto con su etiqueta y el mensaje del 422 debajo. */
export function campo({ nombre, etiqueta, form, tipo = 'text', ayuda = '', atributos = '' }) {
  const error = form.errores?.[nombre];
  const valor = form.valores?.[nombre] ?? '';
  return html`
    <div class="mb-3">
      <label class="form-label" for="f-${nombre}">${etiqueta}</label>
      <input class="form-control ${error ? 'is-invalid' : ''}" id="f-${nombre}" name="${nombre}" type="${tipo}"
             value="${valor}" ${html([atributos])}>
      ${error ? html`<div class="invalid-feedback">${error}</div>` : ''}
      ${ayuda ? html`<div class="form-text">${ayuda}</div>` : ''}
    </div>`;
}

/** Lista desplegable; opciones = [{ valor, texto }]. */
export function seleccion({ nombre, etiqueta, form, opciones, vacia = 'Elija una opción' }) {
  const error = form.errores?.[nombre];
  const actual = String(form.valores?.[nombre] ?? '');
  return html`
    <div class="mb-3">
      <label class="form-label" for="f-${nombre}">${etiqueta}</label>
      <select class="form-select ${error ? 'is-invalid' : ''}" id="f-${nombre}" name="${nombre}">
        <option value="">${vacia}</option>
        ${opciones.map((o) => html`<option value="${o.valor}" ${String(o.valor) === actual ? 'selected' : ''}>${o.texto}</option>`)}
      </select>
      ${error ? html`<div class="invalid-feedback">${error}</div>` : ''}
    </div>`;
}

/** Mensaje general de un formulario (409, 403…). */
export const errorGeneral = (texto) => (texto ? html`<div class="alert alert-danger py-2">${texto}</div>` : '');

/** Aplica un error de la API al formulario: 422 → por campo; lo demás → mensaje general. */
export function aplicarError(form, e) {
  if (e.sesionTerminada) return;
  form.errores = e.status === 422 ? e.errores : {};
  form.error = e.status === 422 ? null : e.message;
}
