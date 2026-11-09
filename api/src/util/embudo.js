/**
 * Etapas del embudo (R5) y transiciones permitidas (decisión D1).
 * Es la misma tabla que laravel/app/Support/Embudo.php: si cambia una, cambia la otra.
 */
export const ETAPAS = ['prospecto', 'calificado', 'propuesta', 'negociacion', 'ganada', 'perdida'];
export const ABIERTAS = ['prospecto', 'calificado', 'propuesta', 'negociacion'];
export const CERRADAS = ['ganada', 'perdida'];

export const PROBABILIDAD = {
  prospecto: 10,
  calificado: 25,
  propuesta: 50,
  negociacion: 75,
  ganada: 100,
  perdida: 0,
};

/**
 * D1: avanzar una etapa entre las abiertas, retroceder una entre las abiertas,
 * ganar solo desde negociación y perder desde cualquier abierta. Desde una cerrada, nada.
 */
export const TRANSICIONES = {
  prospecto: ['calificado', 'perdida'],
  calificado: ['propuesta', 'prospecto', 'perdida'],
  propuesta: ['negociacion', 'calificado', 'perdida'],
  negociacion: ['ganada', 'propuesta', 'perdida'],
  ganada: [],
  perdida: [],
};

export const esEtapa = (valor) => typeof valor === 'string' && ETAPAS.includes(valor);
export const estaCerrada = (etapa) => CERRADAS.includes(etapa);
