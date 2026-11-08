/**
 * NIT y teléfono de Guatemala (R4).
 * Es la MISMA lógica que laravel/app/Support/Identidad.php: las dos puertas deben dar el mismo
 * resultado (L7). Los casos de prueba compartidos están en test/identidad.test.js y en
 * laravel/tests/Unit/IdentidadTest.php.
 */

/** Quita espacios y guiones, pasa a mayúsculas y quita los ceros a la izquierda. */
export function compactarNit(nit) {
  return String(nit ?? '').replace(/[\s-]+/g, '').toUpperCase().replace(/^0+/, '');
}

/** Recibe un NIT ya compactado (no CF). Longitud 2–12, formato y dígito verificador módulo 11. */
export function nitValido(nit) {
  if (!/^[0-9]{1,11}[0-9K]$/.test(nit)) return false;
  return nit.slice(-1) === digitoVerificador(nit.slice(0, -1));
}

export function digitoVerificador(cuerpo) {
  let suma = 0;
  let peso = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * peso;
    peso++;
  }
  const r = (11 - (suma % 11)) % 11;
  return r === 10 ? 'K' : String(r);
}

/**
 * Normaliza un NIT escrito por el usuario.
 * @returns {{ valido: boolean, valor: string|null }} valor es null para CF
 */
export function normalizarNit(nit) {
  const compacto = compactarNit(nit);
  if (compacto === 'CF') return { valido: true, valor: null };
  return { valido: nitValido(compacto), valor: compacto };
}

/** Quita espacios, guiones, puntos, paréntesis y el prefijo +502 o 502 (si después quedan 8 dígitos). */
export function normalizarTelefono(telefono) {
  return String(telefono ?? '')
    .replace(/[\s\-.()]+/g, '')
    .replace(/^\+?502(?=\d{8}$)/, '');
}

export function telefonoValido(normalizado) {
  return /^[2-9][0-9]{7}$/.test(normalizado);
}

/** NIT como lo devuelve la API: compacto, o "CF" si es consumidor final (NULL en la base). */
export const nitVisible = (nit) => nit ?? 'CF';
