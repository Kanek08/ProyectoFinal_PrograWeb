/**
 * Utilidades de la SPA: escapar HTML (S7), dinero, fechas de Guatemala y conversión de fechas.
 */

const ZONA = 'America/Guatemala';

/** S7: todo texto que viene de la API pasa por aquí antes de llegar a innerHTML. */
export function escapar(texto) {
  return String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Marca de HTML ya armado por la propia SPA (no por la API). */
class HtmlSeguro {
  constructor(texto) { this.texto = texto; }
  toString() { return this.texto; }
}

function aHtml(valor) {
  if (valor instanceof HtmlSeguro) return valor.texto;
  if (Array.isArray(valor)) return valor.map(aHtml).join('');
  if (valor === null || valor === undefined || valor === false) return '';
  return escapar(valor);
}

/**
 * Plantilla que ESCAPA cada valor interpolado: html`<td>${cliente.nombre}</td>`.
 * Solo los fragmentos creados con html`` (o arreglos de ellos) se insertan sin escapar.
 * Así es imposible olvidar escapar un dato de la API.
 */
export function html(partes, ...valores) {
  let salida = partes[0];
  valores.forEach((v, i) => { salida += aHtml(v) + partes[i + 1]; });
  return new HtmlSeguro(salida);
}

const moneda = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' });
/**
 * 9250 → "Q9,250.00". Algunos navegadores ponen un espacio duro entre Q y la cifra ("Q 9,250.00");
 * se quita para que se vea igual en todos (especificación F5).
 */
export const formatoQ = (n) => moneda.format(Number(n ?? 0)).replace(/^(-?Q)\s+/u, '$1');

const fechaHora = new Intl.DateTimeFormat('es-GT', { timeZone: ZONA, dateStyle: 'short', timeStyle: 'short' });
/** "2026-11-01T03:30:00.000Z" → "31/10/26, 21:30" en hora de Guatemala, sin importar la zona de la computadora. */
export const fechaGT = (iso) => (iso ? fechaHora.format(new Date(iso)) : '—');

/**
 * <input type="datetime-local"> da "2026-12-01T10:00" sin zona: la API lo rechazaría (422).
 * Guatemala es UTC−6 todo el año (sin horario de verano) → "2026-12-01T10:00:00-06:00".
 */
export function aIsoConZona(valorLocal) {
  if (!valorLocal) return null;
  const conSegundos = valorLocal.length === 16 ? `${valorLocal}:00` : valorLocal;
  return `${conSegundos}-06:00`;
}

/** Mes actual en Guatemala como "AAAA-MM". */
export function mesActualGT() {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  const valor = (tipo) => partes.find((p) => p.type === tipo).value;
  return `${valor('year')}-${valor('month')}`;
}

/** "2026-10" → "octubre de 2026" */
export function nombreMes(mes) {
  const [a, m] = mes.split('-').map(Number);
  return new Intl.DateTimeFormat('es-GT', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(a, m - 1, 15)));
}
