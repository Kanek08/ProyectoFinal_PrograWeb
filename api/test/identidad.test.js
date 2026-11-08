// Casos de la tabla L7.2 de docs/especificacion.md: los mismos que laravel/tests/Unit/IdentidadTest.php.
// Si las dos puertas validan distinto, el proyecto tiene un defecto (L7).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarNit, normalizarTelefono, telefonoValido, digitoVerificador } from '../src/validacion/identidad.js';

const nits = [
  ['452 1817-k', true, '4521817K'],
  ['4521817K', true, '4521817K'],
  ['cf', true, null],
  ['CF', true, null],
  ['0004521817-K', true, '4521817K'],
  ['12345678', false, '12345678'],
  ['K', false, 'K'],
  ['1', false, '1'],
  ['45A1817K', false, '45A1817K'],
  ['98765434', true, '98765434'],
  ['8889990-K', true, '8889990K'],
  ['', false, ''],
];

for (const [entrada, valido, guardado] of nits) {
  test(`NIT «${entrada}»`, () => {
    assert.deepEqual(normalizarNit(entrada), { valido, valor: guardado });
  });
}

const telefonos = [
  ['+502 5555-1234', true, '55551234'],
  ['(502) 7761.2345', true, '77612345'],
  ['502 5555 1234', true, '55551234'],
  ['50212345', true, '50212345'],
  ['1234567', false, '1234567'],
  ['15551234', false, '15551234'],
  ['05551234', false, '05551234'],
  ['555512345', false, '555512345'],
  ['5555-12AB', false, '555512AB'],
];

for (const [entrada, valido, normalizado] of telefonos) {
  test(`Teléfono «${entrada}»`, () => {
    const t = normalizarTelefono(entrada);
    assert.equal(t, normalizado);
    assert.equal(telefonoValido(t), valido);
  });
}

test('dígito verificador K', () => {
  assert.equal(digitoVerificador('4521817'), 'K');
});
